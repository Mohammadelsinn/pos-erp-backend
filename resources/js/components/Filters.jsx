import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import Button from './Button';

export default function Filters({
    searchPlaceholder = "Search records...",
    searchValue = "",
    onSearchChange = null,
    onReset = null,
    children = null
}) {
    return (
        <div className="backdrop-blur-xl bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input Widget */}
            <div className="flex-1 relative max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-slate-950/40 border border-slate-800 pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
            </div>

            {/* Custom Filter Selection Fields & Reset Widget */}
            <div className="flex flex-wrap items-center gap-3">
                {children}
                
                {onReset && (
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        icon={RotateCcw}
                        onClick={onReset}
                        className="py-2.5 h-9 shrink-0 text-slate-450 hover:text-slate-200 border-slate-800/60"
                        title="Clear filters"
                    >
                        Reset
                    </Button>
                )}
            </div>
            
        </div>
    );
}
