import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
    ArrowLeft, Save, Plus, Trash2, Image, Link2, 
    Percent, HelpCircle, AlertCircle, RefreshCw
} from 'lucide-react';

export default function ProductForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    // Loading & Error States
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Dropdown Data Lists
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);

    // Form State
    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        category_id: '',
        brand_id: '',
        image_path: '',
        image_url: '',
        status: 'active',
        has_variations: false,
        cost_price: '',
        selling_price: '',
        tax: '0.00',
        sku: '',
        barcode: '',
        variations: []
    });

    useEffect(() => {
        fetchDropdowns();
        if (isEdit) {
            fetchProduct();
        }
    }, [id]);

    const fetchDropdowns = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                axios.get('/api/categories'),
                axios.get('/api/brands')
            ]);
            setCategories(catRes.data);
            setBrands(brandRes.data);
        } catch (err) {
            console.error('Failed to load catalog options', err);
        }
    };

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/products/${id}`);
            const data = response.data;
            setForm({
                name: data.name || '',
                slug: data.slug || '',
                description: data.description || '',
                category_id: data.category_id || '',
                brand_id: data.brand_id || '',
                image_path: data.image_path || '',
                image_url: data.image_url || '',
                status: data.status || 'active',
                has_variations: data.has_variations,
                cost_price: data.cost_price || '',
                selling_price: data.selling_price || '',
                tax: data.tax || '0.00',
                sku: data.sku || '',
                barcode: data.barcode || '',
                variations: data.variations || []
            });
        } catch (err) {
            console.error('Failed to load product details', err);
            navigate('/products');
        } finally {
            setLoading(false);
        }
    };

    // Calculate Profit Margin
    const calculateMargin = (cost, selling) => {
        const c = parseFloat(cost);
        const s = parseFloat(selling);
        if (isNaN(c) || isNaN(s) || s <= 0) return '0.00';
        return (((s - c) / s) * 100).toFixed(2);
    };

    // Handle inputs
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Handle Auto-Slug
    const handleNameChange = (e) => {
        const value = e.target.value;
        setForm(prev => ({
            ...prev,
            name: value,
            slug: isEdit ? prev.slug : value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        }));
    };

    // Handle Image Upload
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await axios.post('/api/products/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setForm(prev => ({
                ...prev,
                image_path: response.data.path,
                image_url: response.data.url
            }));
        } catch (err) {
            console.error('Image upload failed', err);
            alert('Failed to upload image. Please make sure it is a valid image under 2MB.');
        }
    };

    // Variations array operations
    const handleAddVariation = () => {
        setForm(prev => ({
            ...prev,
            variations: [
                ...prev.variations,
                {
                    size: '',
                    color: '',
                    material: '',
                    sku: '',
                    barcode: '',
                    cost_price: '0.00',
                    selling_price: '0.00'
                }
            ]
        }));
    };

    const handleRemoveVariation = (index) => {
        setForm(prev => ({
            ...prev,
            variations: prev.variations.filter((_, idx) => idx !== index)
        }));
    };

    const handleVariationChange = (index, field, value) => {
        setForm(prev => {
            const updated = [...prev.variations];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, variations: updated };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setSubmitting(true);

        // Pre-clean inputs for single pricing if using variations
        const payload = { ...form };
        if (payload.has_variations) {
            payload.cost_price = null;
            payload.selling_price = null;
            payload.sku = null;
            payload.barcode = null;
        } else {
            payload.variations = [];
        }

        try {
            if (isEdit) {
                await axios.put(`/api/products/${id}`, payload);
            } else {
                await axios.post('/api/products', payload);
            }
            navigate('/products');
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {});
                // Scroll to top or first error
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                console.error('Save error', err);
                alert(err.response?.data?.message || 'An error occurred while saving the product.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
                    <span>Loading product information...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Header / Back */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/products')}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                        {isEdit ? 'Edit Product' : 'Add New Product'}
                    </h1>
                    <p className="text-slate-400 text-xs mt-0.5">
                        {isEdit ? 'Modify product details and stock attributes.' : 'Setup a new item in your inventory.'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Main Details (Colspan 2) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Section: Basic Details */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide border-b border-slate-800 pb-2">
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-450 mb-1.5">Product Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Wireless Charging Dock"
                                        value={form.name}
                                        onChange={handleNameChange}
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 transition-colors"
                                    />
                                    {errors.name && <span className="text-[10px] text-rose-400 mt-1.5 block">{errors.name[0]}</span>}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-455 mb-1.5">Slug URL *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="wireless-charging-dock"
                                        value={form.slug}
                                        onChange={handleChange}
                                        name="slug"
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 transition-colors font-mono"
                                    />
                                    {errors.slug && <span className="text-[10px] text-rose-400 mt-1.5 block">{errors.slug[0]}</span>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-455 mb-1.5">Category</label>
                                    <select
                                        value={form.category_id}
                                        onChange={handleChange}
                                        name="category_id"
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500/80"
                                    >
                                        <option value="" className="bg-slate-900">Uncategorized</option>
                                        {categories.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-455 mb-1.5">Brand</label>
                                    <select
                                        value={form.brand_id}
                                        onChange={handleChange}
                                        name="brand_id"
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500/80"
                                    >
                                        <option value="" className="bg-slate-900">Unbranded</option>
                                        {brands.map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>)}
                                    </select>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-455 mb-1.5">Product Description</label>
                                    <textarea
                                        rows="4"
                                        placeholder="Add descriptive details about the product..."
                                        value={form.description}
                                        onChange={handleChange}
                                        name="description"
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 transition-colors resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Simple Product Pricing & Identifiers (Only if NOT variations) */}
                        {!form.has_variations && (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 animate-fade-in">
                                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide border-b border-slate-800 pb-2">
                                    Pricing & Codes
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-455 mb-1.5">Cost Price *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={form.cost_price}
                                            onChange={handleChange}
                                            name="cost_price"
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80"
                                        />
                                        {errors.cost_price && <span className="text-[10px] text-rose-400 mt-1.5 block">{errors.cost_price[0]}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-455 mb-1.5">Selling Price *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={form.selling_price}
                                            onChange={handleChange}
                                            name="selling_price"
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80"
                                        />
                                        {errors.selling_price && <span className="text-[10px] text-rose-400 mt-1.5 block">{errors.selling_price[0]}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-455 mb-1.5">Tax Rate (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                placeholder="0.00"
                                                value={form.tax}
                                                onChange={handleChange}
                                                name="tax"
                                                className="w-full pl-3.5 pr-8 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500/80"
                                            />
                                            <Percent className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                    </div>
                                    <div className="bg-slate-950/20 border border-slate-850 p-2.5 rounded-lg flex flex-col justify-center">
                                        <span className="text-[10px] text-slate-450 font-semibold uppercase block">Profit Margin</span>
                                        <span className="text-base font-bold text-indigo-400">
                                            {calculateMargin(form.cost_price, form.selling_price)}%
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-455 mb-1.5">SKU (Stock Keeping Unit)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. WH-CHG-DOCK-BLK"
                                            value={form.sku || ''}
                                            onChange={handleChange}
                                            name="sku"
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80"
                                        />
                                        {errors.sku && <span className="text-[10px] text-rose-400 mt-1.5 block">{errors.sku[0]}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-455 mb-1.5">Barcode (UPC/EAN)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 190199220021"
                                            value={form.barcode || ''}
                                            onChange={handleChange}
                                            name="barcode"
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80"
                                        />
                                        {errors.barcode && <span className="text-[10px] text-rose-400 mt-1.5 block">{errors.barcode[0]}</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Section: Product Variations Builder (Only if variations toggled) */}
                        {form.has_variations && (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 animate-fade-in">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                                        Variations Setup
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleAddVariation}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20 rounded-lg transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Variation Row
                                    </button>
                                </div>

                                {form.variations.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 bg-slate-950/20 rounded-xl border border-dashed border-slate-850">
                                        <AlertCircle className="w-8 h-8 text-slate-750 mx-auto mb-2" />
                                        <p className="text-xs">No variations added yet. Click "Add Variation Row" to get started.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {errors.variations && (
                                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs rounded-lg flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Please check variation inputs. All variations require a unique SKU, cost price, and selling price.</span>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {form.variations.map((v, idx) => {
                                                const marginVal = calculateMargin(v.cost_price, v.selling_price);
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-8 gap-2 p-3 bg-slate-950/20 border border-slate-800 rounded-xl relative hover:border-slate-750 transition-colors"
                                                    >
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 font-semibold uppercase block sm:hidden mb-1">Size</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Size"
                                                                value={v.size || ''}
                                                                onChange={(e) => handleVariationChange(idx, 'size', e.target.value)}
                                                                className="w-full px-2 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded text-slate-200 placeholder-slate-650 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 font-semibold uppercase block sm:hidden mb-1">Color</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Color"
                                                                value={v.color || ''}
                                                                onChange={(e) => handleVariationChange(idx, 'color', e.target.value)}
                                                                className="w-full px-2 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded text-slate-200 placeholder-slate-650 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 font-semibold uppercase block sm:hidden mb-1">Material</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Material"
                                                                value={v.material || ''}
                                                                onChange={(e) => handleVariationChange(idx, 'material', e.target.value)}
                                                                className="w-full px-2 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded text-slate-200 placeholder-slate-650 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="text-[10px] text-slate-500 font-semibold uppercase block sm:hidden mb-1">SKU *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="SKU"
                                                                value={v.sku || ''}
                                                                onChange={(e) => handleVariationChange(idx, 'sku', e.target.value)}
                                                                className="w-full px-2 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded text-slate-200 placeholder-slate-650 focus:outline-none font-mono"
                                                            />
                                                            {errors[`variations.${idx}.sku`] && (
                                                                <span className="text-[9px] text-rose-400 mt-1 block">Taken</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 font-semibold uppercase block sm:hidden mb-1">Cost *</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                required
                                                                placeholder="Cost"
                                                                value={v.cost_price}
                                                                onChange={(e) => handleVariationChange(idx, 'cost_price', e.target.value)}
                                                                className="w-full px-2 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded text-slate-200 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 font-semibold uppercase block sm:hidden mb-1">Selling *</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                required
                                                                placeholder="Selling"
                                                                value={v.selling_price}
                                                                onChange={(e) => handleVariationChange(idx, 'selling_price', e.target.value)}
                                                                className="w-full px-2 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded text-slate-200 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between col-span-full md:col-auto mt-2 md:mt-0 md:justify-end gap-2">
                                                            <div className="bg-slate-900 border border-slate-800/80 px-2 py-1 rounded flex items-center md:hidden lg:flex">
                                                                <span className="text-[10px] text-indigo-400 font-semibold">{marginVal}%</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveVariation(idx)}
                                                                className="p-1 rounded bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-455 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar controls (Status, Image, Variations toggle) */}
                    <div className="space-y-6">
                        
                        {/* Section: Status & Save */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide border-b border-slate-800 pb-2">
                                Status & Actions
                            </h3>
                            <div>
                                <label className="block text-xs font-semibold text-slate-455 mb-1.5">Visibility Status</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, status: 'active' }))}
                                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                                            form.status === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                : 'bg-slate-950/40 text-slate-500 border-slate-800/60 hover:text-slate-400'
                                        }`}
                                    >
                                        Active
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, status: 'inactive' }))}
                                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                                            form.status === 'inactive'
                                                ? 'bg-rose-500/10 text-rose-455 border-rose-500/30'
                                                : 'bg-slate-950/40 text-slate-500 border-slate-800/60 hover:text-slate-400'
                                        }`}
                                    >
                                        Inactive
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/15 transition-all"
                                >
                                    <Save className="w-4 h-4" />
                                    {submitting ? 'Saving Product...' : 'Save Product Details'}
                                </button>
                            </div>
                        </div>

                        {/* Section: Image Upload */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide border-b border-slate-800 pb-2">
                                Product Image
                            </h3>
                            
                            <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden group">
                                {form.image_url ? (
                                    <>
                                        <img 
                                            src={form.image_url} 
                                            alt="Preview" 
                                            className="max-w-full max-h-[140px] object-contain rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, image_path: '', image_url: '' }))}
                                            className="absolute top-2 right-2 p-1 bg-slate-900/80 hover:bg-rose-950/80 border border-slate-800 rounded-lg text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center space-y-2 text-slate-500">
                                        <Image className="w-10 h-10 mx-auto text-slate-700" />
                                        <p className="text-[10px]">JPEG, PNG, WEBP max 2MB</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block w-full text-center py-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg cursor-pointer transition-all">
                                    Browse Image File
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageUpload} 
                                        className="hidden" 
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Section: Attributes/Variations Toggle */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide border-b border-slate-800 pb-2">
                                Product Variations
                            </h3>
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="has_variations"
                                    name="has_variations"
                                    checked={form.has_variations}
                                    onChange={handleChange}
                                    className="mt-1 rounded border-slate-800 text-indigo-650 bg-slate-950/40 focus:ring-indigo-500"
                                />
                                <div className="space-y-1">
                                    <label htmlFor="has_variations" className="block text-xs font-semibold text-slate-300 cursor-pointer select-none">
                                        Has Multiple Variations
                                    </label>
                                    <p className="text-[10px] text-slate-500 leading-normal">
                                        Check this if the product has multiple variations in size, color, or material (e.g. shoes, shirts).
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </form>

        </div>
    );
}
