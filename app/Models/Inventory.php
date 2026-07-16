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

    /**
     * Create any missing inventory rows for this product across every active branch.
     */
    public static function ensureForProduct(Product $product): void
    {
        $branches = Branch::where('is_active', true)->get();

        foreach ($branches as $branch) {
            static::createMissingForProductBranch($product, $branch);
        }
    }

    /**
     * Create any missing inventory rows for this branch across every active product.
     */
    public static function ensureForBranch(Branch $branch): void
    {
        $products = Product::with('variations')->where('status', 'active')->get();

        foreach ($products as $product) {
            static::createMissingForProductBranch($product, $branch);
        }
    }

    protected static function createMissingForProductBranch(Product $product, Branch $branch): void
    {
        if ($product->has_variations) {
            foreach ($product->variations as $variation) {
                static::firstOrCreate(
                    [
                        'branch_id' => $branch->id,
                        'product_id' => $product->id,
                        'product_variation_id' => $variation->id,
                    ],
                    ['quantity' => 0, 'min_stock_level' => 5]
                );
            }
        } else {
            static::firstOrCreate(
                [
                    'branch_id' => $branch->id,
                    'product_id' => $product->id,
                    'product_variation_id' => null,
                ],
                ['quantity' => 0, 'min_stock_level' => 5]
            );
        }
    }
}
