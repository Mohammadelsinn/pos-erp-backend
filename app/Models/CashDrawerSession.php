<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashDrawerSession extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'branch_id',
        'user_id',
        'status',
        'opening_amount',
        'closing_amount',
        'expected_amount',
        'difference',
        'notes',
        'opened_at',
        'closed_at',
    ];

    protected $casts = [
        'opening_amount' => 'decimal:2',
        'closing_amount' => 'decimal:2',
        'expected_amount' => 'decimal:2',
        'difference' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(CashTransaction::class);
    }

    /**
     * Log a cash sale/refund against the branch's currently open drawer session, if any.
     * Silently no-ops when the branch has no open session — cash sales/refunds must not
     * be blocked just because the drawer isn't being tracked at that site.
     */
    public static function logCashMovement(int $branchId, string $type, float $amount, ?string $notes, ?int $userId): void
    {
        if ($amount <= 0) {
            return;
        }

        $session = static::where('branch_id', $branchId)->where('status', 'open')->first();

        if (!$session) {
            return;
        }

        $session->transactions()->create([
            'type' => $type,
            'amount' => $amount,
            'notes' => $notes,
            'user_id' => $userId,
        ]);
    }
}
