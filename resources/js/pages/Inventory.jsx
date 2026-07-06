import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Search, 
    SlidersHorizontal, 
    AlertTriangle, 
    Package, 
    RefreshCw, 
    TrendingUp, 
    Building2, 
    Plus, 
    Minus, 
    History, 
    CheckCircle2, 
    XCircle,
    User
} from 'lucide-react';
import PageWrapper from '../components/PageWrapper';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { Input, Select } from '../components/FormControls';
import ProductQuickView from '../components/ProductQuickView';

export default function Inventory() {
    // Inventory Items state
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    
    // Pagination & Filter States
    const [search, setSearch] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(''); // '', 'in_stock', 'low_stock', 'out_of_stock'
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotal] = useState(0);

    // Summary Metric Counts
    const [metrics, setMetrics] = useState({
        totalItems: 0,
        lowStock: 0,
        outOfStock: 0
    });

    // Modal Control States
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [quickViewProduct, setQuickViewProduct] = useState(null);
    
    // Adjust Form States
    const [adjustType, setAdjustType] = useState('increment'); // 'increment', 'decrement', 'set'
    const [adjustQty, setAdjustQty] = useState(1);
    const [adjustReason, setAdjustReason] = useState('');
    const [submittingAdjust, setSubmittingAdjust] = useState(false);

    // History Log States
    const [historyLogs, setHistoryLogs] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLastPage, setHistoryLastPage] = useState(1);

    // Fetch Inventory Items
    const fetchInventory = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: perPage,
                search,
                branch_id: selectedBranch,
                product_id: selectedProduct,
                status: selectedStatus
            };
            const response = await axios.get('/api/inventory', { params });
            setInventoryItems(response.data.data);
            setLastPage(response.data.last_page);
            setTotal(response.data.total);

            // Compute summary metrics (simplified counts based on current response or separate fetches)
            // For a highly robust metric display, we fetch summary counts
            const summaryRes = await axios.get('/api/inventory', { 
                params: { branch_id: selectedBranch, product_id: selectedProduct, per_page: 1000 } 
            });
            const allItems = summaryRes.data.data || [];
            const low = allItems.filter(item => item.quantity > 0 && item.quantity <= item.min_stock_level).length;
            const out = allItems.filter(item => item.quantity <= 0).length;
            setMetrics({
                totalItems: allItems.length,
                lowStock: low,
                outOfStock: out
            });

        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch Branches List
    const fetchBranches = async () => {
        try {
            const response = await axios.get('/api/branches');
            setBranches(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    // Fetch Products List
    const fetchProducts = async () => {
        try {
            const response = await axios.get('/api/products?per_page=1000');
            setProducts(response.data.data || response.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    // Trigger Initial Load & Refetches on Filters Change
    useEffect(() => {
        fetchBranches();
        fetchProducts();
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [page, perPage, selectedBranch, selectedProduct, selectedStatus]);

    // Handle Quick Filter Change
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchInventory();
    };

    const handleResetFilters = () => {
        setSearch('');
        setSelectedBranch('');
        setSelectedProduct('');
        setSelectedStatus('');
        setPage(1);
    };

    // Open Adjustment Modal
    const handleOpenAdjust = (item) => {
        setSelectedItem(item);
        setAdjustType('increment');
        setAdjustQty(1);
        setAdjustReason('');
        setAdjustModalOpen(true);
    };

    // Submit Adjust Stock Call
    const handleSubmitAdjust = async (e) => {
        e.preventDefault();
        if (!selectedItem) return;

        setSubmittingAdjust(true);
        try {
            await axios.post('/api/inventory/adjust', {
                inventory_id: selectedItem.id,
                type: adjustType,
                quantity: adjustQty,
                reason: adjustReason
            });
            setAdjustModalOpen(false);
            fetchInventory();
        } catch (error) {
            console.error('Error adjusting stock:', error);
            alert(error.response?.data?.message || 'Failed to adjust stock. Please check fields.');
        } finally {
            setSubmittingAdjust(false);
        }
    };

    // Fetch & Open Adjustment History Logs
    const handleOpenHistory = async (item, logPage = 1) => {
        setSelectedItem(item);
        setHistoryModalOpen(true);
        setLoadingHistory(true);
        try {
            const response = await axios.get(`/api/inventory/${item.id}/history?page=${logPage}`);
            setHistoryLogs(response.data.data || []);
            setHistoryPage(response.data.current_page);
            setHistoryLastPage(response.data.last_page);
        } catch (error) {
            console.error('Error fetching inventory history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Format Date Utility
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Table Column Config
    const columns = [
        {
            header: 'Product Details',
            accessor: 'product',
            render: (product, item) => (
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => setQuickViewProduct(product)}
                        className="font-bold text-slate-100 text-xs sm:text-sm tracking-tight hover:text-indigo-400 text-left transition-colors flex items-center gap-1.5 group"
                        title="Click to Quick View Product details"
                    >
                        <span>{product?.name}</span>
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        {product?.category && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold uppercase">
                                {product.category.name}
                            </span>
                        )}
                        {product?.brand && (
                            <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold uppercase">
                                {product.brand.name}
                            </span>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: 'Variation / SKU',
            accessor: 'variation',
            render: (variation, item) => {
                if (item.product?.has_variations && variation) {
                    const traits = [];
                    if (variation.size) traits.push(`Size: ${variation.size}`);
                    if (variation.color) traits.push(`Color: ${variation.color}`);
                    if (variation.material) traits.push(`Material: ${variation.material}`);
                    return (
                        <div className="flex flex-col gap-0.5">
                            <span className="text-slate-300 font-semibold text-xs">
                                {traits.join(' | ')}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                                SKU: {variation.sku || 'N/A'}
                            </span>
                        </div>
                    );
                }
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-slate-400 text-xs italic">
                            Standard
                        </span>
                        <span className="text-[10px] font-mono text-slate-550 tracking-wider">
                            SKU: {item.product?.sku || 'N/A'}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Branch',
            accessor: 'branch',
            render: (branch) => (
                <div className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{branch?.name || 'N/A'}</span>
                </div>
            )
        },
        {
            header: 'Quantity',
            accessor: 'quantity',
            render: (qty, item) => {
                let badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                if (item.stock_status === 'out_of_stock') {
                    badgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                } else if (item.stock_status === 'low_stock') {
                    badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                }
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono tracking-wider ${badgeClass}`}>
                                {qty}
                            </span>
                            {item.stock_status === 'low_stock' && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                            Min Threshold: {item.min_stock_level}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Status',
            accessor: 'stock_status',
            render: (status) => {
                if (status === 'out_of_stock') {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 border border-rose-500/30 text-rose-400">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Out of Stock</span>
                        </span>
                    );
                }
                
                if (status === 'low_stock') {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.08)]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Low Stock</span>
                        </span>
                    );
                }

                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>In Stock</span>
                    </span>
                );
            }
        },
        {
            header: 'Actions',
            accessor: 'id',
            render: (_, item) => (
                <div className="flex items-center gap-2">
                    <Button 
                        variant="primary" 
                        size="xs" 
                        icon={Plus}
                        onClick={() => handleOpenAdjust(item)}
                    >
                        Adjust
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="xs" 
                        icon={History}
                        onClick={() => handleOpenHistory(item)}
                    >
                        Audit Log
                    </Button>
                </div>
            )
        }
    ];

    // Branch options formatting
    const branchOptions = [
        { value: '', label: 'All Branches' },
        ...branches.map(b => ({ value: b.id, label: b.name }))
    ];

    // Product options formatting
    const productOptions = [
        { value: '', label: 'All Products' },
        ...products.map(p => ({ value: p.id, label: p.name }))
    ];

    return (
        <PageWrapper title="Inventory Stock Control">
            
            {/* Quick Metrics Dashboard Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                
                {/* Metric 1: Total Catalog Items */}
                <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-tr from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-xl">
                    <div className="absolute top-[-20%] right-[-10%] w-[100px] h-[100px] rounded-full bg-indigo-500/5 blur-[30px] pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Total Items Tracked</span>
                            <span className="text-2xl font-black text-white tracking-tight">{metrics.totalItems}</span>
                        </div>
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                            <Package className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Metric 2: Low Stock Alert */}
                <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-tr from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-xl">
                    <div className="absolute top-[-20%] right-[-10%] w-[100px] h-[100px] rounded-full bg-amber-500/5 blur-[30px] pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Low Stock Alert</span>
                            <span className="text-2xl font-black text-amber-400 tracking-tight">{metrics.lowStock}</span>
                        </div>
                        <div className={`p-3 rounded-xl border ${
                            metrics.lowStock > 0 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' 
                                : 'bg-slate-850 text-slate-500 border-slate-800'
                        }`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Metric 3: Out of Stock */}
                <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-tr from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-xl">
                    <div className="absolute top-[-20%] right-[-10%] w-[100px] h-[100px] rounded-full bg-rose-500/5 blur-[30px] pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Out of Stock</span>
                            <span className="text-2xl font-black text-rose-400 tracking-tight">{metrics.outOfStock}</span>
                        </div>
                        <div className={`p-3 rounded-xl border ${
                            metrics.outOfStock > 0 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' 
                                : 'bg-slate-850 text-slate-500 border-slate-800'
                        }`}>
                            <XCircle className="w-5 h-5" />
                        </div>
                    </div>
                </div>

            </div>

            {/* Filter controls panel */}
            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/85 backdrop-blur-md mb-6 space-y-4">
                <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                    
                    <div className="flex-1 w-full">
                        <Input
                            label="Search Product Stock"
                            id="stock-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Type product name, SKU, or barcode and press Enter..."
                            icon={Search}
                        />
                    </div>

                    <div className="w-full md:w-56">
                        <Select
                            label="Filter By Branch"
                            id="branch-select"
                            value={selectedBranch}
                            onChange={(e) => {
                                setSelectedBranch(e.target.value);
                                setPage(1);
                            }}
                            options={branchOptions}
                        />
                    </div>

                    <div className="w-full md:w-56">
                        <Select
                            label="Filter By Product"
                            id="product-select"
                            value={selectedProduct}
                            onChange={(e) => {
                                setSelectedProduct(e.target.value);
                                setPage(1);
                            }}
                            options={productOptions}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto self-stretch md:self-auto shrink-0">
                        <Button variant="secondary" type="button" onClick={handleResetFilters} className="w-full md:w-auto">
                            Reset
                        </Button>
                        <Button variant="primary" type="submit" className="w-full md:w-auto">
                            Apply
                        </Button>
                    </div>

                </form>

                {/* Status Tabs Filters */}
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2">Stock Alert Filter:</span>
                    
                    <button
                        onClick={() => { setSelectedStatus(''); setPage(1); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            selectedStatus === '' 
                                ? 'bg-indigo-600 border-indigo-500 text-white' 
                                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        All Stock
                    </button>

                    <button
                        onClick={() => { setSelectedStatus('low_stock'); setPage(1); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            selectedStatus === 'low_stock' 
                                ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/10' 
                                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Low Stock
                    </button>

                    <button
                        onClick={() => { setSelectedStatus('out_of_stock'); setPage(1); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            selectedStatus === 'out_of_stock' 
                                ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/10' 
                                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Out of Stock
                    </button>

                    <button
                        onClick={() => { setSelectedStatus('in_stock'); setPage(1); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            selectedStatus === 'in_stock' 
                                ? 'bg-emerald-600 border-emerald-500 text-white' 
                                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Healthy Stock
                    </button>

                </div>

            </div>

            {/* Inventory Listing Table */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
                <Table
                    columns={columns}
                    data={inventoryItems}
                    loading={loading}
                    pagination={{
                        page,
                        lastPage,
                        total,
                        onPageChange: (newPage) => setPage(newPage)
                    }}
                    emptyState={
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <Package className="w-12 h-12 text-slate-700 mb-3" />
                            <span className="font-semibold text-slate-400 text-sm">No Inventory Matches Found</span>
                            <p className="text-xs text-slate-600 max-w-sm mt-1">Try relaxing search parameters, selecting another branch location, or seeding default stocks.</p>
                        </div>
                    }
                />
            </div>

            {/* Adjust Stock Quantity Modal */}
            <Modal
                isOpen={adjustModalOpen}
                onClose={() => setAdjustModalOpen(false)}
                title="Adjust Stock Quantity"
            >
                {selectedItem && (
                    <form onSubmit={handleSubmitAdjust} className="space-y-4">
                        
                        <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Adjusting Stock For</span>
                            <h4 className="font-bold text-white text-sm tracking-tight">{selectedItem.product?.name}</h4>
                            {selectedItem.product?.has_variations && selectedItem.variation && (
                                <p className="text-xs text-slate-400">
                                    Variation: {selectedItem.variation.size && `Size ${selectedItem.variation.size}`}
                                    {selectedItem.variation.color && ` | Color ${selectedItem.variation.color}`}
                                </p>
                            )}
                            <p className="text-[11px] text-slate-500">
                                Branch: <span className="font-semibold text-slate-350">{selectedItem.branch?.name}</span> | Current Stock: <span className="font-bold text-indigo-300">{selectedItem.quantity}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Adjustment Action</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('increment')}
                                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            adjustType === 'increment' 
                                                ? 'bg-emerald-600 border-emerald-500 text-white' 
                                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('decrement')}
                                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            adjustType === 'decrement' 
                                                ? 'bg-rose-600 border-rose-500 text-white' 
                                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Minus className="w-3.5 h-3.5" /> Remove
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('set')}
                                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            adjustType === 'set' 
                                                ? 'bg-indigo-600 border-indigo-500 text-white' 
                                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <SlidersHorizontal className="w-3.5 h-3.5" /> Set
                                    </button>
                                </div>
                            </div>

                            <Input
                                label={adjustType === 'set' ? 'New Exact Quantity' : 'Quantity To Apply'}
                                id="adjust-qty"
                                type="number"
                                min="1"
                                value={adjustQty}
                                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                                required
                            />
                        </div>

                        <Input
                            label="Reason for adjustment"
                            id="adjust-reason"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="e.g. Received new supply, Audit correction, Damaged stock"
                            required
                        />

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-850">
                            <Button variant="secondary" type="button" onClick={() => setAdjustModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" loading={submittingAdjust}>
                                Confirm Adjustment
                            </Button>
                        </div>

                    </form>
                )}
            </Modal>

            {/* Audit History Log Modal */}
            <Modal
                isOpen={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                title="Stock Adjustment Audit History"
                size="lg"
            >
                {selectedItem && (
                    <div className="space-y-4">
                        
                        <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auditing Product</span>
                            <h4 className="font-bold text-white text-sm tracking-tight">{selectedItem.product?.name}</h4>
                            <p className="text-[11px] text-slate-500">
                                Branch: <span className="font-semibold text-slate-350">{selectedItem.branch?.name}</span> | Current On-Hand Stock: <span className="font-bold text-indigo-400">{selectedItem.quantity}</span>
                            </p>
                        </div>

                        <div className="max-h-[350px] overflow-y-auto rounded-xl border border-slate-850">
                            {loadingHistory ? (
                                <div className="py-12 flex flex-col items-center justify-center">
                                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                                    <span className="text-xs text-slate-500 font-semibold">Loading stock log history...</span>
                                </div>
                            ) : historyLogs.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center">
                                    <History className="w-10 h-10 text-slate-700 mb-2" />
                                    <span className="font-semibold text-slate-400 text-xs">No Stock Adjustments Audited</span>
                                    <p className="text-[10px] text-slate-600 mt-0.5">This inventory row has no manual adjustments recorded.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-850 bg-slate-950/20">
                                    {historyLogs.map((log) => {
                                        let changeLabel = '';
                                        let textClass = '';
                                        
                                        if (log.type === 'increment') {
                                            changeLabel = `+${log.quantity}`;
                                            textClass = 'text-emerald-400 font-bold';
                                        } else if (log.type === 'decrement') {
                                            changeLabel = `-${log.quantity}`;
                                            textClass = 'text-rose-400 font-bold';
                                        } else {
                                            changeLabel = `Set to ${log.quantity}`;
                                            textClass = 'text-indigo-400 font-bold';
                                        }

                                        return (
                                            <div key={log.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-900/10 transition-colors">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-slate-200 text-xs font-semibold tracking-tight">
                                                        {log.reason || 'Manual Adjustment'}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                        <User className="w-3 h-3 text-slate-600" />
                                                        <span>{log.user?.name || 'System Admin'}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(log.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <span className={`text-sm tracking-wide font-mono ${textClass}`}>
                                                        {changeLabel}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Paginate log history */}
                        {!loadingHistory && historyLastPage > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-850 pt-3">
                                <span className="text-[10px] text-slate-500">Page {historyPage} of {historyLastPage}</span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="secondary"
                                        size="xs"
                                        disabled={historyPage === 1}
                                        onClick={() => handleOpenHistory(selectedItem, historyPage - 1)}
                                    >
                                        Prev
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="xs"
                                        disabled={historyPage === historyLastPage}
                                        onClick={() => handleOpenHistory(selectedItem, historyPage + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end pt-2">
                            <Button variant="secondary" type="button" onClick={() => setHistoryModalOpen(false)}>
                                Close Logs
                            </Button>
                        </div>

                    </div>
                )}
            </Modal>

            {/* Quick View Modal */}
            {quickViewProduct && (
                <ProductQuickView
                    product={quickViewProduct}
                    onClose={() => setQuickViewProduct(null)}
                />
            )}

        </PageWrapper>
    );
}
