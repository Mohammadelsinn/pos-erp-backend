import React from 'react';

// Single Skeleton Item
export function Skeleton({ 
    variant = 'text', // text, circle, rect, card
    className = '',
    ...props 
}) {
    const baseStyle = 'bg-slate-800 animate-pulse rounded-lg';
    
    const variants = {
        text: 'h-3 w-full',
        circle: 'h-10 w-10 rounded-full',
        rect: 'h-24 w-full',
        card: 'h-36 w-full border border-slate-850 p-5 flex flex-col justify-between'
    };

    if (variant === 'card') {
        return (
            <div className={`${variants.card} ${className}`} {...props}>
                <div className="flex justify-between items-start">
                    <div className="space-y-2.5 w-2/3">
                        <div className="h-2.5 bg-slate-800 rounded-md w-1/2"></div>
                        <div className="h-5 bg-slate-800 rounded-md w-full"></div>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-800"></div>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-md w-1/3 mt-4"></div>
            </div>
        );
    }

    return (
        <div className={`${baseStyle} ${variants[variant]} ${className}`} {...props} />
    );
}

// Grid of Cards Skeleton Loader
export function CardGridSkeleton({ count = 4, cols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4', className = '' }) {
    return (
        <div className={`grid ${cols} gap-4 ${className}`}>
            {Array.from({ length: count }).map((_, idx) => (
                <Skeleton key={idx} variant="card" />
            ))}
        </div>
    );
}
