<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefundItem extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'refund_id',
        'order_item_id',
        'quantity',
        'amount',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'amount' => 'decimal:2',
    ];

    public function refund()
    {
        return $this->belongsTo(Refund::class);
    }

    public function orderItem()
    {
        return $this->belongsTo(SaleItem::class, 'order_item_id');
    }
}
