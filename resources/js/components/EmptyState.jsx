import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
    title = 'No records found',
    description = 'Try adjusting your filters, query terms, or add a new entry to get started.',
    icon: Icon = Inbox,
    action = null,
    className = ''
}) {
    return (
        <div className={`backdrop-blur-xl bg-slate-900/30 border border-slate-800/80 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-4 ${className}`}>
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-slate-950/60 border border-slate-850/80 text-slate-500">
                <Icon className="w-8 h-8 text-slate-600" />
            </div>
            
            <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-slate-300">{title}</h3>
                <p className="text-[11px] text-slate-500 leading-normal">{description}</p>
            </div>

            {action && (
                <div className="pt-1">
                    {action}
                </div>
            )}
        </div>
    );
}
