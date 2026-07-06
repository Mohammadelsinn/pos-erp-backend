import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Package, Layers, Plus, Minus, RefreshCw, CheckCircle2, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import { Select, Input, Textarea } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import StockStatusBadge from '../components/StockStatusBadge';

export default function StockAdjustment() {
    // Dropdown list states
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(true);

    // Form selection states
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedVariation, setSelectedVariation] = useState('');
    const [variationsList, setVariationsList] = useState([]);
    const [hasVariations, setHasVariations] = useState(false);

    // Current stock status state
    const [currentInventory, setCurrentInventory] = useState(null);
    const [loadingStock, setLoadingStock] = useState(false);

    // Adjustment states
    const [adjustType, setAdjustType] = useState('increment'); // 'increment', 'decrement', 'set'
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState('Stock Audit');
    const [customReason, setCustomReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const reasonsList = [
        { value: 'Stock Audit', label: 'Stock Audit / Count Verification' },
        { value: 'Initial Stock Take', label: 'Initial Stock Take' },
        { value: 'Discrepancy Correction', label: 'Discrepancy Correction' },
        { value: 'Return to Vendor', label: 'Return to Vendor' },
        { value: 'Customer Return', label: 'Customer Return / Restock' },
        { value: 'Damaged Stock', label: 'Damaged Stock' },
        { value: 'Lost / Stolen Stock', label: 'Lost / Stolen Stock' },
        { value: 'Other', label: 'Other (Write custom reason below)' }
    ];

    // Fetch initial list of branches and products
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingDropdowns(true);
            try {
                const [branchesRes, productsRes] = await Promise.all([
                    axios.get('/api/branches'),
                    axios.get('/api/products?per_page=1000')
                ]);
                setBranches(branchesRes.data.data || branchesRes.data || []);
                setProducts(productsRes.data.data || productsRes.data || []);
            } catch (error) {
                console.error('Error fetching initial dropdown data:', error);
                setErrorMessage('Failed to load branches and products. Please refresh the page.');
            } finally {
                setLoadingDropdowns(false);
            }
        };

        fetchInitialData();
    }, []);

    // Handle product selection changes to update variations list
    useEffect(() => {
        if (!selectedProduct) {
            setVariationsList([]);
            setHasVariations(false);
            setSelectedVariation('');
            setCurrentInventory(null);
            return;
        }

        const product = products.find(p => p.id === parseInt(selectedProduct));
        if (product) {
            const vars = product.variations || [];
            setVariationsList(vars);
            setHasVariations(product.has_variations && vars.length > 0);
            setSelectedVariation('');
            setCurrentInventory(null);
        }
    }, [selectedProduct, products]);

    // Fetch current stock level when branch, product, or variation changes
    useEffect(() => {
        const fetchCurrentStock = async () => {
            if (!selectedBranch || !selectedProduct) {
                setCurrentInventory(null);
                return;
            }

            if (hasVariations && !selectedVariation) {
                setCurrentInventory(null);
                return;
            }

            setLoadingStock(true);
            try {
                const params = {
                    branch_id: selectedBranch,
                    product_id: selectedProduct
                };
                if (selectedVariation) {
                    params.product_variation_id = selectedVariation;
                }

                const response = await axios.get('/api/inventory', { params });
                const items = response.data.data || [];
                
                // Find matching record
                const match = items.find(item => {
                    const varMatch = selectedVariation 
                        ? item.product_variation_id === parseInt(selectedVariation)
                        : item.product_variation_id === null;
                    return item.branch_id === parseInt(selectedBranch) &&
                           item.product_id === parseInt(selectedProduct) &&
                           varMatch;
                });

                if (match) {
                    setCurrentInventory(match);
                } else {
                    // No inventory record initialized yet
                    setCurrentInventory({
                        quantity: 0,
                        min_stock_level: 5,
                        stock_status: 'out_of_stock'
                    });
                }
            } catch (error) {
                console.error('Error fetching current stock status:', error);
            } finally {
                setLoadingStock(false);
            }
        };

        fetchCurrentStock();
    }, [selectedBranch, selectedProduct, selectedVariation, hasVariations]);

    // Handle Form Submit
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');

        if (!selectedBranch) {
            setErrorMessage('Please select a branch.');
            return;
        }
        if (!selectedProduct) {
            setErrorMessage('Please select a product.');
            return;
        }
        if (hasVariations && !selectedVariation) {
            setErrorMessage('Please select a product variation.');
            return;
        }
        if (qty < 1) {
            setErrorMessage('Quantity must be 1 or greater.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                branch_id: selectedBranch,
                product_id: selectedProduct,
                type: adjustType,
                quantity: qty,
                reason: reason === 'Other' ? customReason : reason
            };
            if (selectedVariation) {
                payload.product_variation_id = selectedVariation;
            }

            const response = await axios.post('/api/inventory/adjust', payload);
            
            // Refresh inventory status card
            setCurrentInventory(response.data);
            setSuccessMessage('Stock adjusted successfully!');
            setQty(1);
            setCustomReason('');
        } catch (error) {
            console.error('Failed to submit adjustment:', error);
            setErrorMessage(error.response?.data?.message || 'Failed to adjust stock. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to get formatted variation label
    const getVariationLabel = (v) => {
        const parts = [];
        if (v.size) parts.push(`Size: ${v.size}`);
        if (v.color) parts.push(`Color: ${v.color}`);
        if (v.material) parts.push(`Material: ${v.material}`);
        return parts.join(' | ') || `Variation #${v.id}`;
    };

    const breadcrumbs = [
        { label: 'Inventory', path: '/inventory' },
        { label: 'Stock Adjustment' }
    ];

    return (
        <PageWrapper 
            title="Stock Adjustment" 
            subtitle="Manually increase, decrease, or set product stock levels for specific branches."
            breadcrumbs={breadcrumbs}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form Card */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800/60 pb-4">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-100">Adjustment Entry Form</h3>
                            <p className="text-xs text-slate-500">All adjustments are tracked in audit logs.</p>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-xl text-xs flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {loadingDropdowns ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full rounded-xl" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            
                            {/* Branch Selection */}
                            <Select 
                                label="Select Target Branch"
                                id="branch-select"
                                icon={Building2}
                                value={selectedBranch}
                                onChange={(e) => {
                                    setSelectedBranch(e.target.value);
                                    setSuccessMessage('');
                                    setErrorMessage('');
                                }}
                                options={[
                                    { value: '', label: 'Select Branch...' },
                                    ...branches.map(b => ({ value: b.id, label: b.name }))
                                ]}
                            />

                            {/* Product Selection */}
                            <Select 
                                label="Select Product"
                                id="product-select"
                                icon={Package}
                                value={selectedProduct}
                                onChange={(e) => {
                                    setSelectedProduct(e.target.value);
                                    setSuccessMessage('');
                                    setErrorMessage('');
                                }}
                                options={[
                                    { value: '', label: 'Select Product...' },
                                    ...products.map(p => ({ value: p.id, label: p.name + (p.sku ? ` (${p.sku})` : '') }))
                                ]}
                            />

                            {/* Variation Selection (Conditional) */}
                            {hasVariations && (
                                <Select 
                                    label="Select Product Variation"
                                    id="variation-select"
                                    icon={Layers}
                                    value={selectedVariation}
                                    onChange={(e) => {
                                        setSelectedVariation(e.target.value);
                                        setSuccessMessage('');
                                        setErrorMessage('');
                                    }}
                                    options={[
                                        { value: '', label: 'Select Variation...' },
                                        ...variationsList.map(v => ({ value: v.id, label: getVariationLabel(v) + ` (SKU: ${v.sku})` }))
                                    ]}
                                />
                            )}

                            {/* Adjustment Action type buttons */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Adjustment Action
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('increment')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                                            adjustType === 'increment'
                                                ? 'bg-emerald-600/10 border-emerald-500/80 text-emerald-400 shadow-lg shadow-emerald-500/5'
                                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950 hover:text-slate-355'
                                        }`}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Stock
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('decrement')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                                            adjustType === 'decrement'
                                                ? 'bg-rose-600/10 border-rose-500/80 text-rose-450 shadow-lg shadow-rose-500/5'
                                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950 hover:text-slate-355'
                                        }`}
                                    >
                                        <Minus className="w-4 h-4" />
                                        Reduce Stock
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('set')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                                            adjustType === 'set'
                                                ? 'bg-indigo-650/15 border-indigo-500/80 text-indigo-400 shadow-lg shadow-indigo-650/5'
                                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950 hover:text-slate-355'
                                        }`}
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                        Set Exact Stock
                                    </button>
                                </div>
                            </div>

                            {/* Quantity Input */}
                            <Input 
                                label={adjustType === 'set' ? 'New Exact Quantity' : 'Quantity To Apply'}
                                id="qty-input"
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 0))}
                            />

                            {/* Reason for adjustment */}
                            <Select 
                                label="Reason Category"
                                id="reason-select"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                options={reasonsList}
                            />

                            {reason === 'Other' && (
                                <Textarea 
                                    label="Custom Reason details"
                                    id="custom-reason"
                                    placeholder="Provide detailed description of this adjustment..."
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    rows={3}
                                />
                            )}

                            {/* Form submit button */}
                            <div className="flex justify-end pt-2 border-t border-slate-850">
                                <Button
                                    type="submit"
                                    loading={isSubmitting}
                                    icon={FileText}
                                    variant="primary"
                                    disabled={!selectedBranch || !selectedProduct || (hasVariations && !selectedVariation)}
                                    className="w-full sm:w-auto"
                                >
                                    Execute Adjustment
                                </Button>
                            </div>

                        </form>
                    )}
                </div>

                {/* Info Card / Live Stock Status */}
                <div className="space-y-6">
                    
                    {/* Live Stock Level Indicator Card */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Live Inventory Check</h3>
                        
                        {loadingStock ? (
                            <div className="flex flex-col items-center justify-center py-6 space-y-3">
                                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                                <span className="text-xs text-slate-500">Checking stock levels...</span>
                            </div>
                        ) : currentInventory ? (
                            <div className="space-y-4">
                                <StockStatusBadge 
                                    quantity={currentInventory.quantity} 
                                    minStockLevel={currentInventory.min_stock_level} 
                                    variant="card"
                                />

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium py-1.5 border-b border-slate-850">
                                        <span className="text-slate-500">Min. Alert Level</span>
                                        <span className="text-slate-350">{currentInventory.min_stock_level} units</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium py-1.5">
                                        <span className="text-slate-500">Inventory Record ID</span>
                                        <span className="text-slate-350">{currentInventory.id ? `#${currentInventory.id}` : 'Not initialized'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-950/20 border border-dashed border-slate-800 rounded-xl p-4">
                                <Package className="w-8 h-8 text-slate-650 mb-2.5" />
                                <h4 className="text-xs font-bold text-slate-400">No Product Selected</h4>
                                <p className="text-[10px] text-slate-500 mt-1 max-w-xs">Select a branch and product (and variation if applicable) to view real-time stock levels.</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Guide Card */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Adjustment Guide
                        </h3>
                        <ul className="space-y-2.5 text-xs text-slate-400">
                            <li className="flex gap-2">
                                <span className="text-indigo-400 font-bold shrink-0">1.</span>
                                <span>Adjustments will alter the counts instantly for transactions.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-indigo-400 font-bold shrink-0">2.</span>
                                <span><strong>Add Stock</strong> adds the quantity to the current balance.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-indigo-400 font-bold shrink-0">3.</span>
                                <span><strong>Reduce Stock</strong> subtracts from the balance (clamped to 0).</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-indigo-400 font-bold shrink-0">4.</span>
                                <span><strong>Set Exact Stock</strong> overrides current counts to the input.</span>
                            </li>
                        </ul>
                    </div>

                </div>

            </div>
        </PageWrapper>
    );
}
