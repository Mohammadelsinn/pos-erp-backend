<?php

namespace App\Http\Controllers;

use App\Models\CashDrawerSession;
use App\Models\Inventory;
use App\Models\InventoryAdjustment;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Refund;
use App\Models\RefundItem;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RefundController extends Controller
{
    /**
     * Full refund: returns every remaining unit of every item on the order,
     * restocks inventory, and marks the order refunded.
     */
    public function refund(Request $request, $id): JsonResponse
    {
        $order = $this->findRefundableOrder($id);

        $validated = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            $refund = Refund::create([
                'order_id' => $order->id,
                'user_id' => Auth::id(),
                'type' => 'full',
                'reason' => $validated['reason'],
                'total_amount' => 0,
                'status' => 'completed',
            ]);

            $totalRefunded = 0;
            foreach ($order->items as $item) {
                $remaining = $this->remainingQuantity($item);

                if ($remaining > 0) {
                    $totalRefunded += $this->restockItem($order, $item, $remaining, $refund);
                }
            }

            $refund->total_amount = round($totalRefunded, 2);
            $refund->save();

            $order->status = 'refunded';
            $order->payment_status = 'refunded';
            $order->save();

            if ($order->payment_method === 'cash') {
                CashDrawerSession::logCashMovement(
                    $order->branch_id,
                    'refund',
                    $totalRefunded,
                    'Refund: ' . ($order->order_number ?? "Order #{$order->id}"),
                    Auth::id()
                );
            }

            DB::commit();

            return response()->json($refund->load('items'), 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to process refund: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Partial refund: returns only the specified quantities of specified items.
     */
    public function partialRefund(Request $request, $id): JsonResponse
    {
        $order = $this->findRefundableOrder($id);

        $validated = $request->validate([
            'reason' => 'required|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.order_item_id' => 'required|integer|exists:sale_items,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        [$lines, $errors] = $this->resolveReturnLines($order, $validated['items']);

        if (!empty($errors)) {
            return response()->json(['message' => 'Invalid refund quantities.', 'errors' => $errors], 422);
        }

        DB::beginTransaction();
        try {
            $refund = Refund::create([
                'order_id' => $order->id,
                'user_id' => Auth::id(),
                'type' => 'partial',
                'reason' => $validated['reason'],
                'total_amount' => 0,
                'status' => 'completed',
            ]);

            $totalRefunded = 0;
            foreach ($lines as $line) {
                $totalRefunded += $this->restockItem($order, $line['item'], $line['qty'], $refund);
            }

            $refund->total_amount = round($totalRefunded, 2);
            $refund->save();

            if ($order->payment_method === 'cash') {
                CashDrawerSession::logCashMovement(
                    $order->branch_id,
                    'refund',
                    $totalRefunded,
                    'Partial refund: ' . ($order->order_number ?? "Order #{$order->id}"),
                    Auth::id()
                );
            }

            DB::commit();

            return response()->json($refund->load('items'), 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to process partial refund: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Exchange: returns specified quantities of specified items (restocked and logged as a
     * refund, same as a partial refund) and adds new items to the order in their place
     * (stock decremented). The order's original totals are left untouched — same as a
     * partial refund — and the price difference is reported back as returned_value /
     * new_items_value / balance_due for the cashier to settle with the customer.
     */
    public function exchange(Request $request, $id): JsonResponse
    {
        $order = $this->findRefundableOrder($id);

        $validated = $request->validate([
            'reason' => 'nullable|string|max:255',
            'return_items' => 'required|array|min:1',
            'return_items.*.order_item_id' => 'required|integer|exists:sale_items,id',
            'return_items.*.quantity' => 'required|integer|min:1',
            'new_items' => 'required|array|min:1',
            'new_items.*.product_id' => 'required|integer|exists:products,id',
            'new_items.*.product_variation_id' => 'nullable|integer|exists:product_variations,id',
            'new_items.*.quantity' => 'required|integer|min:1',
        ]);

        [$returnLines, $errors] = $this->resolveReturnLines($order, $validated['return_items']);

        foreach ($validated['new_items'] as $newItem) {
            $available = Inventory::where('branch_id', $order->branch_id)
                ->where('product_id', $newItem['product_id'])
                ->where('product_variation_id', $newItem['product_variation_id'] ?? null)
                ->value('quantity') ?? 0;

            if ($newItem['quantity'] > $available) {
                $errors[] = "Only {$available} unit(s) available for product #{$newItem['product_id']}.";
            }
        }

        if (!empty($errors)) {
            return response()->json(['message' => 'Invalid exchange request.', 'errors' => $errors], 422);
        }

        DB::beginTransaction();
        try {
            $refund = Refund::create([
                'order_id' => $order->id,
                'user_id' => Auth::id(),
                'type' => 'exchange',
                'reason' => $validated['reason'] ?? null,
                'total_amount' => 0,
                'status' => 'completed',
            ]);

            $returnedValue = 0;
            foreach ($returnLines as $line) {
                $returnedValue += $this->restockItem($order, $line['item'], $line['qty'], $refund);
            }

            $newValue = 0;
            foreach ($validated['new_items'] as $newItem) {
                $newValue += $this->addExchangeItem($order, $newItem, $refund);
            }

            $refund->total_amount = round($returnedValue, 2);
            $refund->save();

            $balanceDue = round($newValue - $returnedValue, 2);

            if ($order->payment_method === 'cash' && $balanceDue !== 0.0) {
                CashDrawerSession::logCashMovement(
                    $order->branch_id,
                    $balanceDue > 0 ? 'sale' : 'refund',
                    abs($balanceDue),
                    'Exchange: ' . ($order->order_number ?? "Order #{$order->id}"),
                    Auth::id()
                );
            }

            DB::commit();

            return response()->json([
                'refund' => $refund->load('items'),
                'order' => $order->fresh()->load(['items.product', 'items.variation']),
                'returned_value' => round($returnedValue, 2),
                'new_items_value' => round($newValue, 2),
                'balance_due' => $balanceDue,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to process exchange: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Resolve {order_item_id, quantity} lines against the order's own items and each
     * item's remaining refundable quantity. Returns [validLines, errorMessages].
     */
    private function resolveReturnLines(Sale $order, array $requestedItems): array
    {
        $lines = [];
        $errors = [];

        foreach ($requestedItems as $line) {
            $item = $order->items->firstWhere('id', $line['order_item_id']);

            if (!$item) {
                $errors[] = "Item #{$line['order_item_id']} does not belong to this order.";
                continue;
            }

            $remaining = $this->remainingQuantity($item);

            if ($line['quantity'] > $remaining) {
                $errors[] = "Cannot refund {$line['quantity']} unit(s) for item #{$item->id}; only {$remaining} remaining.";
                continue;
            }

            $lines[] = ['item' => $item, 'qty' => $line['quantity']];
        }

        return [$lines, $errors];
    }

    /**
     * How many units of this sale item have not yet been returned by a previous refund/exchange.
     */
    private function remainingQuantity(SaleItem $item): int
    {
        $alreadyRefunded = RefundItem::where('order_item_id', $item->id)->sum('quantity');

        return $item->quantity - $alreadyRefunded;
    }

    /**
     * Restore stock for a returned quantity of a sale item, log the stock movement, and
     * record a refund_items row. Returns the refunded dollar amount (a proportional share
     * of the item's total_price, which already reflects its own discount).
     */
    private function restockItem(Sale $order, SaleItem $item, int $qty, Refund $refund): float
    {
        $inventory = Inventory::where('branch_id', $order->branch_id)
            ->where('product_id', $item->product_id)
            ->where('product_variation_id', $item->product_variation_id)
            ->first();

        if ($inventory) {
            $inventory->quantity += $qty;
            $inventory->save();

            InventoryAdjustment::create([
                'inventory_id' => $inventory->id,
                'product_id' => $inventory->product_id,
                'product_variation_id' => $inventory->product_variation_id,
                'branch_id' => $inventory->branch_id,
                'user_id' => Auth::id(),
                'type' => 'increment',
                'quantity' => $qty,
                'reason' => 'Refund: ' . ($order->order_number ?? "Order #{$order->id}"),
                'reference_type' => Refund::class,
                'reference_id' => $refund->id,
            ]);
        }

        $amount = $item->quantity > 0
            ? round(((float) $item->total_price / $item->quantity) * $qty, 2)
            : 0;

        RefundItem::create([
            'refund_id' => $refund->id,
            'order_item_id' => $item->id,
            'quantity' => $qty,
            'amount' => $amount,
        ]);

        return $amount;
    }

    /**
     * Add a new sale item to the order as part of an exchange, decrementing stock.
     * Returns the item's dollar value (unit price x quantity, before tax).
     */
    private function addExchangeItem(Sale $order, array $newItem, Refund $refund): float
    {
        $variationId = $newItem['product_variation_id'] ?? null;

        $inventory = Inventory::where('branch_id', $order->branch_id)
            ->where('product_id', $newItem['product_id'])
            ->where('product_variation_id', $variationId)
            ->first();

        if ($inventory) {
            $inventory->quantity -= $newItem['quantity'];
            $inventory->save();

            InventoryAdjustment::create([
                'inventory_id' => $inventory->id,
                'product_id' => $inventory->product_id,
                'product_variation_id' => $inventory->product_variation_id,
                'branch_id' => $inventory->branch_id,
                'user_id' => Auth::id(),
                'type' => 'decrement',
                'quantity' => $newItem['quantity'],
                'reason' => 'Exchange: ' . ($order->order_number ?? "Order #{$order->id}"),
                'reference_type' => Refund::class,
                'reference_id' => $refund->id,
            ]);
        }

        $unitPrice = $variationId
            ? (float) ProductVariation::findOrFail($variationId)->selling_price
            : (float) Product::findOrFail($newItem['product_id'])->selling_price;

        $taxRate = $variationId
            ? (float) (ProductVariation::find($variationId)->tax_percentage ?? 0)
            : (float) (Product::find($newItem['product_id'])->tax ?? 0);

        $totalPrice = round($unitPrice * $newItem['quantity'], 2);

        SaleItem::create([
            'sale_id' => $order->id,
            'product_id' => $newItem['product_id'],
            'product_variation_id' => $variationId,
            'quantity' => $newItem['quantity'],
            'unit_price' => $unitPrice,
            'discount_amount' => 0,
            'tax_amount' => round($totalPrice * $taxRate / 100, 2),
            'total_price' => $totalPrice,
        ]);

        return $totalPrice;
    }

    /**
     * Only completed orders may be refunded/exchanged.
     */
    private function findRefundableOrder($id): Sale
    {
        $order = Sale::with('items')->findOrFail($id);

        if ($order->status !== 'completed') {
            abort(422, "Only completed orders can be refunded. Current status: {$order->status}.");
        }

        return $order;
    }
}
