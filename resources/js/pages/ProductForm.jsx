import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
    ArrowLeft, Save, Plus, Trash2, Image, Link2, 
    Percent, HelpCircle, AlertCircle, RefreshCw, Sparkles, X, Eye, Layers, Settings
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

    // Attributes State for Variation Builder
    const [attributes, setAttributes] = useState([
        { id: 'size', name: 'Size', inputVal: '', values: [] },
        { id: 'color', name: 'Color', inputVal: '', values: [] },
        { id: 'material', name: 'Material', inputVal: '', values: [] }
    ]);

    // Bulk actions form states
    const [bulkCost, setBulkCost] = useState('');
    const [bulkSelling, setBulkSelling] = useState('');
    const [bulkSkuPrefix, setBulkSkuPrefix] = useState('');
    const [selectedVarIndices, setSelectedVarIndices] = useState([]);
    const [selectedBulkAction, setSelectedBulkAction] = useState('');
    const [selectedBulkValue, setSelectedBulkValue] = useState('');

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

            if (data.variations && data.variations.length > 0) {
                const sizes = [...new Set(data.variations.map(v => v.size).filter(Boolean))];
                const colors = [...new Set(data.variations.map(v => v.color).filter(Boolean))];
                const materials = [...new Set(data.variations.map(v => v.material).filter(Boolean))];
                
                setAttributes([
                    { id: 'size', name: 'Size', inputVal: '', values: sizes },
                    { id: 'color', name: 'Color', inputVal: '', values: colors },
                    { id: 'material', name: 'Material', inputVal: '', values: materials }
                ]);
            }
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
        setSelectedVarIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
    };

    const handleApplySelectedBulkAction = () => {
        if (!selectedBulkAction) return;

        const indicesSet = new Set(selectedVarIndices);

        if (selectedBulkAction === 'delete') {
            if (confirm(`Are you sure you want to delete ${selectedVarIndices.length} variations?`)) {
                setForm(prev => ({
                    ...prev,
                    variations: prev.variations.filter((_, idx) => !indicesSet.has(idx))
                }));
                setSelectedVarIndices([]);
            }
            return;
        }

        const val = parseFloat(selectedBulkValue);
        if (isNaN(val) && ['set_cost', 'set_selling', 'markup_selling', 'adjust_cost', 'adjust_selling'].includes(selectedBulkAction)) return;

        setForm(prev => {
            const updated = prev.variations.map((v, idx) => {
                if (!indicesSet.has(idx)) return v;

                let cost = parseFloat(v.cost_price) || 0;
                let selling = parseFloat(v.selling_price) || 0;

                if (selectedBulkAction === 'set_cost') {
                    cost = val;
                } else if (selectedBulkAction === 'set_selling') {
                    selling = val;
                } else if (selectedBulkAction === 'markup_selling') {
                    selling = cost * (1 + val / 100);
                } else if (selectedBulkAction === 'adjust_cost') {
                    cost = cost * (1 + val / 100);
                } else if (selectedBulkAction === 'adjust_selling') {
                    selling = selling * (1 + val / 100);
                }

                return {
                    ...v,
                    cost_price: cost.toFixed(2),
                    selling_price: selling.toFixed(2)
                };
            });

            return { ...prev, variations: updated };
        });

        setSelectedBulkValue('');
        setSelectedBulkAction('');
        setSelectedVarIndices([]);
    };

    const handleVariationChange = (index, field, value) => {
        setForm(prev => {
            const updated = [...prev.variations];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, variations: updated };
        });
    };

    // Helper to add attribute values
    const handleAddAttributeVal = (attrId, val) => {
        const cleaned = val.trim();
        if (!cleaned) return;
        
        setAttributes(prev => prev.map(attr => {
            if (attr.id === attrId) {
                if (attr.values.includes(cleaned)) {
                    return { ...attr, inputVal: '' };
                }
                return {
                    ...attr,
                    values: [...attr.values, cleaned],
                    inputVal: ''
                };
            }
            return attr;
        }));
    };

    // Helper to remove attribute values
    const handleRemoveAttributeVal = (attrId, valToRemove) => {
        setAttributes(prev => prev.map(attr => {
            if (attr.id === attrId) {
                return {
                    ...attr,
                    values: attr.values.filter(v => v !== valToRemove)
                };
            }
            return attr;
        }));
    };

    // Helper to update attribute input val
    const handleAttributeInputValChange = (attrId, val) => {
        setAttributes(prev => prev.map(attr => {
            if (attr.id === attrId) {
                return { ...attr, inputVal: val };
            }
            return attr;
        }));
    };

    // Cartesian product generator
    const handleGenerateVariations = (mode = 'overwrite') => {
        const activeAttrs = attributes.filter(a => a.values.length > 0);
        if (activeAttrs.length === 0) {
            alert('Please add some options/tags to at least one attribute first.');
            return;
        }

        // Generate combinations
        let combos = [{}];
        activeAttrs.forEach(attr => {
            const nextCombos = [];
            combos.forEach(combo => {
                attr.values.forEach(val => {
                    nextCombos.push({
                        ...combo,
                        [attr.id]: val
                    });
                });
            });
            combos = nextCombos;
        });

        // Map combinations to variations objects
        const baseSku = form.sku || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const generated = combos.map(combo => {
            const parts = [baseSku];
            if (combo.size) parts.push(combo.size.toLowerCase());
            if (combo.color) parts.push(combo.color.toLowerCase());
            if (combo.material) parts.push(combo.material.toLowerCase());
            const varSku = parts.join('-').toUpperCase();

            return {
                size: combo.size || '',
                color: combo.color || '',
                material: combo.material || '',
                sku: varSku,
                barcode: '',
                cost_price: form.cost_price || '0.00',
                selling_price: form.selling_price || '0.00'
            };
        });

        setForm(prev => {
            if (mode === 'overwrite') {
                return { ...prev, variations: generated };
            } else {
                // merge unique by combination of size, color, material
                const existing = [...prev.variations];
                const keyOf = (v) => `${v.size || ''}-${v.color || ''}-${v.material || ''}`;
                const existingKeys = new Set(existing.map(keyOf));
                
                const toAppend = generated.filter(v => !existingKeys.has(keyOf(v)));
                return { ...prev, variations: [...existing, ...toAppend] };
            }
        });
        setSelectedVarIndices([]);
    };

    const applyBulkCost = () => {
        if (!bulkCost) return;
        setForm(prev => ({
            ...prev,
            variations: prev.variations.map(v => ({ ...v, cost_price: parseFloat(bulkCost).toFixed(2) }))
        }));
        setBulkCost('');
    };

    const applyBulkSelling = () => {
        if (!bulkSelling) return;
        setForm(prev => ({
            ...prev,
            variations: prev.variations.map(v => ({ ...v, selling_price: parseFloat(bulkSelling).toFixed(2) }))
        }));
        setBulkSelling('');
    };

    const applyBulkSkuPrefix = () => {
        if (!bulkSkuPrefix) return;
        setForm(prev => ({
            ...prev,
            variations: prev.variations.map(v => {
                const suffixParts = [];
                if (v.size) suffixParts.push(v.size.toLowerCase());
                if (v.color) suffixParts.push(v.color.toLowerCase());
                if (v.material) suffixParts.push(v.material.toLowerCase());
                const suffix = suffixParts.join('-');
                
                const newSku = suffix 
                    ? `${bulkSkuPrefix.trim()}-${suffix}`.toUpperCase()
                    : bulkSkuPrefix.trim().toUpperCase();

                return { ...v, sku: newSku };
            })
        }));
        setBulkSkuPrefix('');
    };

    const handleClearVariations = () => {
        if (confirm('Are you sure you want to clear all variations?')) {
            setForm(prev => ({ ...prev, variations: [] }));
            setSelectedVarIndices([]);
        }
    };

    const getVariationStats = () => {
        if (!form.variations || form.variations.length === 0) {
            return {
                priceRange: 'N/A',
                costRange: 'N/A',
                avgMargin: '0.00',
                minTaxAmount: '0.00',
                maxTaxAmount: '0.00',
                hasMultiple: false
            };
        }

        const costs = form.variations.map(v => parseFloat(v.cost_price)).filter(val => !isNaN(val));
        const sellings = form.variations.map(v => parseFloat(v.selling_price)).filter(val => !isNaN(val));

        if (sellings.length === 0) {
            return {
                priceRange: 'N/A',
                costRange: 'N/A',
                avgMargin: '0.00',
                minTaxAmount: '0.00',
                maxTaxAmount: '0.00',
                hasMultiple: false
            };
        }

        const minPrice = Math.min(...sellings);
        const maxPrice = Math.max(...sellings);
        const minCost = costs.length > 0 ? Math.min(...costs) : 0;
        const maxCost = costs.length > 0 ? Math.max(...costs) : 0;

        const priceRange = minPrice === maxPrice 
            ? `$${minPrice.toFixed(2)}` 
            : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;

        const costRange = minCost === maxCost 
            ? `$${minCost.toFixed(2)}` 
            : `$${minCost.toFixed(2)} - $${maxCost.toFixed(2)}`;

        let totalMargin = 0;
        let count = 0;
        form.variations.forEach(v => {
            const c = parseFloat(v.cost_price);
            const s = parseFloat(v.selling_price);
            if (!isNaN(c) && !isNaN(s) && s > 0) {
                totalMargin += ((s - c) / s) * 100;
                count++;
            }
        });
        const avgMargin = count > 0 ? (totalMargin / count).toFixed(2) : '0.00';

        const taxRate = parseFloat(form.tax) || 0;
        const minTaxAmount = (minPrice * (taxRate / 100)).toFixed(2);
        const maxTaxAmount = (maxPrice * (taxRate / 100)).toFixed(2);

        return {
            priceRange,
            costRange,
            avgMargin,
            minTaxAmount,
            maxTaxAmount,
            hasMultiple: minPrice !== maxPrice || minCost !== maxCost
        };
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

    const stats = getVariationStats();

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
                                <Layers className="w-4 h-4 text-indigo-405 mr-2 inline-block align-text-bottom" /> Basic Information
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
                                    <Percent className="w-4 h-4 text-indigo-405 mr-2 inline-block align-text-bottom" /> Pricing & Codes
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

                        {/* Section: Variation Pricing & Financials (Only if variations toggled) */}
                        {form.has_variations && (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6 animate-fade-in">
                                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide border-b border-slate-800 pb-2">
                                    Variation Pricing & Financials
                                </h3>
                                
                                {/* Row 1: Default Pricing Setup */}
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Default Pricing Setup</h4>
                                        <p className="text-[10px] text-slate-505 mt-0.5">Define fallback prices and tax rate inherited when generating or creating new variations.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Default Cost Price</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={form.cost_price}
                                                onChange={handleChange}
                                                name="cost_price"
                                                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Default Selling Price</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={form.selling_price}
                                                onChange={handleChange}
                                                name="selling_price"
                                                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tax Rate (%)</label>
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
                                                    className="w-full pl-3.5 pr-8 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                                                />
                                                <Percent className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg flex flex-col justify-center">
                                            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Default Profit Margin</span>
                                            <span className="text-sm font-bold text-indigo-400 font-mono">
                                                {calculateMargin(form.cost_price, form.selling_price)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Financial Metrics Summary */}
                                {form.variations.length > 0 && (
                                    <div className="space-y-3 pt-2 border-t border-slate-800/60">
                                        <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Live Financial Summary</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-3.5">
                                                <span className="text-[11px] text-slate-405 font-medium block mb-1">Selling Price Range</span>
                                                <span className="text-base font-bold text-slate-100">{stats.priceRange}</span>
                                            </div>
                                            <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-3.5">
                                                <span className="text-[11px] text-slate-405 font-medium block mb-1">Cost Price Range</span>
                                                <span className="text-base font-bold text-slate-100">{stats.costRange}</span>
                                            </div>
                                            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3.5">
                                                <span className="text-[11px] text-indigo-400 font-semibold block mb-1">Average Profit Margin</span>
                                                <span className="text-base font-bold text-indigo-300">{stats.avgMargin}%</span>
                                            </div>
                                            <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-3.5">
                                                <span className="text-[11px] text-slate-405 font-medium block mb-1">Calculated Tax Amount</span>
                                                <span className="text-base font-bold text-slate-100">
                                                    {stats.hasMultiple 
                                                        ? `$${stats.minTaxAmount} - $${stats.maxTaxAmount}` 
                                                        : `$${stats.minTaxAmount}`}
                                                </span>
                                                <span className="text-[9px] text-slate-500 block mt-0.5">Based on {form.tax}% Tax Rate</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Section: Product Variations Builder (Only if variations toggled) */}
                        {form.has_variations && (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6 animate-fade-in">
                                
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                                            Variations Builder
                                        </h3>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            Define attributes to automatically generate combinations.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearVariations}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 rounded-lg transition-colors"
                                    >
                                        Clear All
                                    </button>
                                </div>

                                {/* 1. Attribute Pills Creator */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                                    {attributes.map(attr => (
                                        <div key={attr.id} className="space-y-2">
                                            <label className="block text-xs font-semibold text-slate-400">
                                                {attr.name} Values
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder={`e.g. ${attr.id === 'size' ? 'S, M, L' : attr.id === 'color' ? 'Black, White' : 'Cotton, Silk'}`}
                                                    value={attr.inputVal}
                                                    onChange={(e) => handleAttributeInputValChange(attr.id, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ',') {
                                                            e.preventDefault();
                                                            handleAddAttributeVal(attr.id, attr.inputVal);
                                                        }
                                                    }}
                                                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddAttributeVal(attr.id, attr.inputVal)}
                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-750 transition-colors"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            {/* Tags Container */}
                                            <div className="flex flex-wrap gap-1.5 min-h-[28px] pt-1">
                                                {attr.values.map(val => (
                                                    <span 
                                                        key={val} 
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold animate-fade-in"
                                                    >
                                                        {val}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAttributeVal(attr.id, val)}
                                                            className="hover:text-rose-400 transition-colors"
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </span>
                                                ))}
                                                {attr.values.length === 0 && (
                                                    <span className="text-[10px] text-slate-650 italic pt-1">No {attr.name.toLowerCase()} tags added</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Generate / Action Buttons */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateVariations('overwrite')}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-650/15 transition-all"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Generate (Overwrite)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateVariations('append')}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-250 text-xs font-semibold border border-slate-700 rounded-xl transition-all"
                                    >
                                        Generate (Append)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddVariation}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-905 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 hover:border-slate-750 rounded-xl transition-all md:ml-auto"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Manually Add Row
                                    </button>
                                </div>

                                {/* 2. Bulk Actions Bar */}
                                {form.variations.length > 0 && (
                                    <div className="p-4 bg-indigo-950/10 border border-indigo-500/10 rounded-xl space-y-3">
                                        <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
                                            Bulk Editing Tools
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Set Cost Price"
                                                    value={bulkCost}
                                                    onChange={(e) => setBulkCost(e.target.value)}
                                                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950/60 border border-slate-850 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={applyBulkCost}
                                                    className="px-3 py-1.5 bg-indigo-505/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20 rounded-lg transition-colors"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Set Selling Price"
                                                    value={bulkSelling}
                                                    onChange={(e) => setBulkSelling(e.target.value)}
                                                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950/60 border border-slate-855 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={applyBulkSelling}
                                                    className="px-3 py-1.5 bg-indigo-505/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20 rounded-lg transition-colors"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Base SKU Prefix"
                                                    value={bulkSkuPrefix}
                                                    onChange={(e) => setBulkSkuPrefix(e.target.value)}
                                                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950/60 border border-slate-855 rounded-lg text-slate-205 placeholder-slate-600 focus:outline-none font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={applyBulkSkuPrefix}
                                                    className="px-3 py-1.5 bg-indigo-505/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20 rounded-lg transition-colors"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 3. Redesigned Variations Grid/Table */}
                                {form.variations.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 bg-slate-950/20 rounded-xl border border-dashed border-slate-850">
                                        <AlertCircle className="w-10 h-10 text-slate-750 mx-auto mb-2" />
                                        <p className="text-xs font-medium">No variations configured yet.</p>
                                        <p className="text-[10px] text-slate-650 mt-1">Use the builder above to auto-generate or click "Manually Add Row" to define items.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {errors.variations && (
                                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs rounded-lg flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Please check variation inputs. All variations require a unique SKU, cost price, and selling price.</span>
                                            </div>
                                        )}

                                        {/* Selected Variations Bulk Actions Bar */}
                                        {selectedVarIndices.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-3 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl animate-fade-in">
                                                <span className="text-xs text-indigo-350 font-semibold pl-1">
                                                    {selectedVarIndices.length} variations selected
                                                </span>
                                                <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
                                                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                                                    <select
                                                        value={selectedBulkAction}
                                                        onChange={(e) => {
                                                            setSelectedBulkAction(e.target.value);
                                                            setSelectedBulkValue('');
                                                        }}
                                                        className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="">Choose bulk action...</option>
                                                        <option value="delete">Delete Selected</option>
                                                        <option value="set_cost">Set Cost Price</option>
                                                        <option value="set_selling">Set Selling Price</option>
                                                        <option value="markup_selling">Markup Selling Price (% above Cost)</option>
                                                        <option value="adjust_cost">Adjust Cost Price (%)</option>
                                                        <option value="adjust_selling">Adjust Selling Price (%)</option>
                                                    </select>
                                                    
                                                    {/* Show value input if action requires it */}
                                                    {['set_cost', 'set_selling', 'markup_selling', 'adjust_cost', 'adjust_selling'].includes(selectedBulkAction) && (
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            placeholder={selectedBulkAction.startsWith('adjust') || selectedBulkAction.includes('markup') ? "Percentage (e.g. 10)" : "0.00"}
                                                            value={selectedBulkValue}
                                                            onChange={(e) => setSelectedBulkValue(e.target.value)}
                                                            className="w-32 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500"
                                                        />
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={handleApplySelectedBulkAction}
                                                        disabled={!selectedBulkAction || (['set_cost', 'set_selling', 'markup_selling', 'adjust_cost', 'adjust_selling'].includes(selectedBulkAction) && !selectedBulkValue)}
                                                        className="px-3 py-1.5 bg-indigo-605 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-605 text-white text-xs font-semibold rounded-lg transition-colors"
                                                    >
                                                        Apply
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedVarIndices([])}
                                                        className="text-[11px] text-slate-500 hover:text-slate-350 ml-auto transition-colors font-medium"
                                                    >
                                                        Clear Selection
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/10">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse table-auto min-w-[750px]">
                                                    <thead>
                                                        <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                            <th className="p-3 w-[4%] text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={form.variations.length > 0 && selectedVarIndices.length === form.variations.length}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedVarIndices(form.variations.map((_, i) => i));
                                                                        } else {
                                                                            setSelectedVarIndices([]);
                                                                        }
                                                                    }}
                                                                    className="rounded border-slate-800 text-indigo-650 bg-slate-950/40 focus:ring-indigo-500"
                                                                />
                                                            </th>
                                                            <th className="p-3 w-[11%]">Size</th>
                                                            <th className="p-3 w-[11%]">Color</th>
                                                            <th className="p-3 w-[11%]">Material</th>
                                                            <th className="p-3 w-[20%]">SKU *</th>
                                                            <th className="p-3 w-[16%]">Barcode</th>
                                                            <th className="p-3 w-[10%]">Cost *</th>
                                                            <th className="p-3 w-[10%]">Selling *</th>
                                                            <th className="p-3 w-[8%] text-center">Margin</th>
                                                            <th className="p-3 w-[6%] text-center"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/60 text-xs text-slate-350">
                                                        {form.variations.map((v, idx) => {
                                                            const marginVal = calculateMargin(v.cost_price, v.selling_price);
                                                            const isRowSelected = selectedVarIndices.includes(idx);
                                                            return (
                                                                <tr key={idx} className={`${isRowSelected ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-slate-800/10'} transition-colors`}>
                                                                    <td className="p-2.5 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isRowSelected}
                                                                            onChange={() => {
                                                                                setSelectedVarIndices(prev => 
                                                                                    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                                                                );
                                                                            }}
                                                                            className="rounded border-slate-800 text-indigo-650 bg-slate-950/40 focus:ring-indigo-500"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Size"
                                                                            value={v.size || ''}
                                                                            onChange={(e) => handleVariationChange(idx, 'size', e.target.value)}
                                                                            className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-850 rounded text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/60"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Color"
                                                                            value={v.color || ''}
                                                                            onChange={(e) => handleVariationChange(idx, 'color', e.target.value)}
                                                                            className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-850 rounded text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/60"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Material"
                                                                            value={v.material || ''}
                                                                            onChange={(e) => handleVariationChange(idx, 'material', e.target.value)}
                                                                            className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-850 rounded text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/60"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <input
                                                                            type="text"
                                                                            required
                                                                            placeholder="SKU"
                                                                            value={v.sku || ''}
                                                                            onChange={(e) => handleVariationChange(idx, 'sku', e.target.value)}
                                                                            className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-850 rounded text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/60 font-mono"
                                                                        />
                                                                        {errors[`variations.${idx}.sku`] && (
                                                                            <span className="text-[9px] text-rose-400 mt-1 block">Taken</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Barcode"
                                                                            value={v.barcode || ''}
                                                                            onChange={(e) => handleVariationChange(idx, 'barcode', e.target.value)}
                                                                            className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-850 rounded text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500/60 font-mono"
                                                                        />
                                                                        {errors[`variations.${idx}.barcode`] && (
                                                                            <span className="text-[9px] text-rose-400 mt-1 block">Taken</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            required
                                                                            placeholder="0.00"
                                                                            value={v.cost_price}
                                                                            onChange={(e) => handleVariationChange(idx, 'cost_price', e.target.value)}
                                                                            className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-855 rounded text-slate-200 focus:outline-none focus:border-indigo-500/60"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            required
                                                                            placeholder="0.00"
                                                                            value={v.selling_price}
                                                                            onChange={(e) => handleVariationChange(idx, 'selling_price', e.target.value)}
                                                                            className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-855 rounded text-slate-200 focus:outline-none focus:border-indigo-500/60"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5 text-center">
                                                                        <span className="inline-block bg-slate-900 border border-slate-800/80 px-2 py-0.5 rounded text-[10px] text-indigo-405 font-semibold">
                                                                            {marginVal}%
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-2.5 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveVariation(idx)}
                                                                            className="p-1.5 rounded bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-455 transition-colors"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
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
                                <Eye className="w-4 h-4 text-indigo-405 mr-2 inline-block align-text-bottom" /> Status & Actions
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
                                <Image className="w-4 h-4 text-indigo-405 mr-2 inline-block align-text-bottom" /> Product Image
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
                                <Settings className="w-4 h-4 text-indigo-405 mr-2 inline-block align-text-bottom" /> Product Variations
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
