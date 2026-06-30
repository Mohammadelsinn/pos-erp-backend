<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use LogsActivity;

    protected $fillable = [
        'name',
        'description',
        'category_id',
        'brand_id',
        'cost_price',
        'selling_price',
        'tax_percentage',
        'is_active',
    ];

    protected $casts = [
        'cost_price'     => 'decimal:2',
        'selling_price'  => 'decimal:2',
        'tax_percentage' => 'decimal:2',
        'profit_margin'  => 'decimal:2',
        'is_active'      => 'boolean',
    ];

    protected static function boot(): void
    {
        parent::boot();

        // Auto-compute gross profit margin on every save
        static::saving(function (Product $product) {
            $selling = (float) $product->selling_price;
            $cost    = (float) $product->cost_price;

            $product->profit_margin = $selling > 0
                ? round((($selling - $cost) / $selling) * 100, 2)
                : 0;
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }
}
