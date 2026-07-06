import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export default function Table({
    columns = [],
    data = [],
    isLoading = false,
    emptyMessage = 'No matching records found.',
    currentPage = 1,
    totalPages = 1,
    onPageChange = null,
    totalRecords = 0,
    pageSize = 10,
    minWidth = '800px'
}) {
    // Generate loading skeleton rows
    const renderSkeletons = () => {
        return Array.from({ length: 5 }).map((_, idx) => (
            <tr key={idx} className="border-b border-slate-900 animate-pulse">
                {columns.map((_, colIdx) => (
                    <td key={colIdx} className="py-4 px-4">
                        <div className="h-3.5 bg-slate-800 rounded-md w-3/4"></div>
                    </td>
                ))}
            </tr>
        ));
    };

    return (
        <div className="space-y-4">
            {/* Table Container */}
            <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 shadow-xl backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-semibold" style={{ minWidth }}>
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                                {columns.map((col) => (
                                    <th 
                                        key={col.key} 
                                        className={`py-3.5 px-4 font-bold uppercase tracking-wider ${col.className || ''}`}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-300">
                            {isLoading ? (
                                renderSkeletons()
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Inbox className="w-8 h-8 text-slate-650" />
                                            <span className="text-slate-400 font-bold">{emptyMessage}</span>
                                            <span className="text-[10px] text-slate-500 font-medium max-w-xs leading-normal">Try adjusting your filters or search terms.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, rowIdx) => (
                                    <tr key={rowIdx} className="hover:bg-slate-950/20 transition-colors">
                                        {columns.map((col) => (
                                            <td key={col.key} className={`py-4 px-4 ${col.className || ''}`}>
                                                {col.render 
                                                    ? (col.accessor 
                                                        ? col.render(row[col.accessor], row, rowIdx) 
                                                        : col.render(row, rowIdx)) 
                                                    : row[col.key || col.accessor]}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/30 border border-slate-850/60 rounded-xl px-4 py-3 text-xs text-slate-500">
                    <div>
                        Showing <span className="font-semibold text-slate-300">{Math.min((currentPage - 1) * pageSize + 1, totalRecords)}</span> to{' '}
                        <span className="font-semibold text-slate-300">{Math.min(currentPage * pageSize, totalRecords)}</span> of{' '}
                        <span className="font-semibold text-slate-300">{totalRecords}</span> entries
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange && onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg bg-slate-950/50 hover:bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronLeft className="w-4.5 h-4.5" />
                        </button>
                        
                        {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange && onPageChange(pageNum)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        currentPage === pageNum
                                            ? 'bg-indigo-600/90 border-indigo-500 text-white shadow-md'
                                            : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => onPageChange && onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg bg-slate-950/50 hover:bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronRight className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
