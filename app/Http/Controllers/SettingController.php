<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    private const KEYS = [
        'company_name',
        'company_email',
        'company_phone',
        'company_address',
        'company_logo',
        'currency',
        'timezone',
        'date_format',
        'product_attributes',
    ];

    public function index(): JsonResponse
    {
        $settings = Setting::whereIn('key', self::KEYS)->pluck('value', 'key');

        $result = [];
        foreach (self::KEYS as $key) {
            $result[$key] = $settings[$key] ?? null;
        }

        return response()->json($result);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name'    => ['sometimes', 'string', 'max:255'],
            'company_email'   => ['sometimes', 'nullable', 'email', 'max:255'],
            'company_phone'   => ['sometimes', 'nullable', 'string', 'max:30'],
            'company_address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'company_logo'    => ['sometimes', 'nullable', 'string', 'max:255'],
            'currency'        => ['sometimes', 'string', 'size:3'],
            'timezone'        => ['sometimes', 'string', 'max:100', 'timezone:all'],
            'date_format'     => ['sometimes', 'string', 'max:30'],
            'product_attributes' => ['sometimes', 'nullable', 'string'],
        ]);

        $old = Setting::whereIn('key', array_keys($data))->pluck('value', 'key')->toArray();

        foreach ($data as $key => $value) {
            Setting::withoutEvents(fn () => Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            ));
        }

        ActivityLog::log('settings_updated', null, $old, $data);

        $settings = Setting::whereIn('key', self::KEYS)->pluck('value', 'key');

        $result = [];
        foreach (self::KEYS as $key) {
            $result[$key] = $settings[$key] ?? null;
        }

        return response()->json($result);
    }
}
