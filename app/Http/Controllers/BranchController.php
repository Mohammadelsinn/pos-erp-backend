<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Branch::all());
    }

    public function show(Branch $branch): JsonResponse
    {
        return response()->json($branch);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'address'   => ['nullable', 'string', 'max:500'],
            'phone'     => ['nullable', 'string', 'max:20'],
            'email'     => ['nullable', 'email', 'max:255'],
            'is_active' => ['boolean'],
        ]);

        $branch = Branch::create($data + ['is_active' => $data['is_active'] ?? true]);

        return response()->json($branch, 201);
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:255'],
            'address'   => ['sometimes', 'nullable', 'string', 'max:500'],
            'phone'     => ['sometimes', 'nullable', 'string', 'max:20'],
            'email'     => ['sometimes', 'nullable', 'email', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $branch->update($data);

        return response()->json($branch);
    }

    public function destroy(Branch $branch): JsonResponse
    {
        $branch->delete();

        return response()->json(['message' => 'Branch deleted.']);
    }

    public function toggleStatus(Branch $branch): JsonResponse
    {
        $branch->update(['is_active' => ! $branch->is_active]);

        $status = $branch->is_active ? 'activated' : 'deactivated';

        return response()->json([
            'message' => "Branch {$status}.",
            'branch'  => $branch,
        ]);
    }
}
