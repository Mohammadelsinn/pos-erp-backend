import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import { Input, Textarea, Select } from '../components/FormControls';
import { 
    Search, ShoppingCart, Trash2, Tag, Percent, 
    CreditCard, DollarSign, Wallet, FileText, CheckCircle2, 
    ChevronRight, Construction, AlertCircle, Eye, Printer, 
    Plus, Minus, RefreshCw, Layers, Archive, History, Bookmark, User
} from 'lucide-react';
import StockStatusBadge from '../components/StockStatusBadge';

const MOCK_CUSTOMERS = [
    { id: 2, name: 'John Doe', email: 'john@example.com', phone: '+123456789' },
    { id: 3, name: 'Jane Smith', email: 'jane@example.com', phone: '+987654321' },
    { id: 4, name: 'Alice Johnson', email: 'alice@example.com', phone: '+112233445' }
];

export default function POS() {
    const { activeBranch } = useAuth();
    
    // Branch state
    const [branchesList, setBranchesList] = useState([]);
    const [resolvedBranchId, setResolvedBranchId] = useState(null);

    // Products and categories state
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    
    // Cart state
    const [cart, setCart] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [resumedSaleId, setResumedSaleId] = useState(null);
    const [cartDiscount, setCartDiscount] = useState(0); // flat discount amount or percentage
    const [cartDiscountType, setCartDiscountType] = useState('flat'); // 'flat' or 'percent'
    const [cartNotes, setCartNotes] = useState('');
    
    // Held carts state
    const [heldCarts, setHeldCarts] = useState([]);
    const [showHeldCartsModal, setShowHeldCartsModal] = useState(false);

    // Variation selector state
    const [selectedProductForVariation, setSelectedProductForVariation] = useState(null);

    // Checkout modal state
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountTendered, setAmountTendered] = useState('');
    const [processingCheckout, setProcessingCheckout] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState(null);

    // Fetch branches and resolve active branch ID
    useEffect(() => {
        axios.get('/api/branches')
            .then(res => {
                setBranchesList(res.data);
                const matched = res.data.find(b => b.name === activeBranch);
                if (matched) {
                    setResolvedBranchId(matched.id);
                }
            })
            .catch(err => {
                console.error("Failed to load branches in POS:", err);
            });
    }, [activeBranch]);

    // Load categories
    useEffect(() => {
        setLoadingCategories(true);
        axios.get('/api/categories')
            .then(res => {
                setCategories(res.data);
            })
            .catch(err => {
                console.error("Failed to load categories:", err);
            })
            .finally(() => {
                setLoadingCategories(false);
            });
    }, []);

    // Load products when branch or filters change
    useEffect(() => {
        if (!resolvedBranchId) return;

        setLoadingProducts(true);
        const params = {
            branch_id: resolvedBranchId,
            limit: 100
        };

        if (selectedCategoryId) {
            params.category_id = selectedCategoryId;
        }

        if (searchQuery) {
            params.search = searchQuery;
        }

        axios.get('/api/pos/products', { params })
            .then(res => {
                setProducts(res.data.data || []);
            })
            .catch(err => {
                console.error("Failed to load POS products:", err);
            })
            .finally(() => {
                setLoadingProducts(false);
            });
    }, [resolvedBranchId, selectedCategoryId, searchQuery]);

    const fetchHeldSales = () => {
        if (!resolvedBranchId) return;
        axios.get(`/api/pos/held-sales?branch_id=${resolvedBranchId}`)
            .then(res => {
                const mapped = res.data.data.map(sale => ({
                    id: sale.id,
                    reference: sale.notes || `Suspended Order #${sale.id}`,
                    branchName: activeBranch,
                    branchId: sale.branch_id,
                    timestamp: new Date(sale.updated_at).toLocaleString(),
                    total: Number(sale.total_amount) || 0,
                    notes: sale.notes || '',
                    discount: Number(sale.discount_amount) || 0,
                    discountType: 'flat',
                    items: sale.items.map(item => ({
                        cartId: item.product_variation_id ? `var-${item.product_variation_id}` : `prod-${item.product_id}`,
                        product_id: item.product_id,
                        product_variation_id: item.product_variation_id,
                        name: item.product?.name || 'Product',
                        unit_price: Number(item.unit_price) || 0,
                        quantity: item.quantity,
                        discount_amount: Number(item.discount_amount) || 0,
                        tax: Number(item.product?.tax_percentage) || 0,
                        image_url: item.product?.image_url || ''
                    }))
                }));
                setHeldCarts(mapped);
            })
            .catch(err => {
                console.error("Error fetching held sales:", err);
            });
    };

    // Load held carts on branch resolution
    useEffect(() => {
        fetchHeldSales();
    }, [resolvedBranchId]);

    // Calculate cart values
    const getCartSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    };

    const getCartItemDiscountTotal = () => {
        return cart.reduce((sum, item) => sum + ((item.discount_amount || 0) * item.quantity), 0);
    };

    const getCartTax = () => {
        return cart.reduce((sum, item) => {
            const itemTotal = item.unit_price * item.quantity;
            // Subtract item discount proportion first
            const itemDiscount = (item.discount_amount || 0) * item.quantity;
            const netAmount = Math.max(0, itemTotal - itemDiscount);
            const taxPercentage = item.tax || 0;
            return sum + (netAmount * (taxPercentage / 100));
        }, 0);
    };

    const getCartOrderDiscountAmount = () => {
        const subtotal = getCartSubtotal();
        const itemDiscount = getCartItemDiscountTotal();
        const discountVal = Number(cartDiscount) || 0;
        
        if (cartDiscountType === 'percent') {
            const netBeforeOrderDiscount = Math.max(0, subtotal - itemDiscount);
            return netBeforeOrderDiscount * (discountVal / 100);
        }
        return discountVal;
    };

    const getCartTotal = () => {
        const subtotal = getCartSubtotal();
        const itemDiscount = getCartItemDiscountTotal();
        const tax = getCartTax();
        const orderDiscount = getCartOrderDiscountAmount();
        return Math.max(0, subtotal - itemDiscount + tax - orderDiscount);
    };

    // Add product or variation to cart
    const handleAddProductToCart = (product, variation = null) => {
        // If product has variations and none selected, open variation selector modal
        if (product.has_variations && !variation) {
            setSelectedProductForVariation(product);
            return;
        }

        const cartItemId = variation ? `var-${variation.id}` : `prod-${product.id}`;
        const existingItem = cart.find(item => item.cartId === cartItemId);

        // Check stock availability
        const currentStock = variation ? variation.stock_quantity : product.stock_quantity;
        const currentQtyInCart = existingItem ? existingItem.quantity : 0;

        if (currentStock <= currentQtyInCart) {
            alert(`Cannot add more. Stock limit reached (${currentStock} items available).`);
            return;
        }

        if (existingItem) {
            setCart(cart.map(item => 
                item.cartId === cartItemId 
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            const newItem = {
                cartId: cartItemId,
                product_id: product.id,
                product_variation_id: variation ? variation.id : null,
                name: product.name,
                variationName: variation ? `${variation.size ? 'Size: ' + variation.size : ''} ${variation.color ? 'Color: ' + variation.color : ''}`.trim() : null,
                variationDetails: variation ? variation : null,
                unit_price: variation ? Number(variation.selling_price) : Number(product.selling_price),
                tax: variation ? Number(variation.tax || 0) : Number(product.tax || 0),
                quantity: 1,
                discount_amount: 0, // item level discount
                image_url: product.image
            };
            
            // Format a clean label for the variation details
            if (variation) {
                const attrs = [
                    variation.size && `Sz: ${variation.size}`,
                    variation.color && `Col: ${variation.color}`,
                    variation.material && `Mat: ${variation.material}`
                ].filter(Boolean).join(', ');
                newItem.variationName = attrs || 'Default';
            }

            setCart([...cart, newItem]);
        }

        if (selectedProductForVariation) {
            setSelectedProductForVariation(null);
        }
    };

    // Quantity adjuster
    const handleUpdateQuantity = (cartId, delta) => {
        const item = cart.find(i => i.cartId === cartId);
        if (!item) return;

        const newQty = item.quantity + delta;
        if (newQty <= 0) {
            setCart(cart.filter(i => i.cartId !== cartId));
            return;
        }

        // Check stock limit
        const stockAvailable = item.variationDetails 
            ? item.variationDetails.stock_quantity 
            : products.find(p => p.id === item.product_id)?.stock_quantity || 9999;

        if (newQty > stockAvailable) {
            alert(`Stock limit reached. Only ${stockAvailable} items available.`);
            return;
        }

        setCart(cart.map(i => 
            i.cartId === cartId 
                ? { ...i, quantity: newQty }
                : i
        ));
    };

    const handleRemoveFromCart = (cartId) => {
        setCart(cart.filter(item => item.cartId !== cartId));
    };

    const handleUpdateItemDiscount = (cartId, val) => {
        const item = cart.find(i => i.cartId === cartId);
        if (!item) return;

        const discount = Math.max(0, val);
        if (discount > item.unit_price) {
            alert("Discount amount cannot exceed the unit price.");
            return;
        }

        setCart(cart.map(i => 
            i.cartId === cartId 
                ? { ...i, discount_amount: discount }
                : i
        ));
    };

    // Clear entire cart
    const handleClearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('Are you sure you want to clear the current transaction?')) {
            if (resumedSaleId) {
                setLoadingProducts(true);
                axios.delete(`/api/pos/sales/${resumedSaleId}`)
                    .then(() => {
                        setResumedSaleId(null);
                        fetchHeldSales();
                    })
                    .catch(err => {
                        console.error("Failed to delete draft sale:", err);
                    })
                    .finally(() => {
                        setLoadingProducts(false);
                    });
            }
            setCart([]);
            setCartDiscount(0);
            setCartNotes('');
        }
    };

    // Hold current cart
    const handleHoldCart = () => {
        if (cart.length === 0) return;
        const note = prompt('Enter a reference/name for this suspended order:', `Order ${heldCarts.length + 1}`);
        if (note === null) return; // cancelled prompt

        setLoadingProducts(true);

        const createHold = () => {
            const payload = {
                branch_id: resolvedBranchId,
                notes: cartNotes || note || `Quick Order`,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    product_variation_id: item.product_variation_id || null,
                    quantity: item.quantity
                }))
            };

            return axios.post('/api/pos/sales', payload)
                .then(res => {
                    const saleId = res.data.id;
                    return axios.patch(`/api/pos/sales/${saleId}/hold`);
                });
        };

        const deletePromise = resumedSaleId 
            ? axios.delete(`/api/pos/sales/${resumedSaleId}`)
            : Promise.resolve();

        deletePromise
            .then(() => createHold())
            .then(() => {
                alert('Cart suspended successfully on server!');
                setCart([]);
                setCartDiscount(0);
                setCartNotes('');
                setResumedSaleId(null);
                fetchHeldSales();
            })
            .catch(err => {
                console.error("Suspend error:", err);
                alert(err.response?.data?.message || "Failed to suspend cart.");
            })
            .finally(() => {
                setLoadingProducts(false);
            });
    };

    // Resume a held cart
    const handleResumeHeldCart = (held) => {
        if (cart.length > 0) {
            const overwrite = window.confirm('Your active cart is not empty. Overwrite it with the suspended cart?');
            if (!overwrite) return;
        }

        setLoadingProducts(true);
        axios.patch(`/api/pos/sales/${held.id}/resume`)
            .then(() => {
                setCart(held.items);
                setCartDiscount(held.discount);
                setCartDiscountType(held.discountType || 'flat');
                setCartNotes(held.notes || '');
                setResumedSaleId(held.id);
                setShowHeldCartsModal(false);
                fetchHeldSales();
            })
            .catch(err => {
                console.error("Resume error:", err);
                alert(err.response?.data?.message || "Failed to resume cart.");
            })
            .finally(() => {
                setLoadingProducts(false);
            });
    };

    const handleDeleteHeldCart = (e, heldId) => {
        e.stopPropagation();
        if (window.confirm('Delete this suspended cart from database?')) {
            setLoadingProducts(true);
            axios.delete(`/api/pos/sales/${heldId}`)
                .then(() => {
                    alert('Suspended cart deleted successfully!');
                    fetchHeldSales();
                })
                .catch(err => {
                    console.error("Delete error:", err);
                    alert(err.response?.data?.message || "Failed to delete suspended cart.");
                })
                .finally(() => {
                    setLoadingProducts(false);
                });
        }
    };

    // Process checkout submit
    const handleCheckoutSubmit = (e) => {
        e.preventDefault();
        
        if (cart.length === 0) return;
        if (!resolvedBranchId) {
            alert('Active branch ID not resolved. Please re-authenticate.');
            return;
        }

        // Calculate totals for validation
        const subtotal = getCartSubtotal();
        const tax = getCartTax();
        const discount = getCartOrderDiscountAmount();
        const total = getCartTotal();

        // Format items for checkout payload
        const checkoutItems = cart.map(item => {
            const itemTotal = item.unit_price * item.quantity;
            const itemDiscount = (item.discount_amount || 0) * item.quantity;
            const netAmount = Math.max(0, itemTotal - itemDiscount);
            const itemTax = netAmount * ((item.tax || 0) / 100);

            return {
                product_id: item.product_id,
                product_variation_id: item.product_variation_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_amount: itemDiscount,
                tax_amount: itemTax,
                total_price: netAmount + itemTax
            };
        });

        // Verify tender amount for cash payment
        if (paymentMethod === 'cash') {
            const tender = Number(amountTendered) || 0;
            if (tender < total) {
                alert('Amount tendered must be equal to or greater than the order total.');
                return;
            }
        }

        setProcessingCheckout(true);

        const payload = {
            branch_id: resolvedBranchId,
            customer_id: selectedCustomerId || null,
            resumed_sale_id: resumedSaleId || null,
            payment_method: paymentMethod,
            subtotal,
            discount_amount: discount,
            tax_amount: tax,
            total_amount: total,
            notes: cartNotes,
            items: checkoutItems
        };

        axios.post('/api/pos/checkout', payload)
            .then(res => {
                if (res.data.success) {
                    setLastCompletedSale(res.data.sale);
                    setCart([]);
                    setSelectedCustomerId('');
                    setResumedSaleId(null);
                    setCartDiscount(0);
                    setCartNotes('');
                    setAmountTendered('');
                    setShowCheckoutModal(false);
                    // Refresh products to show updated stock
                    setSearchQuery(prev => prev); // force reload
                } else {
                    alert(res.data.message || 'Checkout failed');
                }
            })
            .catch(err => {
                console.error("Checkout Request Error:", err);
                const msg = err.response?.data?.message || 'Error executing checkout transaction.';
                alert(msg);
            })
            .finally(() => {
                setProcessingCheckout(false);
            });
    };

    // Print receipt
    const handlePrintReceipt = () => {
        const printWindow = window.open('', '_blank');
        const invoiceContent = document.getElementById('receipt-invoice-print').innerHTML;
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice Receipt</title>
                    <style>
                        body { font-family: monospace; padding: 20px; color: #000; background: #fff; max-width: 320px; margin: 0 auto; font-size: 12px; }
                        h2, h3 { text-align: center; margin: 5px 0; }
                        .divider { border-top: 1px dashed #000; margin: 10px 0; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .bold { font-weight: bold; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    ${invoiceContent}
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const visibleProducts = products.filter(prod => {
        if (prod.has_variations) {
            return prod.variations && prod.variations.some(v => v.stock_quantity > 0);
        }
        return prod.stock_quantity > 0;
    });

    return (
        <PageWrapper 
            title="POS Station" 
            subtitle={`Process customer transactions in real-time at ${activeBranch}`}
            breadcrumbs={[{ label: 'POS Station' }]}
            actions={
                <div className="flex items-center gap-2">
                    <Button 
                        variant="secondary" 
                        size="sm"
                        icon={Bookmark}
                        onClick={() => setShowHeldCartsModal(true)}
                        className="relative"
                    >
                        <span>Suspended Carts</span>
                        {heldCarts.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-bold text-white bg-indigo-500 rounded-full animate-bounce">
                                {heldCarts.length}
                            </span>
                        )}
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        icon={RefreshCw}
                        onClick={() => setSearchQuery('')}
                    >
                        Reset POS
                    </Button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Product Selection area (Left Col - 7/12 width) */}
                <div className="lg:col-span-8 space-y-5">
                    
                    {/* Search & Category Filter Section */}
                    <div className="flex flex-col md:flex-row gap-3.5 items-stretch bg-slate-900 border border-slate-800/85 p-4 rounded-2xl shadow-xl">
                        
                        {/* Search field */}
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products by title, SKU, or scan barcode..."
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        {/* Category Dropdown Filter */}
                        <div className="w-full md:w-56 shrink-0">
                            <select
                                value={selectedCategoryId}
                                onChange={(e) => setSelectedCategoryId(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none font-semibold"
                            >
                                <option value="" className="bg-slate-900 text-slate-400">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id} className="bg-slate-900 text-slate-200">
                                        {cat.name} ({cat.products_count})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Horizontal Category Pill Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-transparent">
                        <button
                            onClick={() => setSelectedCategoryId('')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                selectedCategoryId === '' 
                                    ? 'bg-indigo-600/90 text-white border-transparent shadow-lg shadow-indigo-650/10' 
                                    : 'bg-slate-900 border-slate-800/80 text-slate-450 hover:bg-slate-850 hover:text-slate-200'
                            }`}
                        >
                            All Categories
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                    selectedCategoryId == cat.id 
                                        ? 'bg-indigo-600/90 text-white border-transparent shadow-lg shadow-indigo-650/10' 
                                        : 'bg-slate-900 border-slate-800/80 text-slate-450 hover:bg-slate-850 hover:text-slate-200'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Products Grid */}
                    {loadingProducts ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3.5 animate-pulse">
                                    <div className="bg-slate-950/50 rounded-xl h-28 w-full" />
                                    <div className="h-4 bg-slate-950/60 rounded-md w-3/4" />
                                    <div className="h-3 bg-slate-950/60 rounded-md w-1/2" />
                                    <div className="flex justify-between items-center pt-2">
                                        <div className="h-4 bg-slate-950/60 rounded-md w-1/3" />
                                        <div className="h-7 bg-slate-950/60 rounded-md w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : visibleProducts.length === 0 ? (
                        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 space-y-4 max-w-lg mx-auto">
                            <div className="inline-flex items-center justify-center p-3.5 rounded-full bg-slate-950 border border-slate-800 text-slate-500">
                                <Archive className="w-7 h-7" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-250">No Products Available</h3>
                            <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto">
                                We couldn't find any products in {activeBranch} matching the selected filters. Verify that items have inventory stock mapped to this location.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                            {visibleProducts.map(prod => {
                                const isOutOfStock = prod.stock_quantity <= 0;
                                const isLowStock = prod.stock_quantity > 0 && prod.stock_quantity <= 5;
                                
                                return (
                                    <div 
                                        key={prod.id} 
                                        className={`bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 relative group overflow-hidden shadow-lg hover:shadow-xl ${
                                            isOutOfStock ? 'opacity-70' : ''
                                        }`}
                                    >
                                        {/* Stock Level Badge */}
                                        <div className="absolute top-2 right-2 z-10">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono tracking-wide ${
                                                isOutOfStock 
                                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                                    : isLowStock 
                                                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 animate-pulse' 
                                                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                            }`}>
                                                {isOutOfStock ? 'Sold Out' : `${prod.stock_quantity} Left`}
                                            </span>
                                        </div>

                                        {/* Product image container */}
                                        <div className="aspect-[4/3] bg-slate-950/40 rounded-xl flex items-center justify-center p-2 mb-3 border border-slate-800/50 group-hover:bg-slate-950/60 transition-colors overflow-hidden">
                                            {prod.image ? (
                                                <img 
                                                    src={prod.image} 
                                                    alt={prod.name} 
                                                    className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-[1.03] transition-transform duration-200" 
                                                />
                                            ) : (
                                                <Tag className="w-10 h-10 text-slate-700 group-hover:text-slate-650 transition-colors" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                                                    {prod.category_name || 'General'}
                                                </span>
                                                <h4 className="text-xs font-bold text-slate-200 line-clamp-2 mt-0.5 group-hover:text-indigo-400 transition-colors" title={prod.name}>
                                                    {prod.name}
                                                </h4>
                                                <p className="text-[9px] font-mono text-slate-550 mt-1">SKU: {prod.sku || 'N/A'}</p>
                                            </div>

                                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-850 mt-3">
                                                <span className="text-sm font-extrabold text-slate-100">${Number(prod.selling_price).toFixed(2)}</span>
                                                
                                                <button
                                                    disabled={isOutOfStock}
                                                    onClick={() => handleAddProductToCart(prod)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1 border ${
                                                        isOutOfStock 
                                                            ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed' 
                                                            : 'bg-indigo-600/95 hover:bg-indigo-600 text-white border-transparent active:scale-95 shadow-md shadow-indigo-650/10'
                                                    }`}
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>{prod.has_variations ? 'Select' : 'Add'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Cart & Billing Panel (Right Col - 5/12 width) */}
                <div className="lg:col-span-4 sticky top-22">
                    <div className="bg-slate-900 border border-slate-800/85 rounded-2xl flex flex-col shadow-2xl overflow-hidden h-[calc(100vh-170px)] min-h-[500px]">
                        
                        {/* Cart Header */}
                        <div className="px-5 py-4 border-b border-slate-800/85 bg-slate-950/30 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <ShoppingCart className="w-4.5 h-4.5 text-indigo-400" />
                                <span className="font-extrabold text-sm text-slate-200">Active Transaction</span>
                            </div>
                            
                            {/* Running Grand Total Indicator */}
                            <div className="text-right flex items-center gap-2">
                                <span className="px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-800 rounded-md">
                                    {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                                </span>
                                <span className="text-sm font-extrabold text-indigo-400 font-mono">
                                    ${getCartTotal().toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Customer Selector Block */}
                        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-955/40 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-450 font-bold uppercase tracking-wider text-[10px]">
                                <User className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Customer</span>
                            </div>
                            <div className="flex-1 max-w-[200px]">
                                <select
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-indigo-500 font-semibold"
                                >
                                    <option value="">Walk-in Customer</option>
                                    {MOCK_CUSTOMERS.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Cart Items List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-850 px-4 py-2 scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-transparent">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3.5">
                                    <div className="p-3.5 rounded-full bg-slate-950/60 border border-slate-800/70 text-slate-650">
                                        <ShoppingCart className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-350">Cart is empty</p>
                                        <p className="text-[10px] text-slate-500 max-w-[180px] mx-auto leading-relaxed">
                                            Select products or variations on the left to begin compiling the order checkout.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.cartId} className="py-3 flex gap-3 group">
                                        {/* Product image */}
                                        <div className="w-11 h-11 bg-slate-950/50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-850 shrink-0">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <Tag className="w-5 h-5 text-slate-700" />
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex justify-between items-start gap-1">
                                                <h5 className="text-[11px] font-bold text-slate-200 truncate leading-snug" title={item.name}>
                                                    {item.name}
                                                </h5>
                                                <button 
                                                    onClick={() => handleRemoveFromCart(item.cartId)}
                                                    className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                                                    title="Delete Item"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {item.variationName && (
                                                <span className="inline-block px-1.5 py-0.5 bg-slate-950 text-indigo-400 font-bold text-[9px] rounded border border-indigo-950/40">
                                                    {item.variationName}
                                                </span>
                                            )}

                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-[11px] font-semibold text-slate-400 font-mono">
                                                    ${(item.unit_price).toFixed(2)} x {item.quantity}
                                                    {item.discount_amount > 0 && (
                                                        <span className="text-rose-455 text-[10px] font-bold ml-1.5 animate-pulse">
                                                            (-${(item.discount_amount).toFixed(2)} ea)
                                                        </span>
                                                    )}
                                                    {item.tax > 0 && (
                                                        <span className="text-indigo-450 text-[9px] font-bold ml-1.5 bg-indigo-950/40 px-1 py-0.5 rounded border border-indigo-900/30">
                                                            Tax: {item.tax}%
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs font-bold text-slate-200 font-mono">
                                                    ${((item.unit_price - (item.discount_amount || 0)) * item.quantity).toFixed(2)}
                                                </span>
                                            </div>

                                            {/* Quantity and actions */}
                                            <div className="flex items-center justify-between pt-1 gap-2">
                                                <div className="flex items-center bg-slate-950 border border-slate-850 rounded-lg overflow-hidden">
                                                    <button 
                                                        onClick={() => handleUpdateQuantity(item.cartId, -1)}
                                                        className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="px-2.5 text-[11px] font-bold text-slate-300 font-mono select-none">
                                                        {item.quantity}
                                                    </span>
                                                    <button 
                                                        onClick={() => handleUpdateQuantity(item.cartId, 1)}
                                                        className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {/* Item Discount Input */}
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Disc:</span>
                                                    <input
                                                        type="number"
                                                        value={item.discount_amount || ''}
                                                        onChange={(e) => handleUpdateItemDiscount(item.cartId, Number(e.target.value))}
                                                        placeholder="0.00"
                                                        className="w-16 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-semibold font-mono text-center"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Cart Summary & Action controls */}
                        <div className="border-t border-slate-805 bg-slate-950/40 p-4 space-y-4 shrink-0">
                            
                            {/* Inputs: Discount & Notes */}
                            {cart.length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Discount Input with flat/$ toggle */}
                                    <div className="relative flex items-center bg-slate-950 border border-slate-850 rounded-xl overflow-hidden px-2">
                                        <span className="text-slate-500 text-xs font-bold shrink-0">
                                            {cartDiscountType === 'flat' ? '$' : '%'}
                                        </span>
                                        <input
                                            type="number"
                                            value={cartDiscount || ''}
                                            onChange={(e) => setCartDiscount(Math.max(0, Number(e.target.value)))}
                                            placeholder="Discount"
                                            className="w-full bg-transparent border-none py-2 pl-2 pr-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none font-semibold font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCartDiscountType(prev => prev === 'flat' ? 'percent' : 'flat');
                                                setCartDiscount(0);
                                            }}
                                            className="px-2 py-1 text-[9px] font-bold bg-slate-900 text-indigo-400 hover:text-indigo-300 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors shrink-0"
                                            title="Toggle Type"
                                        >
                                            {cartDiscountType === 'flat' ? 'Flat' : 'Pct'}
                                        </button>
                                    </div>
                                    {/* Notes input */}
                                    <div className="relative">
                                        <FileText className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={cartNotes}
                                            onChange={(e) => setCartNotes(e.target.value)}
                                            placeholder="Add notes..."
                                            className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-3 py-2 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Billing details block */}
                            <div className="space-y-1.5 text-xs font-semibold text-slate-350">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span className="font-mono text-slate-200">${getCartSubtotal().toFixed(2)}</span>
                                </div>
                                {getCartItemDiscountTotal() > 0 && (
                                    <div className="flex justify-between text-rose-400">
                                        <span>Item Discount</span>
                                        <span className="font-mono">-${getCartItemDiscountTotal().toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Tax Amount</span>
                                    <span className="font-mono text-slate-200">+${getCartTax().toFixed(2)}</span>
                                </div>
                                {getCartOrderDiscountAmount() > 0 && (
                                    <div className="flex justify-between text-rose-450">
                                        <span>Order Discount {cartDiscountType === 'percent' && `(${cartDiscount}%)`}</span>
                                        <span className="font-mono">-${getCartOrderDiscountAmount().toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="border-t border-slate-850 my-2 pt-2 flex justify-between items-baseline">
                                    <span className="text-sm font-bold text-slate-200">Grand Total</span>
                                    <span className="text-lg font-extrabold text-indigo-400 font-mono">
                                        ${getCartTotal().toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Actions Buttons */}
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleClearCart}
                                    disabled={cart.length === 0}
                                    className="px-2"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleHoldCart}
                                    disabled={cart.length === 0}
                                    className="px-2"
                                >
                                    Suspend
                                </Button>
                                <Button
                                    variant="primary"
                                    size="md"
                                    onClick={() => setShowCheckoutModal(true)}
                                    disabled={cart.length === 0}
                                    className="col-span-1 flex-1 font-bold text-xs"
                                >
                                    Checkout
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* Held Carts List Modal */}
            {showHeldCartsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in-up">
                        
                        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
                            <h3 className="text-sm font-bold text-slate-200">Suspended POS Transactions</h3>
                            <button 
                                onClick={() => setShowHeldCartsModal(false)}
                                className="text-slate-400 hover:text-slate-200 font-bold"
                            >
                                Close
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1 space-y-3.5">
                            {heldCarts.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 space-y-2">
                                    <Bookmark className="w-8 h-8 mx-auto text-slate-700" />
                                    <p className="text-xs font-bold text-slate-400">No suspended carts</p>
                                    <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto">
                                        Use the "Suspend" button in the cart panel to hold a current cart for retrieval later.
                                    </p>
                                </div>
                            ) : (
                                heldCarts.map(held => (
                                    <div 
                                        key={held.id}
                                        onClick={() => handleResumeHeldCart(held)}
                                        className="bg-slate-950/45 hover:bg-slate-950 border border-slate-850 hover:border-indigo-500/40 rounded-xl p-4 flex justify-between items-center cursor-pointer transition-all duration-150"
                                    >
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-extrabold text-indigo-400">{held.reference}</h4>
                                            <p className="text-[10px] text-slate-500 font-semibold">{held.timestamp} &bull; {held.items.length} items</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-extrabold text-slate-300 font-mono">${held.total.toFixed(2)}</span>
                                            <button 
                                                onClick={(e) => handleDeleteHeldCart(e, held.id)}
                                                className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-405 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Product Variation Selector Modal */}
            {selectedProductForVariation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-fade-in-up">
                        
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/20">
                            <div>
                                <h3 className="text-xs font-bold text-slate-200">Select Variation</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">{selectedProductForVariation.name}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedProductForVariation(null)}
                                className="text-slate-400 hover:text-slate-250 font-bold"
                            >
                                Close
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-850">
                            {selectedProductForVariation.variations?.map(variation => {
                                const isOutOfStock = variation.stock_quantity <= 0;
                                const attrsLabel = [
                                    variation.size && `Size: ${variation.size}`,
                                    variation.color && `Color: ${variation.color}`,
                                    variation.material && `Material: ${variation.material}`
                                ].filter(Boolean).join(', ') || 'Default';

                                return (
                                    <div 
                                        key={variation.id}
                                        className={`py-3 flex justify-between items-center gap-4 ${isOutOfStock ? 'opacity-50' : ''}`}
                                    >
                                        <div className="space-y-0.5">
                                            <h4 className="text-xs font-bold text-slate-200">{attrsLabel}</h4>
                                            <p className="text-[9px] text-slate-500 font-mono">SKU: {variation.sku}</p>
                                            <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold font-mono rounded ${
                                                isOutOfStock 
                                                    ? 'bg-rose-500/10 text-rose-400' 
                                                    : 'bg-indigo-500/10 text-indigo-400'
                                            }`}>
                                                {isOutOfStock ? 'Out of Stock' : `${variation.stock_quantity} available`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-extrabold text-slate-350 font-mono">
                                                ${Number(variation.selling_price).toFixed(2)}
                                            </span>
                                            <Button
                                                variant={isOutOfStock ? 'secondary' : 'primary'}
                                                size="sm"
                                                disabled={isOutOfStock}
                                                onClick={() => handleAddProductToCart(selectedProductForVariation, variation)}
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                        
                        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/20">
                            <h3 className="text-sm font-bold text-slate-200">Complete POS Transaction</h3>
                            <button 
                                onClick={() => setShowCheckoutModal(false)}
                                className="text-slate-400 hover:text-slate-250 font-bold"
                            >
                                Cancel
                            </button>
                        </div>

                        <form onSubmit={handleCheckoutSubmit} className="p-5 space-y-4">
                            
                            {/* Order & Customer Summary */}
                            <div className="bg-slate-950/50 border border-slate-850/80 rounded-xl p-3.5 space-y-2.5 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-transparent">
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <span>Selected Customer</span>
                                    <span className="text-indigo-400 font-semibold normal-case">
                                        {selectedCustomerId ? MOCK_CUSTOMERS.find(c => c.id === selectedCustomerId)?.name : 'Walk-in Customer'}
                                    </span>
                                </div>
                                <div className="border-t border-slate-850/50 my-1"></div>
                                <div className="space-y-1.5">
                                    {cart.map(item => (
                                        <div key={item.cartId} className="flex justify-between text-xs font-semibold text-slate-350">
                                            <span className="truncate max-w-[200px]">
                                                {item.name} <span className="text-slate-500 font-bold">x{item.quantity}</span>
                                            </span>
                                            <span className="font-mono text-slate-250">
                                                ${((item.unit_price - (item.discount_amount || 0)) * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Billing summary */}
                            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400">Total Amount Due</span>
                                <span className="text-xl font-extrabold text-indigo-400 font-mono">${getCartTotal().toFixed(2)}</span>
                            </div>

                            {/* Payment Methods */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Payment Mode
                                </label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {[
                                        { id: 'cash', label: 'Cash', icon: DollarSign },
                                        { id: 'card', label: 'Card', icon: CreditCard },
                                        { id: 'mobile', label: 'Mobile Pay', icon: Wallet }
                                    ].map(method => {
                                        const Icon = method.icon;
                                        return (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => {
                                                    setPaymentMethod(method.id);
                                                    if (method.id !== 'cash') setAmountTendered('');
                                                }}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border font-bold text-xs gap-1.5 transition-all ${
                                                    paymentMethod === method.id
                                                        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                                                        : 'bg-slate-950/50 border-slate-850 text-slate-500 hover:text-slate-350 hover:bg-slate-950'
                                                }`}
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span>{method.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Amount Tendered (Cash only) */}
                            {paymentMethod === 'cash' && (
                                <div className="space-y-3 pt-1.5 border-t border-slate-850 animate-fade-in">
                                    <Input
                                        label="Amount Tendered"
                                        type="number"
                                        step="0.01"
                                        required
                                        min={getCartTotal()}
                                        value={amountTendered}
                                        onChange={(e) => setAmountTendered(e.target.value)}
                                        placeholder="Enter cash received..."
                                        icon={DollarSign}
                                    />

                                    {/* Quick Cash Options */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                            Quick Cash Options
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { label: 'Exact Change', value: getCartTotal() },
                                                ...[5, 10, 20, 50, 100].filter(val => val >= getCartTotal()).map(val => ({ label: `$${val}`, value: val }))
                                            ].map((opt, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setAmountTendered(opt.value.toFixed(2))}
                                                    className="px-2.5 py-1 text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-indigo-400 rounded-lg transition-colors active:scale-95"
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Change Calculations */}
                                    {Number(amountTendered) > 0 && (
                                        <div className="flex justify-between items-center p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                                            <span className="text-xs font-bold text-emerald-400">Change Due</span>
                                            <span className="text-base font-extrabold text-emerald-400 font-mono">
                                                ${Math.max(0, Number(amountTendered) - getCartTotal()).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                             {/* Transaction Note */}
                             <div className="space-y-1.5 pt-1.5 border-t border-slate-850">
                                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                     Transaction Note
                                 </label>
                                 <textarea
                                     value={cartNotes}
                                     onChange={(e) => setCartNotes(e.target.value)}
                                     placeholder="Add transaction notes (appears on receipt)..."
                                     rows="2"
                                     className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                                 />
                             </div>

                             {/* Submit & buttons */}
                             <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="success"
                                    size="lg"
                                    loading={processingCheckout}
                                    className="w-full text-sm font-bold py-3.5"
                                >
                                    Finalize Order & Print Receipt
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Completed Transaction Invoice Receipt (Invoice view) */}
            {lastCompletedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                        
                        <div className="flex items-center justify-between p-4.5 border-b border-slate-800">
                            <span className="text-xs font-bold text-slate-200">Transaction Complete</span>
                            <button 
                                onClick={() => setLastCompletedSale(null)}
                                className="text-slate-400 hover:text-slate-200 font-bold"
                            >
                                Done
                            </button>
                        </div>

                        <div className="p-5 max-h-[70vh] overflow-y-auto">
                            {/* Receipt Body print layout wrapper */}
                            <div id="receipt-invoice-print" className="bg-white text-slate-950 p-4 rounded-lg font-mono text-[11px] leading-snug">
                                <h3 className="text-center font-bold text-sm tracking-wide uppercase">{activeBranch}</h3>
                                <p className="text-center font-bold">POS TRANSACTION RECEIPT</p>
                                <div className="divider" style={{ borderTop: '1px dashed #475569', margin: '8px 0' }} />
                                
                                <div className="row flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Sale ID: #{lastCompletedSale.id}</span>
                                    <span>Date: {new Date(lastCompletedSale.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="row flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Time: {new Date(lastCompletedSale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>Cashier ID: #{lastCompletedSale.user_id}</span>
                                </div>
                                
                                <div className="divider" style={{ borderTop: '1px dashed #475569', margin: '8px 0' }} />

                                <table className="w-full text-left" style={{ width: '100%' }}>
                                    <thead>
                                        <tr className="border-b" style={{ borderBottom: '1.5px solid #000', fontWeight: 'bold' }}>
                                            <th className="pb-1">Item</th>
                                            <th className="pb-1 text-center" style={{ textAlign: 'center' }}>Qty</th>
                                            <th className="pb-1 text-right" style={{ textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lastCompletedSale.items?.map(item => (
                                            <tr key={item.id}>
                                                <td className="py-1">
                                                    <div>{item.product?.name}</div>
                                                    {item.variation && (
                                                        <div style={{ fontSize: '9px', color: '#475569' }}>
                                                            ({[item.variation.size && `Size: ${item.variation.size}`, item.variation.color && `Color: ${item.variation.color}`].filter(Boolean).join(', ')})
                                                        </div>
                                                    )}
                                                    {Number(item.discount_amount) > 0 && (
                                                        <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 'bold' }}>
                                                            (Disc: -${(Number(item.discount_amount) / item.quantity).toFixed(2)} ea)
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-1 text-center" style={{ textAlign: 'center' }}>{item.quantity}</td>
                                                <td className="py-1 text-right" style={{ textAlign: 'right' }}>${Number(item.total_price).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="divider" style={{ borderTop: '1px dashed #475569', margin: '8px 0' }} />

                                <div className="row flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Subtotal</span>
                                    <span>${Number(lastCompletedSale.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="row flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Tax</span>
                                    <span>+${Number(lastCompletedSale.tax_amount).toFixed(2)}</span>
                                </div>
                                {Number(lastCompletedSale.discount_amount) > 0 && (
                                    <div className="row flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Discount</span>
                                        <span>-${Number(lastCompletedSale.discount_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="row flex justify-between font-bold" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '4px' }}>
                                    <span>TOTAL</span>
                                    <span>${Number(lastCompletedSale.total_amount).toFixed(2)}</span>
                                </div>

                                {lastCompletedSale.notes && (
                                    <div style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '10px' }}>
                                        Notes: {lastCompletedSale.notes}
                                    </div>
                                )}

                                <div className="divider" style={{ borderTop: '1px dashed #475569', margin: '8px 0' }} />
                                <p className="text-center" style={{ textAlign: 'center', fontSize: '10px' }}>Thank you for shopping with us!</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950/30 border-t border-slate-800 flex gap-3">
                            <Button
                                variant="secondary"
                                size="md"
                                onClick={() => setLastCompletedSale(null)}
                                className="flex-1"
                            >
                                Close
                            </Button>
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handlePrintReceipt}
                                icon={Printer}
                                className="flex-1"
                            >
                                Print Receipt
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </PageWrapper>
    );
}
