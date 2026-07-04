<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'category_id',
        'brand_id',
        'image_path',
        'status',
        'has_variations',
        'cost_price',
        'selling_price',
        'tax',
        'sku',
        'barcode',
    ];

    protected $casts = [
        'has_variations' => 'boolean',
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'tax' => 'decimal:2',
    ];

    protected $appends = ['profit_margin', 'tax_amount', 'price_after_tax', 'image_url'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function variations()
    {
        return $this->hasMany(ProductVariation::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    public function inventories()
    {
        return $this->hasMany(Inventory::class);
    }

    public function getProfitMarginAttribute()
    {
        if ($this->selling_price > 0) {
            return round((($this->selling_price - $this->cost_price) / $this->selling_price) * 100, 2);
        }
        return 0;
    }

    public function getTaxAmountAttribute()
    {
        return round($this->selling_price * ($this->tax / 100), 2);
    }

    public function getPriceAfterTaxAttribute()
    {
        return round($this->selling_price + $this->tax_amount, 2);
    }

    public function getImageUrlAttribute()
    {
        if ($this->image_path) {
            return url('storage/' . $this->image_path);
        }
        return null;
    }
}
