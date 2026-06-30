<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Permission::with('roles')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:100', 'unique:permissions,name'],
            'display_name' => ['required', 'string', 'max:255'],
            'description'  => ['nullable', 'string', 'max:500'],
        ]);

        $permission = Permission::create($data);

        return response()->json($permission, 201);
    }

    public function show(Permission $permission): JsonResponse
    {
        return response()->json($permission);
    }

    public function update(Request $request, Permission $permission): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['sometimes', 'string', 'max:100', 'unique:permissions,name,' . $permission->id],
            'display_name' => ['sometimes', 'string', 'max:255'],
            'description'  => ['nullable', 'string', 'max:500'],
        ]);

        $permission->update($data);

        return response()->json($permission);
    }

    public function destroy(Permission $permission): JsonResponse
    {
        $permission->delete();

        return response()->json(['message' => 'Permission deleted.']);
    }
}
