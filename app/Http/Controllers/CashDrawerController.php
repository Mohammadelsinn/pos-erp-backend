<?php

namespace App\Http\Controllers;

use App\Models\CashDrawerSession;
use App\Models\CashTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CashDrawerController extends Controller
{
    public function open(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'opening_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:255',
        ]);

        $existing = CashDrawerSession::where('branch_id', $validated['branch_id'])
            ->where('status', 'open')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'A cash drawer session is already open for this branch.'], 422);
        }

        $session = CashDrawerSession::create([
            'branch_id' => $validated['branch_id'],
            'user_id' => Auth::id(),
            'status' => 'open',
            'opening_amount' => $validated['opening_amount'],
            'notes' => $validated['notes'] ?? null,
            'opened_at' => now(),
        ]);

        return response()->json($session, 201);
    }

    public function current(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
        ]);

        $session = CashDrawerSession::where('branch_id', $validated['branch_id'])
            ->where('status', 'open')
            ->with('transactions')
            ->first();

        if (!$session) {
            return response()->json(['message' => 'No open cash drawer session for this branch.'], 404);
        }

        return response()->json(array_merge($session->toArray(), [
            'current_balance' => $this->currentBalance($session),
        ]));
    }

    public function cashIn(Request $request): JsonResponse
    {
        return $this->recordTransaction($request, 'cash_in');
    }

    public function cashOut(Request $request): JsonResponse
    {
        return $this->recordTransaction($request, 'cash_out');
    }

    public function close(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cash_drawer_session_id' => 'required|integer|exists:cash_drawer_sessions,id',
            'closing_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:255',
        ]);

        $session = CashDrawerSession::findOrFail($validated['cash_drawer_session_id']);

        if ($session->status !== 'open') {
            return response()->json(['message' => 'This cash drawer session is already closed.'], 422);
        }

        $expected = $this->currentBalance($session);
        $difference = round($validated['closing_amount'] - $expected, 2);

        $session->closing_amount = $validated['closing_amount'];
        $session->expected_amount = $expected;
        $session->difference = $difference;
        $session->status = 'closed';
        $session->closed_at = now();

        if (!empty($validated['notes'])) {
            $session->notes = trim(($session->notes ? $session->notes . ' | ' : '') . $validated['notes']);
        }

        $session->save();

        return response()->json($session->load('transactions'));
    }

    public function sessions(Request $request): JsonResponse
    {
        $query = CashDrawerSession::query()->with(['branch', 'user']);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('opened_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('opened_at', '<=', $request->date_to);
        }

        $perPage = min((int) $request->get('per_page', 15), 100);

        $sessions = $query->orderByDesc('opened_at')->paginate($perPage);

        return response()->json($sessions);
    }

    /**
     * Financial breakdown of a session: opening amount, transaction totals by type,
     * expected vs. actual closing amount, and shortage/surplus.
     */
    public function report($id): JsonResponse
    {
        $session = CashDrawerSession::findOrFail($id);

        return response()->json($this->buildReport($session));
    }

    /**
     * Same financial breakdown as report(), plus who/where/when and the itemized
     * transaction list — a printable end-of-shift summary for the cashier.
     */
    public function cashierReport($id): JsonResponse
    {
        $session = CashDrawerSession::with(['branch', 'user', 'transactions.user'])->findOrFail($id);

        return response()->json(array_merge($this->buildReport($session), [
            'cashier' => [
                'id' => $session->user->id,
                'name' => $session->user->name,
            ],
            'branch' => [
                'id' => $session->branch->id,
                'name' => $session->branch->name,
            ],
            'opened_at' => $session->opened_at,
            'closed_at' => $session->closed_at,
            'transactions' => $session->transactions->map(fn ($t) => [
                'id' => $t->id,
                'type' => $t->type,
                'amount' => round((float) $t->amount, 2),
                'notes' => $t->notes,
                'user' => $t->user->name ?? null,
                'created_at' => $t->created_at,
            ])->values(),
        ]));
    }

    private function recordTransaction(Request $request, string $type): JsonResponse
    {
        $validated = $request->validate([
            'cash_drawer_session_id' => 'required|integer|exists:cash_drawer_sessions,id',
            'amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:255',
        ]);

        $session = CashDrawerSession::findOrFail($validated['cash_drawer_session_id']);

        if ($session->status !== 'open') {
            return response()->json(['message' => 'Cannot record a transaction on a closed cash drawer session.'], 422);
        }

        $transaction = CashTransaction::create([
            'cash_drawer_session_id' => $session->id,
            'type' => $type,
            'amount' => $validated['amount'],
            'notes' => $validated['notes'] ?? null,
            'user_id' => Auth::id(),
        ]);

        return response()->json($transaction, 201);
    }

    private function buildReport(CashDrawerSession $session): array
    {
        $totals = $this->transactionTotals($session);

        $expected = $session->status === 'closed' && $session->expected_amount !== null
            ? (float) $session->expected_amount
            : $this->currentBalance($session);

        $closingAmount = $session->closing_amount !== null ? round((float) $session->closing_amount, 2) : null;
        $difference = $session->difference !== null
            ? round((float) $session->difference, 2)
            : ($closingAmount !== null ? round($closingAmount - $expected, 2) : null);

        return [
            'session_id' => $session->id,
            'status' => $session->status,
            'opening_amount' => round((float) $session->opening_amount, 2),
            'total_cash_in' => $totals['cash_in'],
            'total_cash_out' => $totals['cash_out'],
            'total_sales' => $totals['sale'],
            'total_refunds' => $totals['refund'],
            'expected_amount' => round($expected, 2),
            'closing_amount' => $closingAmount,
            'difference' => $difference,
            'variance' => $this->varianceLabel($difference),
        ];
    }

    /**
     * Shortage/surplus label for a computed difference (closing_amount - expected_amount).
     */
    private function varianceLabel(?float $difference): ?string
    {
        if ($difference === null) {
            return null;
        }

        if ($difference > 0) {
            return 'surplus';
        }

        if ($difference < 0) {
            return 'shortage';
        }

        return 'balanced';
    }

    private function transactionTotals(CashDrawerSession $session): array
    {
        $sums = $session->transactions()
            ->selectRaw('type, SUM(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        return [
            'cash_in' => round((float) ($sums['cash_in'] ?? 0), 2),
            'cash_out' => round((float) ($sums['cash_out'] ?? 0), 2),
            'sale' => round((float) ($sums['sale'] ?? 0), 2),
            'refund' => round((float) ($sums['refund'] ?? 0), 2),
        ];
    }

    private function currentBalance(CashDrawerSession $session): float
    {
        $totals = $this->transactionTotals($session);

        return round(
            (float) $session->opening_amount + $totals['cash_in'] - $totals['cash_out'] + $totals['sale'] - $totals['refund'],
            2
        );
    }
}
