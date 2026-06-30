import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Package, Layers, RefreshCw, CheckCircle2, AlertTriangle, FileText, Trash } from 'lucide-react';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import { Select, Input, Textarea } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';

export default function DamagedLostStock() {
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

    // Current stock level state
    const [currentInventory, setCurrentInventory] = useState(null);
    const [loadingStock, setLoadingStock] = useState(false);

    // Form states
    const [reportType, setReportType] = useState('damaged'); // 'damaged', 'lost'
    const [qty, setQty] = useState(1);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

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
                console.error('Error fetching initial data for damaged/lost stock form:', error);
                setErrorMessage('Failed to load branches and products.');
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
        if (currentInventory && qty > currentInventory.quantity) {
            setErrorMessage(`Reported quantity exceeds the current stock of ${currentInventory.quantity} units.`);
            return;
        }
        if (!notes.trim()) {
            setErrorMessage('Please provide details or notes describing the damage or loss.');
            return;
        }

        setIsSubmitting(true);
        try {
            const reportName = reportType === 'damaged' ? 'Damaged' : 'Lost';
            const payload = {
                branch_id: selectedBranch,
                product_id: selectedProduct,
                type: 'decrement',
                quantity: qty,
                reason: `${reportName}: ${notes.trim()}`
            };
            if (selectedVariation) {
                payload.product_variation_id = selectedVariation;
            }

            const response = await axios.post('/api/inventory/adjust', payload);
            
            // Refresh inventory status card
            setCurrentInventory(response.data);
            setSuccessMessage(`Stock marked as ${reportName.toLowerCase()} successfully!`);
            setQty(1);
            setNotes('');
        } catch (error) {
            console.error('Failed to submit loss report:', error);
            setErrorMessage(error.response?.data?.message || 'Failed to record stock loss. Please try again.');
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
        { label: 'Damaged / Lost Stock' }
    ];

    return (
        <PageWrapper 
            title="Report Damaged / Lost Stock" 
            subtitle="Reduce stock counts due to catalog damage, shrinkage, theft, or shipping losses."
            breadcrumbs={breadcrumbs}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form Card */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800/60 pb-4">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-450">
                            <Trash className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-100">Discrepancy & Damage Report</h3>
                            <p className="text-xs text-slate-500">Decrements stock counts and tags movements as loss.</p>
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
                                label="Select Branch"
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

                            {/* Discrepancy Type */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Report Classification
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setReportType('damaged')}
                                        className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-bold transition-all ${
                                            reportType === 'damaged'
                                                ? 'bg-rose-600/10 border-rose-500/80 text-rose-400 shadow-lg'
                                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950 hover:text-slate-300'
                                        }`}
                                    >
                                        <AlertTriangle className="w-4 h-4" />
                                        Damaged Stock
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReportType('lost')}
                                        className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-bold transition-all ${
                                            reportType === 'lost'
                                                ? 'bg-amber-600/10 border-amber-500/80 text-amber-400 shadow-lg'
                                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950 hover:text-slate-350'
                                        }`}
                                    >
                                        <FileText className="w-4 h-4" />
                                        Lost / Shrunk Stock
                                    </button>
                                </div>
                            </div>

                            {/* Quantity Input */}
                            <Input 
                                label="Quantity Affected"
                                id="qty-input"
                                type="number"
                                min="1"
                                max={currentInventory ? currentInventory.quantity : undefined}
                                value={qty}
                                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 0))}
                            />

                            {/* Notes description of incident */}
                            <Textarea 
                                label="Description of Incident (Required)"
                                id="notes-textarea"
                                placeholder="Explain how the stock was damaged or lost (e.g. Broken packaging, Water leak in storage, Theft during transit)..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                            />

                            {/* Form submit button */}
                            <div className="flex justify-end pt-2 border-t border-slate-850">
                                <Button
                                    type="submit"
                                    loading={isSubmitting}
                                    variant="danger"
                                    disabled={!selectedBranch || !selectedProduct || (hasVariations && !selectedVariation) || !notes.trim()}
                                    className="w-full sm:w-auto"
                                >
                                    Log Loss Report
                                </Button>
                            </div>

                        </form>
                    )}
                </div>

                {/* Info Card / Live Stock Status */}
                <div className="space-y-6">
                    
                    {/* Live Stock Level Indicator Card */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Stock Availability</h3>
                        
                        {loadingStock ? (
                            <div className="flex flex-col items-center justify-center py-6 space-y-3">
                                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                                <span className="text-xs text-slate-500">Checking stock levels...</span>
                            </div>
                        ) : currentInventory ? (
                            <div className="space-y-4">
                                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/50 flex flex-col items-center justify-center text-center">
                                    <span className="text-xs font-semibold text-slate-500 mb-1">Available Quantity</span>
                                    <span className={`text-4xl font-extrabold tracking-tight ${
                                        currentInventory.quantity <= 0 
                                            ? 'text-rose-500' 
                                            : currentInventory.quantity <= currentInventory.min_stock_level 
                                                ? 'text-amber-500' 
                                                : 'text-emerald-450'
                                    }`}>
                                        {currentInventory.quantity}
                                    </span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-3 ${
                                        currentInventory.quantity <= 0 
                                            ? 'bg-rose-500/10 text-rose-450' 
                                            : currentInventory.quantity <= currentInventory.min_stock_level 
                                                ? 'bg-amber-500/10 text-amber-400' 
                                                : 'bg-emerald-500/10 text-emerald-400'
                                    }`}>
                                        {currentInventory.quantity <= 0 ? 'Cannot Report (0 Stock)' : 'Units Available'}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium py-1.5 border-b border-slate-850">
                                        <span className="text-slate-550">Alert Level Threshold</span>
                                        <span className="text-slate-350">{currentInventory.min_stock_level} units</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium py-1.5">
                                        <span className="text-slate-550">Inventory Record ID</span>
                                        <span className="text-slate-350">{currentInventory.id ? `#${currentInventory.id}` : 'Not initialized'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-950/20 border border-dashed border-slate-800 rounded-xl p-4">
                                <Package className="w-8 h-8 text-slate-650 mb-2.5" />
                                <h4 className="text-xs font-bold text-slate-400">No Product Selected</h4>
                                <p className="text-[10px] text-slate-500 mt-1 max-w-xs">Select a branch and product to see quantities available for reporting.</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Guide Card */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            Inventory Shrinkage
                        </h3>
                        <ul className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
                            <li className="flex gap-2">
                                <span className="text-rose-400 font-bold shrink-0">•</span>
                                <span>All submissions write off inventory immediately.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-rose-400 font-bold shrink-0">•</span>
                                <span>You cannot report more units than are currently in stock.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-rose-400 font-bold shrink-0">•</span>
                                <span>Details will be archived as a stock decrement movement and labeled as Damaged or Lost.</span>
                            </li>
                        </ul>
                    </div>

                </div>

            </div>
        </PageWrapper>
    );
}
