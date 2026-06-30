import React from 'react';
import { X, ShieldAlert, BadgeCheck, ReceiptEuro, Scale, Barcode, Tag } from 'lucide-react';

export default function ProductQuickView({ product, onClose }) {
    if (!product) return null;

    const baseMargin = product.selling_price > 0 
        ? ((product.selling_price - product.cost_price) / product.selling_price * 100).toFixed(2)
        : '0.00';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-slate-100">{product.name}</h2>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                product.status === 'active' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                                {product.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {product.category?.name || 'No Category'} &bull; {product.brand?.name || 'No Brand'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Image Column */}
                        <div className="md:col-span-1 flex items-center justify-center border border-slate-800 bg-slate-950/40 rounded-xl p-4 min-h-[200px] overflow-hidden relative">
                            {product.image_url ? (
                                <img 
                                    src={product.image_url} 
                                    alt={product.name} 
                                    className="max-w-full max-h-[220px] object-contain rounded-lg"
                                />
                            ) : (
                                <div className="text-center text-slate-500">
                                    <Tag className="w-12 h-12 mx-auto mb-2 text-slate-700" />
                                    <span className="text-xs">No Product Image</span>
                                </div>
                            )}
                        </div>

                        {/* Details Column */}
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Description</h3>
                                <p className="text-sm text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                                    {product.description || 'No description provided.'}
                                </p>
                            </div>

                            {/* Base Pricing (Non-variation) */}
                            {!product.has_variations && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                    <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-3.5">
                                        <span className="text-[11px] text-slate-400 font-medium block">Cost Price</span>
                                        <span className="text-base font-semibold text-slate-200">${product.cost_price}</span>
                                    </div>
                                    <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-3.5">
                                        <span className="text-[11px] text-slate-400 font-medium block">Selling Price</span>
                                        <span className="text-base font-semibold text-slate-200">${product.selling_price}</span>
                                    </div>
                                    <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-3.5">
                                        <span className="text-[11px] text-slate-400 font-medium block">Tax Rate</span>
                                        <span className="text-base font-semibold text-slate-200">{product.tax}%</span>
                                    </div>
                                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3.5">
                                        <span className="text-[11px] text-indigo-400 font-semibold block">Profit Margin</span>
                                        <span className="text-base font-semibold text-indigo-300">{baseMargin}%</span>
                                    </div>
                                </div>
                            )}

                            {!product.has_variations && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div className="flex items-center gap-2.5 text-xs text-slate-400 bg-slate-950/20 border border-slate-850 p-2.5 rounded-lg">
                                        <Barcode className="w-4 h-4 text-slate-500" />
                                        <span><strong>SKU:</strong> {product.sku || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs text-slate-400 bg-slate-950/20 border border-slate-850 p-2.5 rounded-lg">
                                        <Barcode className="w-4 h-4 text-slate-500" />
                                        <span><strong>Barcode:</strong> {product.barcode || 'N/A'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Variations Section */}
                    {product.has_variations && (
                        <div className="space-y-3 pt-2">
                            <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Product Variations</h3>
                            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/15">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                                <th className="p-3">Attributes</th>
                                                <th className="p-3">SKU</th>
                                                <th className="p-3">Barcode</th>
                                                <th className="p-3">Cost</th>
                                                <th className="p-3">Selling</th>
                                                <th className="p-3">Margin</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60 text-xs text-slate-350">
                                            {product.variations?.map((v) => {
                                                const attrs = [v.size && `Size: ${v.size}`, v.color && `Color: ${v.color}`, v.material && `Material: ${v.material}`].filter(Boolean).join(', ');
                                                const varMargin = v.selling_price > 0 
                                                    ? ((v.selling_price - v.cost_price) / v.selling_price * 100).toFixed(2)
                                                    : '0.00';
                                                return (
                                                    <tr key={v.id} className="hover:bg-slate-800/20">
                                                        <td className="p-3 font-medium text-slate-200">{attrs || 'Default'}</td>
                                                        <td className="p-3 font-mono">{v.sku}</td>
                                                        <td className="p-3 font-mono text-slate-450">{v.barcode || 'N/A'}</td>
                                                        <td className="p-3">${v.cost_price}</td>
                                                        <td className="p-3 text-slate-200">${v.selling_price}</td>
                                                        <td className="p-3 text-indigo-300 font-semibold">{varMargin}%</td>
                                                    </tr>
                                                );
                                            })}
                                            {(!product.variations || product.variations.length === 0) && (
                                                <tr>
                                                    <td colSpan="6" className="p-4 text-center text-slate-500">No variations configured.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-5 border-t border-slate-800 gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-colors"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
}
