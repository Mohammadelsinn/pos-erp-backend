import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function StockStatusBadge({ 
    quantity = 0, 
    minStockLevel = 5, 
    showIcon = true,
    size = 'md', // 'sm', 'md', 'lg'
    variant = 'badge', // 'badge' (compact), 'card' (larger with stats)
    inventories = []
}) {
    const isOutOfStock = quantity <= 0;
    const isLowStock = quantity > 0 && (
        inventories && inventories.length > 0
            ? inventories.some(inv => inv.quantity <= inv.min_stock_level)
            : quantity <= minStockLevel
    );

    // Determine colors and styling
    let badgeClass = '';
    let iconColor = '';
    let textClass = '';
    let statusText = '';
    let IconComponent = CheckCircle2;

    if (isOutOfStock) {
        badgeClass = 'bg-rose-500/10 border border-rose-500/25 text-rose-450 shadow-[inset_0_1px_1px_rgba(244,63,94,0.05)]';
        iconColor = 'text-rose-400';
        textClass = 'text-rose-350';
        statusText = 'Out of Stock';
        IconComponent = XCircle;
    } else if (isLowStock) {
        badgeClass = 'bg-amber-500/10 border border-amber-500/25 text-amber-400 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.06)]';
        iconColor = 'text-amber-400';
        textClass = 'text-amber-350';
        statusText = `${quantity} units (Low Stock)`;
        IconComponent = AlertTriangle;
    } else {
        badgeClass = 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-450';
        iconColor = 'text-emerald-450';
        textClass = 'text-emerald-400';
        statusText = `${quantity} units`;
        IconComponent = CheckCircle2;
    }

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px] gap-1 rounded-md border',
        md: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg border',
        lg: 'px-3 py-1.5 text-sm gap-2 rounded-xl border'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-3.5 h-3.5',
        lg: 'w-4 h-4'
    };

    const branchBreakdown = inventories && inventories.length > 0
        ? inventories.map(inv => `${inv.branch?.name || 'Branch'}: ${inv.quantity}`).join(' | ')
        : '';

    if (variant === 'card') {
        return (
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                isOutOfStock ? 'bg-rose-500/5 border-rose-500/10' :
                isLowStock ? 'bg-amber-500/5 border-amber-500/10 animate-pulse' :
                'bg-emerald-500/5 border-emerald-500/10'
            }`}>
                <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Available Stock</span>
                    <span className="text-xl font-black text-white tracking-tight">{quantity} units</span>
                    {branchBreakdown && (
                        <p className="text-[10px] text-slate-500 font-semibold">{branchBreakdown}</p>
                    )}
                </div>
                <div className={`p-3 rounded-xl border ${
                    isOutOfStock ? 'bg-rose-500/10 text-rose-450 border-rose-500/20' :
                    isLowStock ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                }`}>
                    <IconComponent className="w-5 h-5" />
                </div>
            </div>
        );
    }

    return (
        <span 
            className={`inline-flex items-center font-semibold tracking-wide transition-all ${sizeClasses[size]} ${badgeClass}`}
            title={branchBreakdown || statusText}
        >
            {showIcon && <IconComponent className={`${iconSizes[size]} ${iconColor} shrink-0`} />}
            <span className={textClass}>{statusText}</span>
        </span>
    );
}
