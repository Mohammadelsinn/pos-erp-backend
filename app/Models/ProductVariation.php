<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariation extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'size',
        'color',
        'material',
        'sku',
        'barcode',
        'cost_price',
        'selling_price',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
    ];

    protected $appends = ['profit_margin'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function getProfitMarginAttribute()
    {
        if ($this->selling_price > 0) {
            return round((($this->selling_price - $this->cost_price) / $this->selling_price) * 100, 2);
        }
        return 0;
    }
}
