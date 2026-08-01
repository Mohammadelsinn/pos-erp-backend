<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    /**
     * Display a listing of the accounts.
     */
    public function index(): JsonResponse
    {
        $accounts = Account::orderBy('code')->get();
        return response()->json($accounts);
    }

    /**
     * Store a newly created account in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:accounts,code|max:50',
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:asset,liability,equity,revenue,expense',
            'detail_type' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:500',
            'balance' => 'nullable|numeric',
        ]);

        $validated['is_system'] = false;
        $validated['is_active'] = true;
        $validated['balance'] = $validated['balance'] ?? 0.00;

        $account = Account::create($validated);

        return response()->json($account, 201);
    }

    /**
     * Display the specified account.
     */
    public function show(Account $account): JsonResponse
    {
        return response()->json($account);
    }

    /**
     * Update the specified account in storage.
     */
    public function update(Request $request, Account $account): JsonResponse
    {
        $rules = [
            'name' => 'required|string|max:255',
            'detail_type' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ];

        // Custom/non-system accounts can also update code and type
        if (!$account->is_system) {
            $rules['code'] = 'required|string|max:50|unique:accounts,code,' . $account->id;
            $rules['type'] = 'required|string|in:asset,liability,equity,revenue,expense';
            $rules['balance'] = 'nullable|numeric';
        }

        $validated = $request->validate($rules);

        $account->update($validated);

        return response()->json($account);
    }

    /**
     * Remove the specified account from storage.
     */
    public function destroy(Account $account): JsonResponse
    {
        if ($account->is_system) {
            return response()->json(['message' => 'System accounts cannot be deleted.'], 422);
        }

        $account->delete();

        return response()->json(['message' => 'Account deleted successfully.']);
    }
}
