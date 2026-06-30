import React from 'react';

// Reusable Text/Number Input Component
export function Input({
    label,
    error,
    helperText,
    icon: Icon = null,
    className = '',
    id,
    ...props
}) {
    return (
        <div className={`space-y-1.5 w-full ${className}`}>
            {label && (
                <label htmlFor={id} className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                        <Icon className="w-4 h-4" />
                    </span>
                )}
                <input
                    id={id}
                    className={`block w-full py-2.5 pr-4 bg-slate-950/50 border rounded-xl text-slate-200 placeholder-slate-600 outline-none transition-all text-xs font-medium focus:ring-1 ${
                        Icon ? 'pl-10' : 'pl-4'
                    } ${
                        error 
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                            : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-[10px] font-semibold text-red-400 mt-1">{error}</p>
            )}
            {!error && helperText && (
                <p className="text-[10px] text-slate-550 mt-1">{helperText}</p>
            )}
        </div>
    );
}

// Reusable Select Field Component
export function Select({
    label,
    options = [],
    error,
    helperText,
    icon: Icon = null,
    className = '',
    id,
    ...props
}) {
    return (
        <div className={`space-y-1.5 w-full ${className}`}>
            {label && (
                <label htmlFor={id} className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                        <Icon className="w-4 h-4" />
                    </span>
                )}
                <select
                    id={id}
                    className={`block w-full py-2.5 pr-8 bg-slate-950/50 border rounded-xl text-slate-200 outline-none transition-all text-xs font-semibold focus:ring-1 appearance-none ${
                        Icon ? 'pl-10' : 'pl-4'
                    } ${
                        error 
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                            : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    {...props}
                >
                    {options.map((opt, idx) => (
                        <option key={idx} value={opt.value} className="bg-slate-900 text-slate-200">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 pointer-events-none">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {error && (
                <p className="text-[10px] font-semibold text-red-400 mt-1">{error}</p>
            )}
            {!error && helperText && (
                <p className="text-[10px] text-slate-550 mt-1">{helperText}</p>
            )}
        </div>
    );
}

// Reusable Textarea Component
export function Textarea({
    label,
    error,
    helperText,
    className = '',
    id,
    rows = 3,
    ...props
}) {
    return (
        <div className={`space-y-1.5 w-full ${className}`}>
            {label && (
                <label htmlFor={id} className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <textarea
                id={id}
                rows={rows}
                className={`block w-full px-4 py-2.5 bg-slate-950/50 border rounded-xl text-slate-200 placeholder-slate-600 outline-none transition-all text-xs font-medium focus:ring-1 ${
                    error 
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                        : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                {...props}
            />
            {error && (
                <p className="text-[10px] font-semibold text-red-400 mt-1">{error}</p>
            )}
            {!error && helperText && (
                <p className="text-[10px] text-slate-550 mt-1">{helperText}</p>
            )}
        </div>
    );
}

// Reusable Checkbox / Toggle Switch Component
export function Checkbox({
    label,
    description,
    className = '',
    id,
    checked,
    onChange,
    ...props
}) {
    return (
        <div className={`flex items-start gap-3 select-none ${className}`}>
            <div className="flex items-center h-5">
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950/50 text-indigo-650 focus:ring-indigo-550/30 focus:ring-2 focus:ring-offset-0 transition-colors"
                    {...props}
                />
            </div>
            {(label || description) && (
                <div className="text-xs leading-none">
                    {label && (
                        <label htmlFor={id} className="font-semibold text-slate-350 cursor-pointer">
                            {label}
                        </label>
                    )}
                    {description && (
                        <p className="text-[10px] text-slate-500 font-medium mt-1 leading-normal">{description}</p>
                    )}
                </div>
            )}
        </div>
    );
}
