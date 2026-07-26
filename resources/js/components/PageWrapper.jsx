import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageWrapper({ title, subtitle, breadcrumbs = [], actions, children }) {
    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-5">
                <div className="space-y-1.5">
                    {/* Breadcrumbs */}
                    {breadcrumbs.length > 0 && (
                        <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                            <Link to="/dashboard" className="hover:text-slate-300 flex items-center gap-1 transition-colors">
                                <Home className="w-3.5 h-3.5" />
                            </Link>
                            {breadcrumbs.map((crumb, idx) => (
                                <React.Fragment key={idx}>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                                    {crumb.path ? (
                                        <Link to={crumb.path} className="hover:text-slate-300 transition-colors">
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className="text-slate-400 font-semibold">{crumb.label}</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </nav>
                    )}

                    <h2 className="text-2xl font-extrabold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-sm text-slate-500">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Header Actions */}
                {actions && (
                    <div className="flex items-center gap-3 shrink-0">
                        {actions}
                    </div>
                )}
            </div>

            {/* Main content body */}
            <div className="animate-fade-in-up duration-300">
                {children}
            </div>
        </div>
    );
}
