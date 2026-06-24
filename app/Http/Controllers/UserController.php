<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(User::with('roles')->get());
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($user->load('roles.permissions'));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'email'     => ['required', 'email', 'unique:users,email'],
            'password'  => ['required', 'string', 'min:8'],
            'is_active' => ['boolean'],
            'roles'     => ['nullable', 'array'],
            'roles.*'   => ['integer', 'exists:roles,id'],
        ]);

        $user = User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => $data['password'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        if (! empty($data['roles'])) {
            $user->roles()->sync($data['roles']);
        }

        return response()->json($user->load('roles'), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:255'],
            'email'     => ['sometimes', 'email', 'unique:users,email,' . $user->id],
            'password'  => ['sometimes', 'string', 'min:8'],
            'is_active' => ['sometimes', 'boolean'],
            'roles'     => ['nullable', 'array'],
            'roles.*'   => ['integer', 'exists:roles,id'],
        ]);

        $user->update(collect($data)->except('roles')->toArray());

        if (array_key_exists('roles', $data)) {
            $user->roles()->sync($data['roles'] ?? []);
        }

        return response()->json($user->load('roles'));
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    public function toggleStatus(User $user): JsonResponse
    {
        $user->update(['is_active' => ! $user->is_active]);

        $status = $user->is_active ? 'activated' : 'deactivated';

        return response()->json([
            'message' => "User {$status}.",
            'user'    => $user,
        ]);
    }

    public function assignRole(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'role_id' => ['required', 'integer', 'exists:roles,id'],
        ]);

        $user->roles()->syncWithoutDetaching([$data['role_id']]);

        return response()->json($user->load('roles'));
    }

    public function removeRole(User $user, Role $role): JsonResponse
    {
        $user->roles()->detach($role->id);

        return response()->json($user->load('roles'));
    }
}
