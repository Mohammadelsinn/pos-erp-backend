import React from 'react';

export default function Button({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    disabled = false, 
    icon: Icon = null, 
    iconPosition = 'left',
    type = 'button',
    onClick,
    className = '',
    ...props 
}) {
    const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 outline-none active:scale-[0.98] select-none disabled:opacity-50 disabled:pointer-events-none disabled:scale-100';
    
    const variants = {
        primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/15 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950',
        secondary: 'bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white focus:ring-2 focus:ring-slate-700 focus:ring-offset-2 focus:ring-offset-slate-950',
        danger: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/10 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-950',
        success: 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-600/10 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950',
        ghost: 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
    };

    const sizes = {
        sm: 'px-3.5 py-1.5 text-xs gap-1.5',
        md: 'px-4 py-2.5 text-xs gap-2',
        lg: 'px-5.5 py-3 text-sm gap-2.5'
    };

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {loading && (
                <svg className="animate-spin -ml-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            
            {!loading && Icon && iconPosition === 'left' && (
                <Icon className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'} shrink-0`} />
            )}
            
            <span>{children}</span>
            
            {!loading && Icon && iconPosition === 'right' && (
                <Icon className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'} shrink-0`} />
            )}
        </button>
    );
}
