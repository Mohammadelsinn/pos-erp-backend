import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Plus, Search, Edit2, Trash2, Eye, FolderPlus, Tag, Filter,
    CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Layers
} from 'lucide-react';
import ProductQuickView from '../components/ProductQuickView';
import StockStatusBadge from '../components/StockStatusBadge';

export default function Products() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('products'); // products, categories, brands
    
    // Products State
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [filters, setFilters] = useState({ search: '', category_id: '', brand_id: '', branch_id: '', status: '', page: 1, per_page: 10 });
    const [selectedIds, setSelectedIds] = useState([]);
    const [quickViewProduct, setQuickViewProduct] = useState(null);
    const [bulkAction, setBulkAction] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);

    // General Catalog States
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loadingCatalog, setLoadingCatalog] = useState(false);

    // Forms State for Categories/Brands
    const [categoryForm, setCategoryForm] = useState({ id: null, name: '', slug: '', description: '' });
    const [brandForm, setBrandForm] = useState({ id: null, name: '', slug: '', description: '' });
    const [formErrors, setFormErrors] = useState({});
    const [submittingForm, setSubmittingForm] = useState(false);

    // Initial Fetch
    useEffect(() => {
        fetchCatalogData();
    }, []);

    useEffect(() => {
        if (activeTab === 'products') {
            fetchProducts();
        }
    }, [filters.page, filters.category_id, filters.brand_id, filters.branch_id, filters.status]);

    const fetchCatalogData = async () => {
        setLoadingCatalog(true);
        try {
            const [catRes, brandRes, branchRes] = await Promise.all([
                axios.get('/api/categories'),
                axios.get('/api/brands'),
                axios.get('/api/branches')
            ]);
            setCategories(catRes.data);
            setBrands(brandRes.data);
            setBranches(branchRes.data.data || branchRes.data || []);
        } catch (err) {
            console.error('Failed to fetch catalog lists', err);
        } finally {
            setLoadingCatalog(false);
        }
    };

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const params = {
                search: filters.search,
                category_id: filters.category_id,
                brand_id: filters.brand_id,
                branch_id: filters.branch_id,
                status: filters.status,
                page: filters.page,
                per_page: filters.per_page
            };
            const response = await axios.get('/api/products', { params });
            setProducts(response.data.data);
            setPagination({
                current_page: response.data.current_page,
                last_page: response.data.last_page,
                total: response.data.total
            });
        } catch (err) {
            console.error('Failed to fetch products', err);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 }));
        fetchProducts();
    };

    const handleResetFilters = () => {
        setFilters({ search: '', category_id: '', brand_id: '', branch_id: '', status: '', page: 1, per_page: 10 });
        setSelectedIds([]);
    };

    // Toggle Product Status
    const handleToggleStatus = async (product) => {
        try {
            const response = await axios.patch(`/api/products/${product.id}/toggle-status`);
            setProducts(prev => prev.map(p => p.id === product.id ? response.data : p));
        } catch (err) {
            console.error('Failed to toggle product status', err);
        }
    };

    // Delete Product
    const handleDeleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await axios.delete(`/api/products/${id}`);
            fetchProducts();
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        } catch (err) {
            console.error('Failed to delete product', err);
        }
    };

    // Bulk actions
    const handleBulkActionSubmit = async () => {
        if (selectedIds.length === 0 || !bulkAction) return;

        if (bulkAction === 'delete') {
            if (!confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) return;
            try {
                await axios.post('/api/products/bulk-delete', { ids: selectedIds });
                setSelectedIds([]);
                setBulkAction('');
                fetchProducts();
            } catch (err) {
                console.error('Failed bulk delete', err);
            }
        } else if (bulkAction === 'activate' || bulkAction === 'deactivate') {
            const targetStatus = bulkAction === 'activate' ? 'active' : 'inactive';
            try {
                await axios.post('/api/products/bulk-status', { ids: selectedIds, status: targetStatus });
                setSelectedIds([]);
                setBulkAction('');
                fetchProducts();
            } catch (err) {
                console.error('Failed bulk status update', err);
            }
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(products.map(p => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // CRUD Category Actions
    const handleSaveCategory = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setSubmittingForm(true);
        try {
            if (categoryForm.id) {
                await axios.put(`/api/categories/${categoryForm.id}`, categoryForm);
            } else {
                await axios.post('/api/categories', categoryForm);
            }
            setCategoryForm({ id: null, name: '', slug: '', description: '' });
            fetchCatalogData();
        } catch (err) {
            if (err.response?.status === 422) {
                setFormErrors(err.response.data.errors);
            }
        } finally {
            setSubmittingForm(false);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!confirm('Are you sure you want to delete this category? Products in this category will be set to uncategorized.')) return;
        try {
            await axios.delete(`/api/categories/${id}`);
            fetchCatalogData();
        } catch (err) {
            console.error(err);
        }
    };

    // CRUD Brand Actions
    const handleSaveBrand = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setSubmittingForm(true);
        try {
            if (brandForm.id) {
                await axios.put(`/api/brands/${brandForm.id}`, brandForm);
            } else {
                await axios.post('/api/brands', brandForm);
            }
            setBrandForm({ id: null, name: '', slug: '', description: '' });
            fetchCatalogData();
        } catch (err) {
            if (err.response?.status === 422) {
                setFormErrors(err.response.data.errors);
            }
        } finally {
            setSubmittingForm(false);
        }
    };

    const handleDeleteBrand = async (id) => {
        if (!confirm('Are you sure you want to delete this brand? Products associated with this brand will be unbranded.')) return;
        try {
            await axios.delete(`/api/brands/${id}`);
            fetchCatalogData();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100">Catalog Management</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage products, categories, brands, and variations.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/products/create')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/10 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Product
                    </button>
                </div>
            </div>

            {/* Custom Premium Tabs */}
            <div className="flex border-b border-slate-800 gap-2">
                <button
                    onClick={() => { setActiveTab('products'); setFormErrors({}); }}
                    className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold tracking-wide border-b-2 transition-all duration-300 rounded-t-lg ${
                        activeTab === 'products'
                            ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5 shadow-[inset_0_-2px_0_0_#6366f1]'
                            : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Products List
                </button>
                <button
                    onClick={() => { setActiveTab('categories'); setFormErrors({}); }}
                    className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold tracking-wide border-b-2 transition-all duration-300 rounded-t-lg ${
                        activeTab === 'categories'
                            ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5 shadow-[inset_0_-2px_0_0_#6366f1]'
                            : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Categories Management
                </button>
                <button
                    onClick={() => { setActiveTab('brands'); setFormErrors({}); }}
                    className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold tracking-wide border-b-2 transition-all duration-300 rounded-t-lg ${
                        activeTab === 'brands'
                            ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5 shadow-[inset_0_-2px_0_0_#6366f1]'
                            : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                >
                    <Tag className="w-3.5 h-3.5" />
                    Brands Management
                </button>
            </div>

            {/* Content tab containers */}
            {activeTab === 'products' && (
                <div className="space-y-4">
                    {/* Filters & Search Toolbar */}
                    <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-4">
                        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search by name, SKU, barcode..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-250 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:w-auto">
                                <select
                                    value={filters.category_id}
                                    onChange={(e) => setFilters(prev => ({ ...prev, category_id: e.target.value, page: 1 }))}
                                    className="px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="" className="bg-slate-900">All Categories</option>
                                    {categories.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                </select>
                                <select
                                    value={filters.brand_id}
                                    onChange={(e) => setFilters(prev => ({ ...prev, brand_id: e.target.value, page: 1 }))}
                                    className="px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="" className="bg-slate-900">All Brands</option>
                                    {brands.map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>)}
                                </select>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                                    className="px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="" className="bg-slate-900">All Statuses</option>
                                    <option value="active" className="bg-slate-900">Active</option>
                                    <option value="inactive" className="bg-slate-900">Inactive</option>
                                </select>
                                <select
                                    value={filters.branch_id}
                                    onChange={(e) => setFilters(prev => ({ ...prev, branch_id: e.target.value, page: 1 }))}
                                    className="px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="" className="bg-slate-900">All Branches</option>
                                    {branches.map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>)}
                                </select>
                                <div className="flex gap-1.5 col-span-2 sm:col-span-1">
                                    <button
                                        type="submit"
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20 rounded-lg transition-colors"
                                    >
                                        Filter
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 rounded-lg transition-colors"
                                        title="Reset filters"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Bulk Action Controls */}
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-3 p-2 bg-indigo-650/10 border border-indigo-500/10 rounded-lg animate-fade-in">
                                <span className="text-xs text-indigo-300 font-medium pl-1">
                                    {selectedIds.length} products selected
                                </span>
                                <div className="h-4 w-px bg-indigo-500/20"></div>
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                    className="px-2 py-1.5 text-xs bg-slate-950/60 border border-indigo-500/20 rounded text-slate-300 focus:outline-none"
                                >
                                    <option value="">Choose Bulk Action</option>
                                    <option value="activate">Activate Status</option>
                                    <option value="deactivate">Deactivate Status</option>
                                    <option value="delete">Delete Products</option>
                                </select>
                                <button
                                    onClick={handleBulkActionSubmit}
                                    disabled={!bulkAction}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold rounded transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Products Table */}
                    <div className="border border-slate-800/85 rounded-xl overflow-hidden bg-slate-900/20">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[850px]">
                                <thead>
                                    <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        <th className="p-4 w-12 text-center">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={products.length > 0 && selectedIds.length === products.length}
                                                className="rounded border-slate-800 text-indigo-650 bg-slate-950/40 focus:ring-indigo-500"
                                            />
                                        </th>
                                        <th className="p-4">Product Info</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">Brand</th>
                                        <th className="p-4">SKU / Code</th>
                                        <th className="p-4">Base Pricing</th>
                                        <th className="p-4">Stock Level</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-350">
                                    {loadingProducts ? (
                                        <tr>
                                            <td colSpan="9" className="p-8 text-center text-slate-500">
                                                <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-indigo-500" />
                                                <span>Loading catalog products...</span>
                                            </td>
                                        </tr>
                                    ) : products.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="p-8 text-center text-slate-500">
                                                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                                                <span>No products found matching filters.</span>
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((p) => {
                                            const isSelected = selectedIds.includes(p.id);
                                            return (
                                                <tr key={p.id} className={`hover:bg-slate-800/10 ${isSelected ? 'bg-indigo-500/5' : ''}`}>
                                                    <td className="p-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleSelectRow(p.id)}
                                                            className="rounded border-slate-800 text-indigo-650 bg-slate-950/40 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 border border-slate-800 bg-slate-950/40 rounded-lg flex items-center justify-center overflow-hidden">
                                                                {p.image_url ? (
                                                                    <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <Tag className="w-4 h-4 text-slate-650" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-slate-200 block">{p.name}</span>
                                                                <span className="text-[10px] text-slate-500">{p.has_variations ? 'Variable Product' : 'Simple Product'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-slate-300">{p.category?.name || 'Uncategorized'}</td>
                                                    <td className="p-4 text-slate-300">{p.brand?.name || 'Unbranded'}</td>
                                                    <td className="p-4 font-mono text-[11px] text-slate-400">
                                                        {p.has_variations ? (
                                                            <span className="text-slate-500">Multiple ({p.variations?.length || 0})</span>
                                                        ) : (
                                                            p.sku || 'N/A'
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                         {p.has_variations ? (
                                                             <div className="flex flex-col gap-1">
                                                                 <span className="text-[10px] bg-indigo-505/5 text-indigo-300 px-2 py-0.5 border border-indigo-500/15 rounded-md font-semibold w-max">
                                                                     Variable
                                                                 </span>
                                                                 {p.variations && p.variations.length > 0 && (
                                                                     <span className="text-[10px] text-indigo-400 font-semibold block">
                                                                         {(() => {
                                                                             let totalMargin = 0;
                                                                             let count = 0;
                                                                             p.variations.forEach(v => {
                                                                                 const c = parseFloat(v.cost_price);
                                                                                 const s = parseFloat(v.selling_price);
                                                                                 if (!isNaN(c) && !isNaN(s) && s > 0) {
                                                                                     totalMargin += ((s - c) / s) * 100;
                                                                                     count++;
                                                                                 }
                                                                             });
                                                                             return count > 0 ? `${(totalMargin / count).toFixed(0)}% avg margin` : '';
                                                                         })()}
                                                                     </span>
                                                                 )}
                                                             </div>
                                                         ) : (
                                                             <div className="flex flex-col gap-0.5">
                                                                 <span className="text-slate-200 block font-semibold">${p.selling_price}</span>
                                                                 <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                                     <span>Cost: ${p.cost_price}</span>
                                                                     {p.selling_price > 0 && (
                                                                         <>
                                                                             <span>&bull;</span>
                                                                             <span className="text-indigo-400 font-semibold">{((p.selling_price - p.cost_price) / p.selling_price * 100).toFixed(0)}% margin</span>
                                                                         </>
                                                                     )}
                                                                 </div>
                                                             </div>
                                                         )}
                                                    </td>
                                                    <td className="p-4">
                                                        {(() => {
                                                            const totalStock = p.inventories ? p.inventories.reduce((sum, inv) => sum + (inv.quantity || 0), 0) : 0;
                                                            const branchBreakdown = p.inventories && p.inventories.length > 0
                                                                ? p.inventories.map(inv => `${inv.branch?.name || 'Branch'}: ${inv.quantity}`).join(' | ')
                                                                : '';
                                                                
                                                            return (
                                                                <div className="flex flex-col gap-1">
                                                                    <StockStatusBadge 
                                                                        quantity={totalStock} 
                                                                        minStockLevel={p.inventories?.[0]?.min_stock_level || 5}
                                                                        inventories={p.inventories}
                                                                        size="sm"
                                                                    />
                                                                    {branchBreakdown && (
                                                                        <span className="text-[10px] text-slate-500 truncate max-w-[150px]" title={branchBreakdown}>
                                                                            {branchBreakdown}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="p-4">
                                                        <button 
                                                            onClick={() => handleToggleStatus(p)}
                                                            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                                                                p.status === 'active'
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                                            }`}
                                                        >
                                                            {p.status === 'active' ? (
                                                                <>
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    Active
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle className="w-3 h-3" />
                                                                    Inactive
                                                                </>
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => setQuickViewProduct(p)}
                                                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                                                                title="Quick View"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => navigate(`/products/${p.id}/edit`)}
                                                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-250 transition-colors"
                                                                title="Edit Product"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteProduct(p.id)}
                                                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                                                                title="Delete Product"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination footer */}
                        {pagination.last_page > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-slate-800/60 bg-slate-950/10">
                                <span className="text-xs text-slate-400">
                                    Showing page {pagination.current_page} of {pagination.last_page} &bull; Total {pagination.total} records
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        disabled={pagination.current_page === 1}
                                        onClick={() => setFilters(prev => ({ ...prev, page: pagination.current_page - 1 }))}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        disabled={pagination.current_page === pagination.last_page}
                                        onClick={() => setFilters(prev => ({ ...prev, page: pagination.current_page + 1 }))}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left - List Table */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/20">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                            <th className="p-4">Category Info</th>
                                            <th className="p-4">Slug</th>
                                            <th className="p-4 text-center">Products Count</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 text-xs text-slate-350">
                                        {loadingCatalog ? (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-slate-500">
                                                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-indigo-500" />
                                                    <span>Loading categories...</span>
                                                </td>
                                            </tr>
                                        ) : categories.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-slate-500">
                                                    No categories created yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            categories.map((c) => (
                                                <tr key={c.id} className="hover:bg-slate-800/10">
                                                    <td className="p-4">
                                                        <span className="font-semibold text-slate-200 block">{c.name}</span>
                                                        <span className="text-[10px] text-slate-500 mt-0.5 block">{c.description || 'No description'}</span>
                                                    </td>
                                                    <td className="p-4 font-mono text-slate-400 text-[11px]">{c.slug}</td>
                                                    <td className="p-4 text-center">
                                                        <span className="bg-slate-900 text-slate-350 border border-slate-850 px-2.5 py-1 rounded-md text-[10px] font-semibold">
                                                            {c.products_count || 0}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => setCategoryForm(c)}
                                                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-450 hover:text-slate-200 transition-colors"
                                                                title="Edit Category"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategory(c.id)}
                                                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-450 hover:text-rose-450 transition-colors"
                                                                title="Delete Category"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right - Form Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
                                    <FolderPlus className="w-4 h-4 text-indigo-400" />
                                    {categoryForm.id ? 'Edit Category' : 'Create Category'}
                                </h3>
                                {categoryForm.id && (
                                    <button 
                                        onClick={() => { setCategoryForm({ id: null, name: '', slug: '', description: '' }); setFormErrors({}); }}
                                        className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-850 px-2 py-1 rounded"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>
                            <form onSubmit={handleSaveCategory} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Category Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Shirts, Electronics"
                                        value={categoryForm.name}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 transition-colors"
                                    />
                                    {formErrors.name && <span className="text-[10px] text-rose-450 mt-1 block">{formErrors.name[0]}</span>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Slug (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Auto-generated if left empty"
                                        value={categoryForm.slug}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 transition-colors"
                                    />
                                    {formErrors.slug && <span className="text-[10px] text-rose-450 mt-1 block">{formErrors.slug[0]}</span>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Describe the category..."
                                        value={categoryForm.description || ''}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 transition-colors resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submittingForm}
                                    className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-650 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors"
                                >
                                    {submittingForm ? 'Saving...' : (categoryForm.id ? 'Update Category' : 'Create Category')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'brands' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left - List Table */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/20">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                            <th className="p-4">Brand Info</th>
                                            <th className="p-4">Slug</th>
                                            <th className="p-4 text-center">Products Count</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 text-xs text-slate-350">
                                        {loadingCatalog ? (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-slate-500">
                                                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-indigo-500" />
                                                    <span>Loading brands...</span>
                                                </td>
                                            </tr>
                                        ) : brands.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-slate-500">
                                                    No brands created yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            brands.map((b) => (
                                                <tr key={b.id} className="hover:bg-slate-800/10">
                                                    <td className="p-4">
                                                        <span className="font-semibold text-slate-200 block">{b.name}</span>
                                                        <span className="text-[10px] text-slate-500 mt-0.5 block">{b.description || 'No description'}</span>
                                                    </td>
                                                    <td className="p-4 font-mono text-slate-400 text-[11px]">{b.slug}</td>
                                                    <td className="p-4 text-center">
                                                        <span className="bg-slate-900 text-slate-350 border border-slate-850 px-2.5 py-1 rounded-md text-[10px] font-semibold">
                                                            {b.products_count || 0}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => setBrandForm(b)}
                                                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-455 hover:text-slate-200 transition-colors"
                                                                title="Edit Brand"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteBrand(b.id)}
                                                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-455 hover:text-rose-455 transition-colors"
                                                                title="Delete Brand"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right - Form Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
                                    <Layers className="w-4 h-4 text-indigo-400" />
                                    {brandForm.id ? 'Edit Brand' : 'Create Brand'}
                                </h3>
                                {brandForm.id && (
                                    <button 
                                        onClick={() => { setBrandForm({ id: null, name: '', slug: '', description: '' }); setFormErrors({}); }}
                                        className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-850 px-2 py-1 rounded"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>
                            <form onSubmit={handleSaveBrand} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Brand Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Nike, Apple, Samsung"
                                        value={brandForm.name}
                                        onChange={(e) => setBrandForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 transition-colors"
                                    />
                                    {formErrors.name && <span className="text-[10px] text-rose-450 mt-1 block">{formErrors.name[0]}</span>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Slug (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Auto-generated if left empty"
                                        value={brandForm.slug}
                                        onChange={(e) => setBrandForm(prev => ({ ...prev, slug: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 transition-colors"
                                    />
                                    {formErrors.slug && <span className="text-[10px] text-rose-450 mt-1 block">{formErrors.slug[0]}</span>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Describe the brand..."
                                        value={brandForm.description || ''}
                                        onChange={(e) => setBrandForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 transition-colors resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submittingForm}
                                    className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-650 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors"
                                >
                                    {submittingForm ? 'Saving...' : (brandForm.id ? 'Update Brand' : 'Create Brand')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick View Modal */}
            {quickViewProduct && (
                <ProductQuickView
                    product={quickViewProduct}
                    onClose={() => setQuickViewProduct(null)}
                />
            )}

        </div>
    );
}
