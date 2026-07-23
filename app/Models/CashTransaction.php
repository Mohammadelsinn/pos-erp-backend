<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashTransaction extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'cash_drawer_session_id',
        'type',
        'amount',
        'notes',
        'user_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function session()
    {
        return $this->belongsTo(CashDrawerSession::class, 'cash_drawer_session_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
