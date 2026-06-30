import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Search, 
    Building2, 
    Package, 
    SlidersHorizontal, 
    RefreshCw, 
    TrendingUp, 
    ChevronLeft, 
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Equal,
    Calendar,
    User
} from 'lucide-react';
import PageWrapper from '../components/PageWrapper';
import Table from '../components/Table';
import Button from '../components/Button';
import { Select } from '../components/FormControls';

export default function StockMovementHistory() {
    // Dropdowns
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingFilters, setLoadingFilters] = useState(true);

    // Logs state & loading
    const [movementLogs, setMovementLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Filter states
    const [search, setSearch] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Fetch initial filter lists
    useEffect(() => {
        const fetchFiltersData = async () => {
            setLoadingFilters(true);
            try {
                const [branchesRes, productsRes] = await Promise.all([
                    axios.get('/api/branches'),
                    axios.get('/api/products?per_page=1000')
                ]);
                setBranches(branchesRes.data.data || branchesRes.data || []);
                setProducts(productsRes.data.data || productsRes.data || []);
            } catch (error) {
                console.error('Error loading dropdown lists in history page:', error);
            } finally {
                setLoadingFilters(false);
            }
        };

        fetchFiltersData();
    }, []);

    // Fetch Movement logs
    const fetchMovements = async () => {
        setLoadingLogs(true);
        try {
            const params = {
                page,
                branch_id: selectedBranch,
                product_id: selectedProduct,
                type: selectedType,
                search: search
            };
            const response = await axios.get('/api/inventory/history', { params });
            setMovementLogs(response.data.data || []);
            setPage(response.data.current_page || 1);
            setLastPage(response.data.last_page || 1);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching global movements history:', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    // Trigger movements refetch on paging/filters change
    useEffect(() => {
        fetchMovements();
    }, [page, selectedBranch, selectedProduct, selectedType]);

    // Handle Quick search filter submission
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchMovements();
    };

    // Reset filters
    const handleResetFilters = () => {
        setSearch('');
        setSelectedBranch('');
        setSelectedProduct('');
        setSelectedType('');
        setPage(1);
    };

    // Utility formatting helpers
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

    const getVariationDetails = (variation) => {
        if (!variation) return null;
        const details = [];
        if (variation.size) details.push(`Size: ${variation.size}`);
        if (variation.color) details.push(`Color: ${variation.color}`);
        if (variation.material) details.push(`Mat: ${variation.material}`);
        return details.join(', ') || `ID: ${variation.id}`;
    };

    // Column configurations
    const columns = [
        {
            header: 'Product Info',
            accessor: 'inventory',
            render: (inventory) => {
                if (!inventory || !inventory.product) return <span className="text-slate-500 font-medium">Deleted Product</span>;
                const vDetails = getVariationDetails(inventory.variation);
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-200 text-xs">{inventory.product.name}</span>
                        {vDetails && (
                            <span className="text-[10px] text-slate-500 font-semibold">{vDetails}</span>
                        )}
                        <span className="text-[10px] text-indigo-400/80 font-mono tracking-wider">
                            SKU: {inventory.variation ? inventory.variation.sku : inventory.product.sku}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Branch',
            accessor: 'inventory',
            render: (inventory) => {
                if (!inventory || !inventory.branch) return <span className="text-slate-500">Global</span>;
                return (
                    <div className="flex items-center gap-1.5 text-xs text-slate-350 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{inventory.branch.name}</span>
                    </div>
                );
            }
        },
        {
            header: 'Movement Action',
            accessor: 'type',
            render: (type, log) => {
                if (type === 'increment') {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-450 border border-emerald-500/10 shadow-sm">
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            Stock In (+)
                        </span>
                    );
                } else if (type === 'decrement') {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-450 border border-rose-500/10 shadow-sm">
                            <ArrowDownRight className="w-3 h-3 text-rose-400" />
                            Stock Out (-)
                        </span>
                    );
                } else {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 shadow-sm">
                            <Equal className="w-3.5 h-3.5 text-indigo-400" />
                            Override (=)
                        </span>
                    );
                }
            }
        },
        {
            header: 'Quantity Delta',
            accessor: 'quantity',
            render: (qty, log) => {
                const prefix = log.type === 'increment' ? '+' : log.type === 'decrement' ? '-' : '= ';
                const color = log.type === 'increment' ? 'text-emerald-450' : log.type === 'decrement' ? 'text-rose-450' : 'text-indigo-400';
                return (
                    <span className={`font-mono font-bold text-xs ${color}`}>
                        {prefix}{qty}
                    </span>
                );
            }
        },
        {
            header: 'Authorized By',
            accessor: 'user',
            render: (user) => (
                <div className="flex items-center gap-1.5 text-xs text-slate-350 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-555" />
                    <span>{user ? user.name : 'System / Auto'}</span>
                </div>
            )
        },
        {
            header: 'Reason',
            accessor: 'reason',
            render: (reason) => {
                // If it starts with "Damaged: " or "Lost: " we format it nicely
                let displayReason = reason;
                let badge = null;
                if (reason && reason.startsWith('Damaged: ')) {
                    badge = <span className="text-[9px] font-bold uppercase bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded mr-1">Damaged</span>;
                    displayReason = reason.replace('Damaged: ', '');
                } else if (reason && reason.startsWith('Lost: ')) {
                    badge = <span className="text-[9px] font-bold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded mr-1">Lost</span>;
                    displayReason = reason.replace('Lost: ', '');
                }
                return (
                    <div className="flex flex-wrap items-center text-xs text-slate-400 font-medium">
                        {badge}
                        <span className="truncate max-w-[200px]" title={reason}>{displayReason || 'No details provided'}</span>
                    </div>
                );
            }
        },
        {
            header: 'Recorded On',
            accessor: 'created_at',
            render: (created_at) => (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-slate-655" />
                    <span>{formatDate(created_at)}</span>
                </div>
            )
        }
    ];

    const breadcrumbs = [
        { label: 'Inventory', path: '/inventory' },
        { label: 'Stock Movement History' }
    ];

    return (
        <PageWrapper
            title="Stock Movement Ledger"
            subtitle="Full audit trail log of all inventory count variations, increments, decrements, and overrides."
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-4">
                
                {/* Search & Filters Toolbar */}
                <div className="p-4 bg-slate-900 border border-slate-800/80 rounded-xl space-y-4 shadow-md">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3">
                        {/* Keyword Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search products in logs by name, SKU, or barcode..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-250 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                            />
                        </div>

                        {/* Dropdown Filters */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:w-auto">
                            <select
                                value={selectedBranch}
                                onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}
                                className="px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500 font-semibold"
                            >
                                <option value="" className="bg-slate-900">All Branches</option>
                                {branches.map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>)}
                            </select>

                            <select
                                value={selectedProduct}
                                onChange={(e) => { setSelectedProduct(e.target.value); setPage(1); }}
                                className="px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500 font-semibold"
                            >
                                <option value="" className="bg-slate-900">All Products</option>
                                {products.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                            </select>

                            <select
                                value={selectedType}
                                onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                                className="px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500 font-semibold"
                            >
                                <option value="" className="bg-slate-900">All Actions</option>
                                <option value="increment" className="bg-slate-900">Stock In (+)</option>
                                <option value="decrement" className="bg-slate-900">Stock Out (-)</option>
                                <option value="set" className="bg-slate-900">Override (=)</option>
                            </select>

                            <div className="flex gap-1.5 col-span-2 sm:col-span-1">
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20 rounded-lg transition-colors cursor-pointer"
                                >
                                    Filter
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-705 text-slate-400 hover:text-slate-200 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
                                    title="Reset all filters"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Audit Table Logs */}
                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                    <Table 
                        columns={columns}
                        data={movementLogs}
                        loading={loadingLogs}
                        emptyMessage="No stock movement records found for the selected filters."
                    />

                    {/* Pagination control footer */}
                    {lastPage > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60 bg-slate-900/40">
                            <span className="text-xs text-slate-500 font-medium">
                                Showing page {page} of {lastPage} ({total} entries total)
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                    className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-950/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    disabled={page === lastPage}
                                    onClick={() => setPage(prev => Math.min(lastPage, prev + 1))}
                                    className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-950/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </PageWrapper>
    );
}
