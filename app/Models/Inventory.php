<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'branch_id',
        'product_id',
        'product_variation_id',
        'quantity',
        'min_stock_level',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'min_stock_level' => 'integer',
    ];

    protected $appends = ['stock_status'];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variation()
    {
        return $this->belongsTo(ProductVariation::class, 'product_variation_id');
    }

    public function adjustments()
    {
        return $this->hasMany(InventoryAdjustment::class);
    }

    public function getStockStatusAttribute()
    {
        if ($this->quantity <= 0) {
            return 'out_of_stock';
        }
        if ($this->quantity <= $this->min_stock_level) {
            return 'low_stock';
        }
        return 'in_stock';
    }

    public function isLowStock(): bool
    {
        return $this->quantity <= $this->min_stock_level;
    }
}
