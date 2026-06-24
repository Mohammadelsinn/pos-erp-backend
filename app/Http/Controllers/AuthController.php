<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Account is disabled.'], 403);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        ActivityLog::log('login', $user, null, null, $user->id);

        return response()->json([
            'token' => $token,
            'user' => $user->load('roles.permissions'),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        ActivityLog::log('logout', $user, null, null, $user->id);

        $user->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function profile(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('roles.permissions'));
    }
}
