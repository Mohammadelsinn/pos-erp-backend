<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\PurchaseOrder;
use App\Models\Refund;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountingController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        // Filters
        $branchId = $request->get('branch_id');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        // 1. Query builders with filters
        $salesQuery = Sale::where('status', 'completed');
        $refundsQuery = Refund::query();
        $purchasesQuery = PurchaseOrder::where('status', 'completed');

        if ($branchId && $branchId !== 'all') {
            $salesQuery->where('branch_id', $branchId);
            $refundsQuery->whereHas('sale', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
            $purchasesQuery->where('branch_id', $branchId);
        }

        if ($dateFrom) {
            $salesQuery->whereDate('created_at', '>=', $dateFrom);
            $refundsQuery->whereDate('created_at', '>=', $dateFrom);
            $purchasesQuery->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $salesQuery->whereDate('created_at', '<=', $dateTo);
            $refundsQuery->whereDate('created_at', '<=', $dateTo);
            $purchasesQuery->whereDate('created_at', '<=', $dateTo);
        }

        // 2. Fetch Aggregated Metrics
        $grossSales = (double) $salesQuery->sum('total_amount');
        $totalRefunds = (double) $refundsQuery->sum('total_amount');
        $netSales = $grossSales - $totalRefunds;
        $inventoryPurchases = (double) $purchasesQuery->sum('total_amount');

        // Calculate Cost of Goods Sold (COGS) for completed sales
        $salesIds = (clone $salesQuery)->pluck('id');
        $saleItems = SaleItem::whereIn('sale_id', $salesIds)->with(['product', 'variation'])->get();

        $cogs = 0.00;
        foreach ($saleItems as $item) {
            $cost = 0.00;
            if ($item->variation && $item->variation->cost_price !== null) {
                $cost = (double) $item->variation->cost_price;
            } elseif ($item->product && $item->product->cost_price !== null) {
                $cost = (double) $item->product->cost_price;
            }
            $cogs += $cost * $item->quantity;
        }

        $grossProfit = $netSales - $cogs;
        $netProfit = $grossProfit - $inventoryPurchases;

        // 3. Sales Trend over last 30 days
        $trendLimit = now()->subDays(30);
        $dailySales = Sale::where('status', 'completed')
            ->where('created_at', '>=', $trendLimit)
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as total')
            ->groupBy('date');

        $dailyPurchases = PurchaseOrder::where('status', 'completed')
            ->where('created_at', '>=', $trendLimit)
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as total')
            ->groupBy('date');

        if ($branchId && $branchId !== 'all') {
            $dailySales->where('branch_id', $branchId);
            $dailyPurchases->where('branch_id', $branchId);
        }

        $dailySales = $dailySales->pluck('total', 'date')->toArray();
        $dailyPurchases = $dailyPurchases->pluck('total', 'date')->toArray();

        // Fill in 30 days timeline
        $trend = [];
        for ($i = 30; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $salesVal = isset($dailySales[$date]) ? (double) $dailySales[$date] : 0.00;
            $purchasesVal = isset($dailyPurchases[$date]) ? (double) $dailyPurchases[$date] : 0.00;
            
            $trend[] = [
                'date' => $date,
                'sales' => round($salesVal, 2),
                'expenses' => round($purchasesVal, 2),
                'profit' => round($salesVal - $purchasesVal, 2)
            ];
        }

        // 4. Branch Distribution Breakdown
        $branchBreakdown = [];
        $branches = Branch::all();
        foreach ($branches as $branch) {
            $bSales = Sale::where('branch_id', $branch->id)->where('status', 'completed');
            $bRefunds = Refund::whereHas('sale', fn($q) => $q->where('branch_id', $branch->id));
            $bPurchases = PurchaseOrder::where('branch_id', $branch->id)->where('status', 'completed');

            if ($dateFrom) {
                $bSales->whereDate('created_at', '>=', $dateFrom);
                $bRefunds->whereDate('created_at', '>=', $dateFrom);
                $bPurchases->whereDate('created_at', '>=', $dateFrom);
            }
            if ($dateTo) {
                $bSales->whereDate('created_at', '<=', $dateTo);
                $bRefunds->whereDate('created_at', '<=', $dateTo);
                $bPurchases->whereDate('created_at', '<=', $dateTo);
            }

            $bGross = (double) $bSales->sum('total_amount');
            $bRefund = (double) $bRefunds->sum('total_amount');
            $bPurch = (double) $bPurchases->sum('total_amount');

            if ($bGross > 0 || $bRefund > 0 || $bPurch > 0) {
                $branchBreakdown[] = [
                    'branch_name' => $branch->name,
                    'revenue' => round($bGross - $bRefund, 2),
                    'purchases' => round($bPurch, 2),
                    'net' => round(($bGross - $bRefund) - $bPurch, 2)
                ];
            }
        }

        // 5. Unified General Ledger / Recent Transactions (feed of 15 entries)
        $feedSales = (clone $salesQuery)->with(['branch', 'user'])->orderByDesc('created_at')->limit(15)->get();
        $feedRefunds = (clone $refundsQuery)->with(['sale.branch', 'user'])->orderByDesc('created_at')->limit(15)->get();
        $feedPurchases = (clone $purchasesQuery)->with(['branch', 'user'])->orderByDesc('created_at')->limit(15)->get();

        $ledger = [];
        foreach ($feedSales as $s) {
            $ledger[] = [
                'date' => $s->created_at->toIso8601String(),
                'type' => 'POS Sale',
                'ref' => $s->order_number ?: '#' . $s->id,
                'branch' => $s->branch->name ?? 'Main Branch',
                'operator' => $s->user->name ?? 'Cashier',
                'amount' => (double) $s->total_amount,
                'flow' => 'inflow',
                'status' => 'completed'
            ];
        }
        foreach ($feedRefunds as $r) {
            $ledger[] = [
                'date' => $r->created_at->toIso8601String(),
                'type' => 'POS Refund',
                'ref' => $r->sale->order_number ? 'REF-' . $r->sale->order_number : '#' . $r->id,
                'branch' => $r->sale->branch->name ?? 'Main Branch',
                'operator' => $r->user->name ?? 'Operator',
                'amount' => -(double) $r->total_amount,
                'flow' => 'outflow',
                'status' => 'refunded'
            ];
        }
        foreach ($feedPurchases as $p) {
            $ledger[] = [
                'date' => $p->created_at->toIso8601String(),
                'type' => 'Supplier Purchase',
                'ref' => $p->purchase_order_number ?: 'PO-' . $p->id,
                'branch' => $p->branch->name ?? 'Warehouse',
                'operator' => $p->user->name ?? 'Manager',
                'amount' => -(double) $p->total_amount,
                'flow' => 'outflow',
                'status' => 'completed'
            ];
        }

        // Sort by date desc
        usort($ledger, function ($a, $b) {
            return strcmp($b['date'], $a['date']);
        });

        // Slice to top 15
        $ledger = array_slice($ledger, 0, 15);

        return response()->json([
            'metrics' => [
                'gross_sales' => round($grossSales, 2),
                'refunds' => round($totalRefunds, 2),
                'net_sales' => round($netSales, 2),
                'cogs' => round($cogs, 2),
                'gross_profit' => round($grossProfit, 2),
                'inventory_purchases' => round($inventoryPurchases, 2),
                'net_profit' => round($netProfit, 2)
            ],
            'trend' => $trend,
            'branch_breakdown' => $branchBreakdown,
            'ledger' => $ledger
        ]);
    }
}
