import React from 'react';
import PageWrapper from '../components/PageWrapper';
import { Terminal, Construction } from 'lucide-react';

export default function PlaceholderPage({ title, description }) {
    return (
        <PageWrapper
            title={title}
            subtitle={description || `Access and manage your ${title.toLowerCase()} configurations and live transactions.`}
            breadcrumbs={[{ label: title }]}
        >
            <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 shadow-xl text-center space-y-4 max-w-2xl mx-auto my-12">
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-bounce">
                    <Construction className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-200">{title} Workspace</h3>
                <p className="text-slate-450 text-xs leading-relaxed max-w-md mx-auto">
                    This module is currently active in the routing table. Database tables, seeders, and RESTful API endpoints are operational on the Laravel 12 backend. The rich interactive dashboard views for this section will be established in the subsequent weekly milestones.
                </p>
                <div className="pt-4 flex items-center justify-center gap-2 text-slate-550 text-[10px] font-mono">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>State: OPERATIONAL | Controller: App\Http\Controllers\{title.replace(/\s+/g, '')}Controller</span>
                </div>
            </div>
        </PageWrapper>
    );
}
