<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class ConfigController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'app_name' => config('app.name'),
            'version'  => '1.0.0',
            'currencies' => [
                ['code' => 'USD', 'name' => 'US Dollar',      'symbol' => '$'],
                ['code' => 'EUR', 'name' => 'Euro',           'symbol' => '€'],
                ['code' => 'GBP', 'name' => 'British Pound',  'symbol' => '£'],
                ['code' => 'LBP', 'name' => 'Lebanese Pound', 'symbol' => 'ل.ل'],
                ['code' => 'SAR', 'name' => 'Saudi Riyal',    'symbol' => '﷼'],
                ['code' => 'AED', 'name' => 'UAE Dirham',     'symbol' => 'د.إ'],
                ['code' => 'TRY', 'name' => 'Turkish Lira',   'symbol' => '₺'],
                ['code' => 'EGP', 'name' => 'Egyptian Pound', 'symbol' => 'E£'],
            ],
            'timezones' => \DateTimeZone::listIdentifiers(),
            'date_formats' => [
                ['format' => 'Y-m-d',   'example' => '2026-06-25'],
                ['format' => 'd/m/Y',   'example' => '25/06/2026'],
                ['format' => 'm/d/Y',   'example' => '06/25/2026'],
                ['format' => 'd-m-Y',   'example' => '25-06-2026'],
                ['format' => 'M d, Y',  'example' => 'Jun 25, 2026'],
                ['format' => 'd M Y',   'example' => '25 Jun 2026'],
            ],
        ]);
    }
}
