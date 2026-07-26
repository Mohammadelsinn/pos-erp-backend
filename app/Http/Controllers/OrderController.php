<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    /**
     * Draft/held sales are POS cart states, not finalized orders — the orders
     * module only deals with sales that have gone through checkout/complete.
     */
    private const FINALIZED_STATUSES = ['completed', 'cancelled', 'refunded'];

    /**
     * Totals by payment method for completed orders in a date range, plus a grand total.
     */
    public function paymentSummary(Request $request): JsonResponse
    {
        $query = Sale::query()->where('status', 'completed');

        if ($request->filled('branch_id') && $request->branch_id !== 'all') {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $rows = $query->selectRaw('payment_method, COUNT(*) as order_count, SUM(total_amount) as total_amount')
            ->groupBy('payment_method')
            ->get();

        $byMethod = $rows->map(fn ($row) => [
            'payment_method' => $row->payment_method,
            'order_count' => (int) $row->order_count,
            'total_amount' => round((float) $row->total_amount, 2),
        ])->values();

        return response()->json([
            'by_method' => $byMethod,
            'order_count' => $byMethod->sum('order_count'),
            'grand_total' => round($byMethod->sum('total_amount'), 2),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Sale::query()
            ->whereIn('status', self::FINALIZED_STATUSES)
            ->with(['branch', 'user']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('branch_id') && $request->branch_id !== 'all') {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('payment_method') && $request->payment_method !== 'all') {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = min((int) $request->get('per_page', 15), 100);

        $orders = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json($orders);
    }

    public function paymentsSummary(Request $request): JsonResponse
    {
        $query = Sale::query()
            ->whereIn('status', self::FINALIZED_STATUSES);

        if ($request->filled('branch_id') && $request->branch_id !== 'all') {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $sales = $query->get();

        $totalCollected = 0.00;
        $totalRefunded = 0.00;
        $totalPending = 0.00;
        $totalFailed = 0.00;

        $methodsMap = [];
        $statusCounts = [
            'paid' => 0,
            'pending' => 0,
            'refunded' => 0,
            'failed' => 0
        ];

        foreach ($sales as $sale) {
            $amount = (double) $sale->total_amount;
            $method = strtolower($sale->payment_method ?: 'cash');
            $payStatus = strtolower($sale->payment_status ?: 'paid');

            if ($payStatus === 'paid') {
                $totalCollected += $amount;
                $statusCounts['paid']++;
            } elseif ($payStatus === 'refunded') {
                $totalRefunded += $amount;
                $statusCounts['refunded']++;
            } elseif ($payStatus === 'pending') {
                $totalPending += $amount;
                $statusCounts['pending']++;
            } elseif ($payStatus === 'failed') {
                $totalFailed += $amount;
                $statusCounts['failed']++;
            }

            if (!isset($methodsMap[$method])) {
                $methodsMap[$method] = [
                    'method' => ucfirst($method),
                    'count' => 0,
                    'total' => 0.00
                ];
            }
            if ($payStatus === 'paid') {
                $methodsMap[$method]['total'] += $amount;
            }
            $methodsMap[$method]['count'] += 1;
        }

        return response()->json([
            'overview' => [
                'total_collected' => round($totalCollected, 2),
                'total_refunded' => round($totalRefunded, 2),
                'total_pending' => round($totalPending, 2),
                'total_failed' => round($totalFailed, 2),
                'transaction_count' => $sales->count()
            ],
            'status_counts' => $statusCounts,
            'methods_breakdown' => array_values($methodsMap)
        ]);
    }

    public function show($id): JsonResponse
    {
        $order = $this->findOrder($id);

        return response()->json($order->load(['branch', 'user', 'items.product', 'items.variation']));
    }

    public function items($id): JsonResponse
    {
        $order = $this->findOrder($id);

        return response()->json([
            'data' => $order->items()->with(['product', 'variation'])->get(),
        ]);
    }

    public function invoice($id): JsonResponse
    {
        $order = $this->findOrder($id);
        $order->load(['branch', 'user', 'items.product', 'items.variation']);

        return response()->json($this->buildInvoiceData($order));
    }

    public function receipt($id): JsonResponse
    {
        $order = $this->findOrder($id);
        $order->load(['branch', 'user', 'items.product', 'items.variation']);

        return response()->json([
            'order_number' => $order->order_number,
            'items' => $this->itemsForReceipt($order),
            'subtotal' => round($order->subtotal, 2),
            'discount_amount' => $this->combinedDiscount($order),
            'tax_amount' => round($order->tax_amount, 2),
            'grand_total' => round($order->total_amount, 2),
            'payment_method' => $order->payment_method,
            'customer' => ['customer_id' => $order->customer_id],
            'cashier_name' => $order->user->name,
            'branch_name' => $order->branch->name,
            'date' => $order->updated_at,
        ]);
    }

    public function invoicePdf($id)
    {
        $order = $this->findOrder($id);
        $order->load(['branch', 'user', 'items.product', 'items.variation']);

        $invoice = $this->buildInvoiceData($order);

        $pdf = Pdf::loadView('invoices.invoice', ['invoice' => $invoice]);

        return $pdf->download("invoice-{$order->order_number}.pdf");
    }

    public function payment($id): JsonResponse
    {
        $order = $this->findOrder($id);

        return response()->json($this->paymentData($order));
    }

    public function updatePaymentStatus(Request $request, $id): JsonResponse
    {
        $order = $this->findOrder($id);

        $validated = $request->validate([
            'payment_status' => 'required|in:pending,paid,refunded,failed',
        ]);

        $order->payment_status = $validated['payment_status'];
        $order->save();

        return response()->json($this->paymentData($order));
    }

    /**
     * Fetch a sale and 404 unless it's a finalized order (completed/cancelled) —
     * draft/held carts aren't visible through this controller.
     */
    private function findOrder($id): Sale
    {
        $order = Sale::findOrFail($id);

        if (!in_array($order->status, self::FINALIZED_STATUSES, true)) {
            abort(404, 'Order not found.');
        }

        return $order;
    }

    private function paymentData(Sale $order): array
    {
        return [
            'order_number' => $order->order_number,
            'status' => $order->status,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'total_amount' => round($order->total_amount, 2),
        ];
    }

    private function itemsForReceipt(Sale $order)
    {
        return $order->items->map(fn ($item) => [
            'product_name' => $item->product->name,
            'variation_name' => $item->variation->name ?? null,
            'quantity' => $item->quantity,
            'unit_price' => round($item->unit_price, 2),
            'discount_amount' => round($item->discount_amount, 2),
            'tax_amount' => round($item->tax_amount, 2),
            'total_price' => round($item->total_price, 2),
        ])->values();
    }

    /**
     * Item-level discounts plus the order-level one — same convention as PosController.
     */
    private function combinedDiscount(Sale $order): float
    {
        return round($order->items->sum('discount_amount') + $order->discount_amount, 2);
    }

    private function buildInvoiceData(Sale $order): array
    {
        $company = Setting::whereIn('key', ['company_name', 'company_email', 'company_phone', 'company_address'])
            ->pluck('value', 'key');

        return [
            'order_number' => $order->order_number,
            'date' => $order->updated_at,
            'source' => $order->source,
            'items' => $this->itemsForReceipt($order),
            'subtotal' => round($order->subtotal, 2),
            'discount_amount' => $this->combinedDiscount($order),
            'tax_amount' => round($order->tax_amount, 2),
            'grand_total' => round($order->total_amount, 2),
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'customer' => ['customer_id' => $order->customer_id],
            'cashier_name' => $order->user->name,
            'branch' => [
                'name' => $order->branch->name,
                'address' => $order->branch->address,
                'phone' => $order->branch->phone,
            ],
            'company' => [
                'name' => $company['company_name'] ?? null,
                'email' => $company['company_email'] ?? null,
                'phone' => $company['company_phone'] ?? null,
                'address' => $company['company_address'] ?? null,
            ],
        ];
    }
}
