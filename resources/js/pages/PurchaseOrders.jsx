import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Filters from '../components/Filters';
import { Input, Textarea, Checkbox, Select } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { 
    FileText, Plus, Edit, Trash2, Search, ArrowUpRight, 
    Truck, Calendar, User, CreditCard, ChevronLeft, 
    AlertTriangle, CheckSquare, XCircle, ShoppingBag, Eye 
} from 'lucide-react';

// Custom Searchable Dropdown Selection Component
function SearchableSelect({
    label,
    options = [], // [{ value, label, sublabel }]
    value,
    onChange,
    placeholder = 'Select option...',
    error,
    icon: Icon = null,
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = React.useRef(null);

    const filteredOptions = options.filter(opt =>
        String(opt.label).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.sublabel && String(opt.sublabel).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`space-y-1.5 w-full relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                        <Icon className="w-4 h-4" />
                    </span>
                )}
                <div
                    onClick={() => {
                        setIsOpen(!isOpen);
                        setSearchTerm('');
                    }}
                    className={`block w-full py-2.5 pr-8 bg-slate-950/50 border rounded-xl text-slate-200 outline-none transition-all text-xs font-semibold cursor-pointer select-none ${
                        Icon ? 'pl-10' : 'pl-4'
                    } ${
                        error 
                            ? 'border-red-500/50 focus:border-red-500' 
                            : 'border-slate-800 focus:border-indigo-500'
                    }`}
                >
                    {selectedOption ? (
                        <div className="flex flex-col">
                            <span className="truncate">{selectedOption.label}</span>
                            {selectedOption.sublabel && (
                                <span className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{selectedOption.sublabel}</span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-650">{placeholder}</span>
                    )}
                </div>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 pointer-events-none">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-60 flex flex-col">
                    <div className="p-2 border-b border-slate-900 bg-slate-950 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <input
                            type="text"
                            placeholder="Type to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent text-slate-200 outline-none text-xs py-1"
                            autoFocus
                        />
                    </div>
                    <div className="overflow-y-auto divide-y divide-slate-900/50 flex-1 max-h-48">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-[11px] text-slate-500">
                                No matching records found
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`p-2.5 hover:bg-indigo-600 hover:text-white cursor-pointer transition-colors text-[11px] font-semibold text-left ${
                                        opt.value === value ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-350'
                                    }`}
                                >
                                    <div>{opt.label}</div>
                                    {opt.sublabel && (
                                        <div className="text-[9px] text-slate-500 font-semibold mt-0.5">{opt.sublabel}</div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {error && (
                <p className="text-[10px] font-semibold text-red-400 mt-1">{error}</p>
            )}
        </div>
    );
}

export default function PurchaseOrders() {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [supplierFilter, setSupplierFilter] = useState('all');
    const [productFilter, setProductFilter] = useState('all');

    // Detail & workflow state
    const [viewingPO, setViewingPO] = useState(null);
    const [isReceiving, setIsReceiving] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentPO, setCurrentPO] = useState(null); // for edit/delete/receive actions

    // Form modal state
    const [formOpen, setFormOpen] = useState(false);
    const [formSupplierId, setFormSupplierId] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [formStatus, setFormStatus] = useState('draft');
    const [formItems, setFormItems] = useState([]); // [{ id, product_id, product_variation_id, quantity_ordered, unit_cost }]
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Receiving form state
    const [receiveBranchId, setReceiveBranchId] = useState('');
    const [receiveQuantities, setReceiveQuantities] = useState({}); // { po_item_id: quantity }
    const [receiveErrors, setReceiveErrors] = useState({});

    // Fetch lists
    const fetchPurchaseOrders = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: currentPage,
                per_page: pageSize,
                search: searchQuery || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                supplier_id: supplierFilter !== 'all' ? supplierFilter : undefined,
                product_id: productFilter !== 'all' ? productFilter : undefined
            };
            const response = await axios.get('/api/purchase-orders', { params });
            setPurchaseOrders(response.data.data);
            setTotalPages(response.data.last_page);
            setTotalRecords(response.data.total);
        } catch (err) {
            console.warn('API error, loading simulated purchase orders.', err);
            
            // Fallback mock purchase orders
            const fallbackPOs = [
                {
                    id: 10023,
                    supplier_id: 1,
                    supplier: { id: 1, name: 'Sarah Connor', company_name: 'Cyberdyne Systems Supply' },
                    user: { name: 'Admin User' },
                    status: 'received',
                    status_label: 'Received',
                    notes: 'Initial bulk order for metal plating.',
                    total_amount: 1450.00,
                    created_at: '2026-06-18T14:22:00.000000Z',
                    items: [
                        {
                            id: 1,
                            product_id: 1,
                            product: { name: 'Titanium Rod 10mm' },
                            product_variation_id: null,
                            variation: null,
                            quantity_ordered: 10,
                            quantity_received: 10,
                            unit_cost: 145.00,
                            total_cost: 1450.00
                        }
                    ]
                },
                {
                    id: 10041,
                    supplier_id: 2,
                    supplier: { id: 2, name: 'Bruce Wayne', company_name: 'Wayne Enterprises Logistics' },
                    user: { name: 'Sarah Cashier' },
                    status: 'ordered',
                    status_label: 'Ordered',
                    notes: 'Awaiting shipping confirmation.',
                    total_amount: 2500.00,
                    created_at: '2026-07-02T11:05:00.000000Z',
                    items: [
                        {
                            id: 2,
                            product_id: 2,
                            product: { name: 'Carbon Fiber Plating' },
                            product_variation_id: 1,
                            variation: { size: 'Large', color: 'Black' },
                            quantity_ordered: 25,
                            quantity_received: 0,
                            unit_cost: 100.00,
                            total_cost: 2500.00
                        }
                    ]
                },
                {
                    id: 10058,
                    supplier_id: 1,
                    supplier: { id: 1, name: 'Sarah Connor', company_name: 'Cyberdyne Systems Supply' },
                    user: { name: 'Admin User' },
                    status: 'draft',
                    status_label: 'Draft',
                    notes: 'Draft order for review.',
                    total_amount: 890.50,
                    created_at: '2026-07-09T09:12:00.000000Z',
                    items: [
                        {
                            id: 3,
                            product_id: 3,
                            product: { name: 'Microprocessor T-800' },
                            product_variation_id: null,
                            variation: null,
                            quantity_ordered: 2,
                            quantity_received: 0,
                            unit_cost: 445.25,
                            total_cost: 890.50
                        }
                    ]
                }
            ];

            // Filter locally for mock testing
            let filteredMock = fallbackPOs.filter(po => {
                const matchesSearch = po.supplier.company_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                      po.supplier.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
                const matchesSupplier = supplierFilter === 'all' || po.supplier_id === Number(supplierFilter);
                const matchesProduct = productFilter === 'all' || (po.items && po.items.some(item => item.product_id === Number(productFilter)));
                return matchesSearch && matchesStatus && matchesSupplier && matchesProduct;
            });

            setPurchaseOrders(filteredMock);
            setTotalPages(1);
            setTotalRecords(filteredMock.length);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [suppliersRes, productsRes, branchesRes] = await Promise.all([
                axios.get('/api/suppliers?per_page=100'),
                axios.get('/api/products?per_page=100'),
                axios.get('/api/branches?per_page=100')
            ]);
            setSuppliers(suppliersRes.data.data || []);
            setProducts(productsRes.data.data || []);
            setBranches(branchesRes.data.data || []);
        } catch (err) {
            console.warn('API error fetching dropdown catalogs. Loading simulated mock catalogs.', err);
            setSuppliers([
                { id: 1, name: 'Sarah Connor', company_name: 'Cyberdyne Systems Supply', is_active: true },
                { id: 2, name: 'Bruce Wayne', company_name: 'Wayne Enterprises Logistics', is_active: true },
                { id: 3, name: 'Walter White', company_name: 'A1A Chemicals Corp', is_active: false }
            ]);
            setProducts([
                { 
                    id: 1, 
                    name: 'Titanium Rod 10mm', 
                    cost_price: 145.00,
                    variations: []
                },
                { 
                    id: 2, 
                    name: 'Carbon Fiber Plating', 
                    cost_price: 100.00,
                    variations: [
                        { id: 1, size: 'Large', color: 'Black', cost_price: 100.00 },
                        { id: 2, size: 'Medium', color: 'Gray', cost_price: 85.00 }
                    ]
                },
                { 
                    id: 3, 
                    name: 'Microprocessor T-800', 
                    cost_price: 445.25,
                    variations: []
                }
            ]);
            setBranches([
                { id: 1, name: 'Downtown HQ', is_active: true },
                { id: 2, name: 'Westside Outlet', is_active: true }
            ]);
        }
    };

    // Load list on mount
    useEffect(() => {
        fetchPurchaseOrders();
        fetchDropdownData();
    }, [currentPage, statusFilter, supplierFilter, productFilter]);

    // Handle search debouncing
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            setCurrentPage(1);
            fetchPurchaseOrders();
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    // Re-fetch PO details when viewing active PO
    const reloadViewingPO = async (poId) => {
        try {
            const response = await axios.get(`/api/purchase-orders/${poId}`);
            setViewingPO(response.data);
        } catch (err) {
            console.warn('Failed to reload PO details. Updating from local list.', err);
            const found = purchaseOrders.find(po => po.id === poId);
            if (found) setViewingPO(found);
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setSupplierFilter('all');
        setProductFilter('all');
        setCurrentPage(1);
    };

    // Form logic: Add item row
    const addFormItemRow = () => {
        setFormItems([...formItems, {
            id: null,
            product_id: products[0]?.id || '',
            product_variation_id: '',
            quantity_ordered: 1,
            unit_cost: products[0]?.cost_price || '0.00'
        }]);
    };

    // Form logic: Remove item row
    const removeFormItemRow = (idx) => {
        setFormItems(formItems.filter((_, i) => i !== idx));
    };

    // Form logic: Update row values
    const updateFormItemRow = (idx, field, value) => {
        const updated = [...formItems];
        updated[idx][field] = value;

        if (field === 'product_id') {
            const prod = products.find(p => p.id === Number(value));
            if (prod) {
                updated[idx].product_variation_id = prod.variations && prod.variations.length > 0 ? prod.variations[0].id : '';
                updated[idx].unit_cost = prod.variations && prod.variations.length > 0 ? prod.variations[0].cost_price : prod.cost_price;
            }
        } else if (field === 'product_variation_id') {
            const prod = products.find(p => p.id === Number(updated[idx].product_id));
            if (prod && prod.variations) {
                const vari = prod.variations.find(v => v.id === Number(value));
                if (vari) {
                    updated[idx].unit_cost = vari.cost_price;
                }
            }
        }

        setFormItems(updated);
    };

    // Open creation form
    const handleCreateOpen = () => {
        setCurrentPO(null);
        setFormSupplierId(suppliers.filter(s => s.is_active)[0]?.id || '');
        setFormNotes('');
        setFormStatus('draft');
        
        // Start with one item row
        if (products.length > 0) {
            const prod = products[0];
            const hasVar = prod.variations && prod.variations.length > 0;
            setFormItems([{
                id: null,
                product_id: prod.id,
                product_variation_id: hasVar ? prod.variations[0].id : '',
                quantity_ordered: 1,
                unit_cost: hasVar ? prod.variations[0].cost_price : prod.cost_price
            }]);
        } else {
            setFormItems([]);
        }

        setFormErrors({});
        setFormOpen(true);
    };

    // Open edit form (draft PO only)
    const handleEditOpen = (po, e) => {
        if (e) e.stopPropagation();
        if (po.status !== 'draft') {
            alert('Only draft purchase orders can be edited.');
            return;
        }

        setCurrentPO(po);
        setFormSupplierId(po.supplier_id);
        setFormNotes(po.notes || '');
        setFormStatus(po.status);
        
        // Map current items
        const mappedItems = po.items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_variation_id: item.product_variation_id || '',
            quantity_ordered: item.quantity_ordered,
            unit_cost: parseFloat(item.unit_cost).toFixed(2)
        }));
        setFormItems(mappedItems);
        setFormErrors({});
        setFormOpen(true);
    };

    // Submit PO form
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});

        // Validations
        const errors = {};
        if (!formSupplierId) errors.supplier_id = 'Please select a supplier';
        if (formItems.length === 0) errors.items = 'Purchase order must have at least one product line item';

        formItems.forEach((item, idx) => {
            if (!item.product_id) {
                errors[`item_${idx}_product`] = 'Select product';
            }
            if (isNaN(parseInt(item.quantity_ordered)) || parseInt(item.quantity_ordered) < 1) {
                errors[`item_${idx}_qty`] = 'Qty >= 1';
            }
            if (isNaN(parseFloat(item.unit_cost)) || parseFloat(item.unit_cost) < 0) {
                errors[`item_${idx}_cost`] = 'Cost >= 0';
            }
        });

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        const payload = {
            supplier_id: Number(formSupplierId),
            notes: formNotes || null,
            status: formStatus,
            items: formItems.map(item => ({
                id: item.id || undefined,
                product_id: Number(item.product_id),
                product_variation_id: item.product_variation_id ? Number(item.product_variation_id) : null,
                quantity_ordered: Number(item.quantity_ordered),
                unit_cost: parseFloat(item.unit_cost)
            }))
        };

        try {
            if (currentPO) {
                // Update
                const response = await axios.put(`/api/purchase-orders/${currentPO.id}`, payload);
                const updated = response.data;
                setPurchaseOrders(purchaseOrders.map(po => po.id === currentPO.id ? updated : po));
                if (viewingPO && viewingPO.id === currentPO.id) {
                    setViewingPO(updated);
                }
            } else {
                // Create
                const response = await axios.post('/api/purchase-orders', payload);
                setPurchaseOrders([response.data, ...purchaseOrders]);
            }
            setFormOpen(false);
        } catch (err) {
            console.warn('API error, using simulated local state update for save.', err);

            // Calculate total sum locally
            const calculatedTotal = formItems.reduce((sum, item) => sum + (Number(item.quantity_ordered) * parseFloat(item.unit_cost)), 0);
            const sup = suppliers.find(s => s.id === Number(formSupplierId)) || { name: 'Sarah Connor', company_name: 'Cyberdyne Systems Supply' };
            
            // Build items with names
            const hydratedItems = formItems.map((item, idx) => {
                const prod = products.find(p => p.id === Number(item.product_id)) || { name: 'Custom Product' };
                let vari = null;
                if (item.product_variation_id && prod.variations) {
                    vari = prod.variations.find(v => v.id === Number(item.product_variation_id));
                }
                return {
                    id: item.id || Date.now() + idx,
                    product_id: item.product_id,
                    product: { name: prod.name },
                    product_variation_id: item.product_variation_id || null,
                    variation: vari ? { size: vari.size, color: vari.color } : null,
                    quantity_ordered: item.quantity_ordered,
                    quantity_received: 0,
                    unit_cost: item.unit_cost,
                    total_cost: item.quantity_ordered * item.unit_cost
                };
            });

            if (currentPO) {
                const updatedSimulated = {
                    ...currentPO,
                    supplier_id: Number(formSupplierId),
                    supplier: sup,
                    notes: formNotes,
                    status: formStatus,
                    status_label: formStatus.charAt(0).toUpperCase() + formStatus.slice(1),
                    total_amount: calculatedTotal,
                    items: hydratedItems
                };
                setPurchaseOrders(purchaseOrders.map(po => po.id === currentPO.id ? updatedSimulated : po));
                if (viewingPO && viewingPO.id === currentPO.id) {
                    setViewingPO(updatedSimulated);
                }
            } else {
                const newSimulated = {
                    id: Date.now() % 100000,
                    supplier_id: Number(formSupplierId),
                    supplier: sup,
                    user: { name: 'Admin User' },
                    notes: formNotes,
                    status: formStatus,
                    status_label: formStatus.charAt(0).toUpperCase() + formStatus.slice(1),
                    total_amount: calculatedTotal,
                    created_at: new Date().toISOString(),
                    items: hydratedItems
                };
                setPurchaseOrders([newSimulated, ...purchaseOrders]);
            }
            setFormOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    // Transition workflow status (e.g. mark ordered, cancel)
    const handleTransitionStatus = async (po, newStatus) => {
        try {
            const response = await axios.patch(`/api/purchase-orders/${po.id}/status`, { status: newStatus });
            const updated = response.data;
            setPurchaseOrders(purchaseOrders.map(p => p.id === po.id ? updated : p));
            if (viewingPO && viewingPO.id === po.id) {
                setViewingPO(updated);
            }
        } catch (err) {
            console.warn('API error, performing simulated status transition.', err);
            const updatedSimulated = {
                ...po,
                status: newStatus,
                status_label: newStatus.charAt(0).toUpperCase() + newStatus.slice(1)
            };
            setPurchaseOrders(purchaseOrders.map(p => p.id === po.id ? updatedSimulated : p));
            if (viewingPO && viewingPO.id === po.id) {
                setViewingPO(updatedSimulated);
            }
        }
    };

    // Delete PO (Draft only)
    const handleDeleteOpen = (po, e) => {
        if (e) e.stopPropagation();
        setCurrentPO(po);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!currentPO) return;
        setSubmitting(true);
        try {
            await axios.delete(`/api/purchase-orders/${currentPO.id}`);
            setPurchaseOrders(purchaseOrders.filter(po => po.id !== currentPO.id));
            if (viewingPO && viewingPO.id === currentPO.id) {
                setViewingPO(null);
            }
        } catch (err) {
            console.warn('API error, performing simulated delete.', err);
            setPurchaseOrders(purchaseOrders.filter(po => po.id !== currentPO.id));
            if (viewingPO && viewingPO.id === currentPO.id) {
                setViewingPO(null);
            }
        } finally {
            setSubmitting(false);
            setDeleteModalOpen(false);
        }
    };

    // Open Receive Stock Modal/Panel
    const handleReceiveOpen = (po) => {
        setCurrentPO(po);
        setViewingPO(po); // Make sure it's active in state
        setReceiveBranchId(branches.filter(b => b.is_active)[0]?.id || '');
        
        // Pre-fill quantities to receive with remaining qty
        const initialQtys = {};
        po.items.forEach(item => {
            const remaining = item.quantity_ordered - item.quantity_received;
            initialQtys[item.id] = remaining > 0 ? remaining : 0;
        });
        setReceiveQuantities(initialQtys);
        setReceiveErrors({});
        setIsReceiving(true);
    };

    // Submit stock receiving
    const handleReceiveSubmit = async (e) => {
        if (e) e.preventDefault();
        setReceiveErrors({});

        // Validations
        const errors = {};
        if (!receiveBranchId) errors.branch_id = 'Please select receiving branch';

        const payloadItems = [];
        let totalItemsReceived = 0;

        currentPO.items.forEach(item => {
            const remaining = item.quantity_ordered - item.quantity_received;
            const receiveQty = parseInt(receiveQuantities[item.id] || 0);

            if (receiveQty > 0) {
                if (receiveQty > remaining) {
                    errors[`item_${item.id}`] = `Max possible: ${remaining}`;
                } else {
                    payloadItems.push({
                        purchase_order_item_id: item.id,
                        quantity_received: receiveQty
                    });
                    totalItemsReceived += receiveQty;
                }
            }
        });

        if (payloadItems.length === 0 && Object.keys(errors).length === 0) {
            errors.general = 'Please input a receive quantity for at least one item';
        }

        if (Object.keys(errors).length > 0) {
            setReceiveErrors(errors);
            return;
        }

        setSubmitting(true);

        try {
            const response = await axios.post(`/api/purchase-orders/${currentPO.id}/receive`, {
                branch_id: Number(receiveBranchId),
                items: payloadItems
            });
            const updated = response.data;
            setPurchaseOrders(purchaseOrders.map(p => p.id === currentPO.id ? updated : p));
            if (viewingPO && viewingPO.id === currentPO.id) {
                setViewingPO(updated);
            }
            setIsReceiving(false);
        } catch (err) {
            console.warn('API error, performing simulated stock receive.', err);

            // Construct new received state locally
            const updatedItems = currentPO.items.map(item => {
                const receivedQty = parseInt(receiveQuantities[item.id] || 0);
                return {
                    ...item,
                    quantity_received: Math.min(item.quantity_ordered, item.quantity_received + receivedQty)
                };
            });

            const allRec = updatedItems.every(i => i.quantity_received >= i.quantity_ordered);
            const anyRec = updatedItems.sum ? updatedItems.sum(i => i.quantity_received) > 0 : true; // default state transitions to received or partially received
            const nextStatus = allRec ? 'received' : 'partially_received';

            const updatedSimulated = {
                ...currentPO,
                status: nextStatus,
                status_label: nextStatus.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                items: updatedItems
            };

            setPurchaseOrders(purchaseOrders.map(p => p.id === currentPO.id ? updatedSimulated : p));
            if (viewingPO && viewingPO.id === currentPO.id) {
                setViewingPO(updatedSimulated);
            }
            setIsReceiving(false);
        } finally {
            setSubmitting(false);
        }
    };

    // Columns config for main POs table
    const columns = [
        {
            key: 'id',
            header: 'PO Code',
            render: (row) => (
                <span 
                    onClick={() => setViewingPO(row)} 
                    className="font-mono text-indigo-400 font-bold cursor-pointer hover:underline"
                >
                    #PO-{row.id}
                </span>
            )
        },
        {
            key: 'supplier',
            header: 'Supplier Wholesaler',
            render: (row) => (
                <div>
                    <div className="font-bold text-slate-200">{row.supplier?.company_name || row.supplier?.name}</div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Contact: {row.supplier?.name}</div>
                </div>
            )
        },
        {
            key: 'created_at',
            header: 'Order Date',
            render: (row) => {
                const date = new Date(row.created_at);
                return (
                    <div className="flex items-center gap-1.5 text-slate-350">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                );
            }
        },
        {
            key: 'total_amount',
            header: 'Total Order Value',
            className: 'text-right',
            render: (row) => (
                <span className="font-mono font-bold text-slate-200 text-right block">
                    ${parseFloat(row.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => {
                const statusMap = {
                    draft: 'bg-slate-800 text-slate-400 border-slate-700/50',
                    ordered: 'bg-blue-500/10 text-blue-450 border-blue-500/20',
                    partially_received: 'bg-amber-500/10 text-amber-450 border-amber-500/20 shadow-sm shadow-amber-550/5',
                    received: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20 shadow-sm shadow-emerald-550/5',
                    cancelled: 'bg-rose-500/10 text-rose-455 border-rose-500/20'
                };
                const cls = statusMap[row.status] || 'bg-slate-800 text-slate-350';
                const totalOrdered = row.items ? row.items.reduce((sum, item) => sum + item.quantity_ordered, 0) : 0;
                const totalReceived = row.items ? row.items.reduce((sum, item) => sum + item.quantity_received, 0) : 0;
                const showProgress = ['ordered', 'partially_received', 'received'].includes(row.status) && totalOrdered > 0;

                return (
                    <div className="space-y-1">
                        <span className={`inline-flex px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${cls}`}>
                            {row.status_label || row.status}
                        </span>
                        {showProgress && (
                            <div className="text-[9px] text-slate-500 font-bold font-mono text-center mt-1">
                                {totalReceived}/{totalOrdered} ({Math.round((totalReceived / totalOrdered) * 100)}%)
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => setViewingPO(row)}
                        className="p-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-850 hover:border-slate-800 rounded-lg text-slate-450 hover:text-slate-200 transition-colors"
                        title="View PO Details"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>
                    {row.status === 'draft' && (
                        <>
                            <button
                                onClick={(e) => handleEditOpen(row, e)}
                                className="p-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-850 hover:border-slate-800 rounded-lg text-slate-450 hover:text-slate-200 transition-colors"
                                title="Edit Draft PO"
                            >
                                <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => handleDeleteOpen(row, e)}
                                className="p-2 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-900/35 hover:border-rose-900/60 rounded-lg text-rose-400 hover:text-rose-350 transition-colors"
                                title="Delete Draft PO"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                    {['ordered', 'partially_received'].includes(row.status) && (
                        <button
                            onClick={() => handleReceiveOpen(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-2 bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500 rounded-lg text-[10px] font-bold text-white transition-colors"
                            title="Receive Stock items"
                        >
                            <Truck className="w-3 h-3" />
                            <span>Receive</span>
                        </button>
                    )}
                </div>
            )
        }
    ];

    // Detail page item list columns
    const itemColumns = [
        {
            key: 'product',
            header: 'Catalog Item',
            render: (row) => {
                const name = row.product?.name || 'Unknown Product';
                const variationLabel = row.variation 
                    ? `Traits: ${[row.variation.size ? `Size ${row.variation.size}` : '', row.variation.color ? `Color ${row.variation.color}` : ''].filter(Boolean).join(' | ')}`
                    : null;
                return (
                    <div>
                        <div className="font-bold text-slate-200">{name}</div>
                        {variationLabel && <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{variationLabel}</div>}
                    </div>
                );
            }
        },
        {
            key: 'quantity_ordered',
            header: 'Ordered Quantity',
            className: 'text-center',
            render: (row) => (
                <span className="font-bold text-slate-350">{row.quantity_ordered} units</span>
            )
        },
        {
            key: 'quantity_received',
            header: 'Received Quantity',
            className: 'text-center',
            render: (row) => {
                const complete = row.quantity_received >= row.quantity_ordered;
                return (
                    <span className={`inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                        complete 
                            ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                            : row.quantity_received > 0 
                                ? 'bg-amber-500/10 text-amber-450 border-amber-500/20' 
                                : 'bg-slate-950/40 text-slate-500 border-slate-800'
                    }`}>
                        {row.quantity_received} / {row.quantity_ordered} received
                    </span>
                );
            }
        },
        {
            key: 'unit_cost',
            header: 'Unit Cost',
            className: 'text-right',
            render: (row) => (
                <span className="font-mono text-slate-300 font-bold block text-right">${parseFloat(row.unit_cost).toFixed(2)}</span>
            )
        },
        {
            key: 'total_cost',
            header: 'Line Total',
            className: 'text-right',
            render: (row) => (
                <span className="font-mono text-indigo-400 font-bold block text-right">
                    ${(row.quantity_ordered * row.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            )
        }
    ];

    const headerActions = (
        <Button 
            variant="primary" 
            size="md" 
            icon={Plus} 
            onClick={handleCreateOpen}
        >
            New Purchase Order
        </Button>
    );

    // Sum total for PO creation
    const calculatedFormTotal = formItems.reduce((sum, item) => {
        return sum + (Number(item.quantity_ordered || 0) * parseFloat(item.unit_cost || 0));
    }, 0);

    // Calculate page stats dynamically
    const statsTotalSpent = purchaseOrders.reduce((sum, po) => {
        return po.status !== 'cancelled' ? sum + parseFloat(po.total_amount || 0) : sum;
    }, 0);
    const statsPendingCount = purchaseOrders.filter(po => ['ordered', 'partially_received'].includes(po.status)).length;
    const statsReceivedCount = purchaseOrders.filter(po => po.status === 'received').length;

    return (
        <div className="space-y-6">
            {!viewingPO ? (
                // LIST VIEW
                <PageWrapper
                    title="Purchase Orders Ledger"
                    subtitle="Acquire physical catalog stock, trace wholesale invoices, and handle receiving docks."
                    breadcrumbs={[{ label: "Overview", path: "/dashboard" }, { label: "Purchase Orders" }]}
                    actions={headerActions}
                >
                    <div className="space-y-6">
                        
                        {/* Financial Statistics Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Card 1: Total Value */}
                            <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Total Purchases</span>
                                    <span className="text-2xl font-black font-mono tracking-tight block text-indigo-400">
                                        ${statsTotalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shrink-0">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Card 2: Total Orders */}
                            <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Total Orders</span>
                                    <span className="text-2xl font-black block text-slate-200 font-mono">
                                        {purchaseOrders.length}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Card 3: Pending Shipments */}
                            <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Pending Cargo</span>
                                    <span className="text-2xl font-black block text-amber-450 font-mono">
                                        {statsPendingCount}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shrink-0">
                                    <Truck className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Card 4: Completed Orders */}
                            <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Fully Received</span>
                                    <span className="text-2xl font-black block text-emerald-400 font-mono">
                                        {statsReceivedCount}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-455 shrink-0">
                                    <CheckSquare className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <Filters
                            searchPlaceholder="Search POs by supplier..."
                            searchValue={searchQuery}
                            onSearchChange={setSearchQuery}
                            onReset={resetFilters}
                        >
                            {/* Supplier Select */}
                            <div className="w-full sm:w-48">
                                <select
                                    value={supplierFilter}
                                    onChange={(e) => setSupplierFilter(e.target.value)}
                                    className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-350 outline-none focus:border-indigo-500/80 transition-colors"
                                >
                                    <option value="all">All Wholesalers</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.company_name || s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Product Filter */}
                            <div className="w-full sm:w-48">
                                <select
                                    value={productFilter}
                                    onChange={(e) => setProductFilter(e.target.value)}
                                    className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-350 outline-none focus:border-indigo-500/80 transition-colors"
                                >
                                    <option value="all">All Catalog Products</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div className="w-full sm:w-44">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-350 outline-none focus:border-indigo-500/80 transition-colors"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="draft">Drafts</option>
                                    <option value="ordered">Ordered</option>
                                    <option value="partially_received">Partially Received</option>
                                    <option value="received">Received</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </Filters>

                        {/* Table */}
                        {isLoading ? (
                            <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                                <div className="h-6 bg-slate-800/30 w-1/4 rounded-md"></div>
                                <div className="space-y-3">
                                    <Skeleton variant="text" />
                                    <Skeleton variant="text" className="w-11/12" />
                                    <Skeleton variant="text" className="w-10/12" />
                                </div>
                            </div>
                        ) : purchaseOrders.length === 0 ? (
                            <EmptyState 
                                title="No purchase orders found" 
                                description="Adjust your search criteria, or create a brand new draft purchase order to order stock."
                                action={
                                    <Button variant="secondary" size="sm" onClick={resetFilters}>
                                        Reset Filters
                                    </Button>
                                }
                            />
                        ) : (
                            <Table
                                columns={columns}
                                data={purchaseOrders}
                                isLoading={false}
                                totalRecords={totalRecords}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>
                </PageWrapper>
            ) : isReceiving ? (
                // STOCK RECEIVING WORKSPACE
                <PageWrapper
                    title={`Dock Stock Receipt: #PO-${viewingPO.id}`}
                    subtitle="Acknowledge incoming cargo inventory, select a branch warehouse destination, and record received items."
                    breadcrumbs={[
                        { label: "Overview", path: "/dashboard" }, 
                        { label: "Purchase Orders", onClick: () => { setIsReceiving(false); setViewingPO(null); } },
                        { label: `#PO-${viewingPO.id}`, onClick: () => setIsReceiving(false) },
                        { label: "Receive Stock" }
                    ]}
                    actions={
                        <div className="flex gap-2">
                            <Button 
                                variant="secondary" 
                                size="md" 
                                icon={ChevronLeft} 
                                onClick={() => setIsReceiving(false)}
                            >
                                Back to Details
                            </Button>
                            <Button 
                                variant="primary" 
                                size="md" 
                                icon={CheckSquare} 
                                loading={submitting}
                                onClick={handleReceiveSubmit}
                            >
                                Record Receipt
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {receiveErrors.general && (
                            <div className="p-4 bg-rose-500/10 text-rose-450 text-xs font-bold rounded-xl border border-rose-500/25 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                                <span>{receiveErrors.general}</span>
                            </div>
                        )}

                        {/* Dashboard header details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Wholesaler */}
                            <div className="p-5 border rounded-2xl bg-slate-900/40 border-slate-850 backdrop-blur-md space-y-2">
                                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Wholesaler Partner</span>
                                <p className="font-bold text-slate-200 text-sm">{viewingPO.supplier?.company_name || viewingPO.supplier?.name}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">Contact: {viewingPO.supplier?.name}</p>
                            </div>

                            {/* Card 2: Branch Selector */}
                            <div className="p-5 border rounded-2xl bg-slate-900/40 border-slate-850 backdrop-blur-md space-y-2">
                                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Destination Warehouse Branch *</span>
                                <select
                                    value={receiveBranchId}
                                    onChange={(e) => setReceiveBranchId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500/85 transition-colors mt-1"
                                >
                                    <option value="" disabled>Choose location...</option>
                                    {branches.filter(b => b.is_active).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                {receiveErrors.branch_id && <p className="text-[9px] font-semibold text-red-400 mt-1">{receiveErrors.branch_id}</p>}
                            </div>

                            {/* Card 3: Receiving Stats */}
                            <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex flex-col justify-center space-y-2">
                                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Receiving Summary</span>
                                <div className="flex justify-between items-center text-xs pt-1.5">
                                    <span className="text-slate-400">Total lines to receive:</span>
                                    <span className="font-bold text-slate-200">
                                        {viewingPO.items.filter(i => (i.quantity_ordered - i.quantity_received) > 0).length} items
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Status:</span>
                                    <span className="text-indigo-400 font-bold uppercase tracking-wider text-[10px]">Processing Dock</span>
                                </div>
                            </div>
                        </div>

                        {/* Cargo lines Table */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <ShoppingBag className="w-4.5 h-4.5 text-indigo-400" />
                                Line Item Cargo Manifest
                            </h3>

                            <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 shadow-xl backdrop-blur-xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs font-semibold" style={{ minWidth: '800px' }}>
                                        <thead>
                                            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Catalog Product</th>
                                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-center">Ordered</th>
                                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-center">Received So Far</th>
                                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-center">Pending Qty</th>
                                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-center" style={{ width: '220px' }}>Qty To Receive Now</th>
                                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">Line Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-850 text-slate-300">
                                            {viewingPO.items.map((item) => {
                                                const remaining = item.quantity_ordered - item.quantity_received;
                                                const isDone = remaining <= 0;
                                                const valNow = receiveQuantities[item.id] || 0;
                                                
                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-950/20 transition-colors">
                                                        <td className="py-4 px-4">
                                                            <div className="font-bold text-slate-200">{item.product?.name}</div>
                                                            {item.variation && (
                                                                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                                                    Traits: {[item.variation.size ? `Size ${item.variation.size}` : '', item.variation.color ? `Color ${item.variation.color}` : ''].filter(Boolean).join(' | ')}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-4 text-center font-bold text-slate-350">{item.quantity_ordered}</td>
                                                        <td className="py-4 px-4 text-center">
                                                            <span className={`inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                                                                isDone 
                                                                    ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                                                                    : item.quantity_received > 0 
                                                                        ? 'bg-amber-500/10 text-amber-450 border-amber-500/20' 
                                                                        : 'bg-slate-950/40 text-slate-500 border-slate-800'
                                                            }`}>
                                                                {item.quantity_received} received
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 text-center font-mono font-bold text-indigo-400">{remaining} units</td>
                                                        <td className="py-4 px-4 text-center">
                                                            {isDone ? (
                                                                <span className="text-slate-500 text-xs italic">Manifest complete</span>
                                                            ) : (
                                                                <div className="flex flex-col items-center">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={remaining}
                                                                        value={valNow}
                                                                        onChange={(e) => setReceiveQuantities({
                                                                            ...receiveQuantities,
                                                                            [item.id]: Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0))
                                                                        })}
                                                                        className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-slate-200 text-center outline-none focus:border-indigo-500 transition-colors"
                                                                    />
                                                                    {receiveErrors[`item_${item.id}`] && (
                                                                        <span className="text-[9px] text-rose-400 mt-1 font-bold">{receiveErrors[`item_${item.id}`]}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-4 text-right">
                                                            {!isDone && (
                                                                <div className="flex justify-end gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setReceiveQuantities({
                                                                            ...receiveQuantities,
                                                                            [item.id]: remaining
                                                                        })}
                                                                        className="px-2 py-1 border border-indigo-500/30 hover:border-indigo-500 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                                                    >
                                                                        Receive All
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setReceiveQuantities({
                                                                            ...receiveQuantities,
                                                                            [item.id]: 0
                                                                        })}
                                                                        className="px-2 py-1 border border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] font-bold transition-all"
                                                                    >
                                                                        Reset
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </PageWrapper>
            ) : (
                // DETAILED PROFILE VIEW
                <PageWrapper
                    title={`Purchase Order #PO-${viewingPO.id}`}
                    subtitle={`Manage supplier shipping ledger and dock stock receipts.`}
                    breadcrumbs={[
                        { label: "Overview", path: "/dashboard" }, 
                        { label: "Purchase Orders", onClick: () => setViewingPO(null) },
                        { label: `#PO-${viewingPO.id}` }
                    ]}
                    actions={
                        <Button 
                            variant="secondary" 
                            size="md" 
                            icon={ChevronLeft} 
                            onClick={() => setViewingPO(null)}
                        >
                            Back to Ledger
                        </Button>
                    }
                >
                    <div className="space-y-6">
                        
                        {/* Visual Workflow Status Stepper */}
                        {viewingPO.status === 'cancelled' ? (
                            <div className="p-4 bg-rose-500/10 text-rose-450 text-xs font-bold rounded-2xl border border-rose-500/20 flex items-center gap-3">
                                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                                <div>
                                    <p className="font-bold text-slate-200">Purchase Order Cancelled</p>
                                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">This transaction has been terminated. No further inventory adjustments or stock intakes can be processed against this manifest.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 border rounded-2xl bg-slate-900/40 border-slate-850 backdrop-blur-md">
                                <div className="flex items-center justify-between max-w-3xl mx-auto relative">
                                    
                                    {/* Horizontal Connection Lines */}
                                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-10"></div>
                                    <div 
                                        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-500 transition-all duration-500 -z-10"
                                        style={{
                                            width: 
                                                viewingPO.status === 'draft' ? '0%' :
                                                viewingPO.status === 'ordered' ? '33.33%' :
                                                viewingPO.status === 'partially_received' ? '66.66%' : '100%'
                                        }}
                                    ></div>

                                    {/* Step 1: Draft */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                                            ['draft', 'ordered', 'partially_received', 'received'].includes(viewingPO.status)
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                : 'bg-slate-950 border-slate-800 text-slate-500'
                                        }`}>
                                            1
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Draft Created</span>
                                    </div>

                                    {/* Step 2: Ordered */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                                            ['ordered', 'partially_received', 'received'].includes(viewingPO.status)
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                : viewingPO.status === 'draft'
                                                    ? 'bg-slate-950 border-slate-800 text-slate-500 animate-pulse'
                                                    : 'bg-slate-950 border-slate-800 text-slate-500'
                                        }`}>
                                            2
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Released</span>
                                    </div>

                                    {/* Step 3: Partially Received */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                                            ['partially_received', 'received'].includes(viewingPO.status)
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                : viewingPO.status === 'ordered'
                                                    ? 'bg-slate-950 border-slate-800 text-slate-500 animate-pulse'
                                                    : 'bg-slate-950 border-slate-800 text-slate-500'
                                        }`}>
                                            3
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receiving Dock</span>
                                    </div>

                                    {/* Step 4: Completed */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                                            viewingPO.status === 'received'
                                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                : viewingPO.status === 'partially_received'
                                                    ? 'bg-slate-950 border-slate-800 text-slate-550 animate-pulse'
                                                    : 'bg-slate-950 border-slate-800 text-slate-500'
                                        }`}>
                                            4
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</span>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* Overall unit receiving progress bar */}
                        {['ordered', 'partially_received', 'received'].includes(viewingPO.status) && (
                            <div className="space-y-2 p-5 border rounded-2xl bg-slate-900/40 border-slate-850 text-xs shadow-md">
                                <div className="flex justify-between font-bold text-slate-400">
                                    <span className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-indigo-400" />
                                        Cargo Delivery Progress
                                    </span>
                                    <span className="font-mono text-indigo-400">
                                        {viewingPO.items.reduce((sum, i) => sum + i.quantity_received, 0)} / {viewingPO.items.reduce((sum, i) => sum + i.quantity_ordered, 0)} units ({
                                            Math.round((viewingPO.items.reduce((sum, i) => sum + i.quantity_received, 0) / viewingPO.items.reduce((sum, i) => sum + i.quantity_ordered, 0)) * 100)
                                        }%) received
                                    </span>
                                </div>
                                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${(viewingPO.items.reduce((sum, i) => sum + i.quantity_received, 0) / viewingPO.items.reduce((sum, i) => sum + i.quantity_ordered, 0)) * 100}%`
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {/* Upper summary cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Card 1: Supplier file */}
                            <div className="p-6 border rounded-2xl bg-slate-900/40 border-slate-850 backdrop-blur-md space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-indigo-400" />
                                    Wholesale Partner
                                </h3>
                                <div className="text-xs space-y-2">
                                    <p className="font-bold text-slate-200 text-sm">{viewingPO.supplier?.company_name || viewingPO.supplier?.name}</p>
                                    <p className="text-slate-400">Account Contact: <strong className="text-slate-300">{viewingPO.supplier?.name}</strong></p>
                                    <p className="text-slate-500">Ordered by Operator: <strong className="text-slate-350">{viewingPO.user?.name || 'System'}</strong></p>
                                </div>
                            </div>

                            {/* Card 2: Financial Stats */}
                            <div className="p-6 border rounded-2xl bg-slate-900/40 border-slate-850 backdrop-blur-md space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-indigo-400" />
                                    Order Accounting
                                </h3>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Total Order Cost</span>
                                    <span className="text-2xl font-black font-mono text-indigo-400 block">
                                        ${parseFloat(viewingPO.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Card 3: Workflow Actions */}
                            <div className="p-6 border rounded-2xl bg-slate-900/40 border-slate-850 backdrop-blur-md space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                                    Workflow Management
                                </h3>
                                <div className="flex flex-col gap-2 pt-1.5">
                                    {viewingPO.status === 'draft' && (
                                        <>
                                            <Button 
                                                variant="primary" 
                                                size="sm" 
                                                icon={ArrowUpRight} 
                                                onClick={() => handleTransitionStatus(viewingPO, 'ordered')}
                                            >
                                                Send Order
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    icon={Edit} 
                                                    onClick={(e) => handleEditOpen(viewingPO, e)}
                                                    className="flex-1"
                                                >
                                                    Edit Draft
                                                </Button>
                                                <Button 
                                                    variant="danger" 
                                                    size="sm" 
                                                    icon={Trash2} 
                                                    onClick={(e) => handleDeleteOpen(viewingPO, e)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </>
                                    )}

                                    {['ordered', 'partially_received'].includes(viewingPO.status) && (
                                        <>
                                            <Button 
                                                variant="primary" 
                                                size="sm" 
                                                icon={Truck} 
                                                onClick={() => handleReceiveOpen(viewingPO)}
                                            >
                                                Receive Dock Cargo
                                            </Button>
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                icon={XCircle} 
                                                onClick={() => handleTransitionStatus(viewingPO, 'cancelled')}
                                                className="hover:text-rose-400 hover:border-rose-950"
                                            >
                                                Cancel Order
                                            </Button>
                                        </>
                                    )}

                                    {['received', 'cancelled'].includes(viewingPO.status) && (
                                        <div className="text-xs text-slate-500 italic flex items-center gap-1.5 p-2 bg-slate-950/40 rounded-xl border border-slate-850">
                                            <AlertTriangle className="w-4 h-4 text-slate-600" />
                                            <span>PO in terminal state: {viewingPO.status_label || viewingPO.status}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Items Table Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <ShoppingBag className="w-4.5 h-4.5 text-indigo-400" />
                                Purchase Order Items Checklist
                            </h3>

                            <Table
                                columns={itemColumns}
                                data={viewingPO.items || []}
                                isLoading={false}
                                totalRecords={viewingPO.items?.length || 0}
                                totalPages={1}
                            />
                        </div>

                        {/* Notes card */}
                        {viewingPO.notes && (
                            <div className="p-5 border rounded-2xl bg-slate-900/40 border-slate-850 text-xs space-y-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Internal PO notes</span>
                                <p className="text-slate-400 italic leading-relaxed">"{viewingPO.notes}"</p>
                            </div>
                        )}
                    </div>
                </PageWrapper>
            )}

            {/* CREATE / EDIT PO DRAFT MODAL */}
            <Modal
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                title={currentPO ? `Modify Draft PO #PO-${currentPO.id}` : 'Create New Purchase Order'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            size="sm" 
                            loading={submitting} 
                            onClick={handleFormSubmit}
                        >
                            {currentPO ? 'Save Changes' : 'Create Draft'}
                        </Button>
                    </>
                }
            >
                <form className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                            <SearchableSelect
                                label="Supplier Wholesaler *"
                                placeholder="Choose partner..."
                                value={formSupplierId}
                                onChange={(val) => setFormSupplierId(val)}
                                options={suppliers.filter(s => s.is_active || s.id === Number(formSupplierId)).map(s => ({
                                    value: s.id,
                                    label: s.company_name || s.name,
                                    sublabel: s.company_name ? `Contact: ${s.name} | Phone: ${s.phone || 'N/A'}` : `Phone: ${s.phone || 'N/A'}`
                                }))}
                                error={formErrors.supplier_id}
                                icon={Truck}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Initial Status</label>
                            <select
                                value={formStatus}
                                onChange={(e) => setFormStatus(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500/80 transition-colors"
                                disabled={!!currentPO} // Status changes are run via workflow actions in detail view
                            >
                                <option value="draft">Draft (Saved)</option>
                                <option value="ordered">Ordered (Released)</option>
                            </select>
                        </div>
                    </div>

                    {/* ITEMS SUB-TABLE */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Purchase Items Table</span>
                            <Button 
                                type="button" 
                                variant="secondary" 
                                size="xs" 
                                icon={Plus} 
                                onClick={addFormItemRow}
                            >
                                Add Line
                            </Button>
                        </div>

                        {formErrors.items && <p className="text-[10px] font-semibold text-red-400">{formErrors.items}</p>}

                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {formItems.map((item, idx) => {
                                const selectedProd = products.find(p => p.id === Number(item.product_id));
                                const hasVariations = selectedProd && selectedProd.variations && selectedProd.variations.length > 0;
                                
                                return (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-950/40 border border-slate-850 rounded-xl items-start sm:items-center">
                                        
                                        {/* Product Select */}
                                        <div className="flex-1 w-full">
                                            <SearchableSelect
                                                placeholder="Select catalog product..."
                                                value={item.product_id}
                                                onChange={(val) => updateFormItemRow(idx, 'product_id', val)}
                                                options={products.map(p => ({
                                                    value: p.id,
                                                    label: p.name,
                                                    sublabel: p.sku ? `SKU: ${p.sku} | Cost: $${parseFloat(p.cost_price || 0).toFixed(2)}` : `Cost: $${parseFloat(p.cost_price || 0).toFixed(2)}`
                                                }))}
                                                error={formErrors[`item_${idx}_product`]}
                                            />
                                        </div>

                                        {/* Variation Select */}
                                        {hasVariations && (
                                            <div className="w-full sm:w-36">
                                                <select
                                                    value={item.product_variation_id}
                                                    onChange={(e) => updateFormItemRow(idx, 'product_variation_id', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-[11px] font-medium text-slate-200 outline-none focus:border-indigo-500/80 transition-colors"
                                                >
                                                    {selectedProd.variations.map(v => (
                                                        <option key={v.id} value={v.id}>
                                                            {[v.size ? `Size ${v.size}` : '', v.color ? `Color ${v.color}` : ''].filter(Boolean).join(' / ')}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Qty */}
                                        <div className="w-full sm:w-20">
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Qty"
                                                value={item.quantity_ordered}
                                                onChange={(e) => updateFormItemRow(idx, 'quantity_ordered', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-[11px] font-medium text-slate-200 text-center outline-none focus:border-indigo-500/80 transition-colors"
                                            />
                                            {formErrors[`item_${idx}_qty`] && <span className="text-[9px] text-red-400 mt-1 block">{formErrors[`item_${idx}_qty`]}</span>}
                                        </div>

                                        {/* Unit Cost */}
                                        <div className="w-full sm:w-28 relative">
                                            <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500 pointer-events-none text-[11px]">$</span>
                                            <input
                                                type="text"
                                                placeholder="0.00"
                                                value={item.unit_cost}
                                                onChange={(e) => updateFormItemRow(idx, 'unit_cost', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-2.5 py-2 text-[11px] font-mono text-slate-250 outline-none focus:border-indigo-500/80 transition-colors"
                                            />
                                            {formErrors[`item_${idx}_cost`] && <span className="text-[9px] text-red-400 mt-1 block">{formErrors[`item_${idx}_cost`]}</span>}
                                        </div>

                                        {/* Total cost indicator */}
                                        <div className="hidden sm:block text-right w-20 text-[11px] font-mono font-bold text-slate-400">
                                            ${((item.quantity_ordered || 0) * (parseFloat(item.unit_cost) || 0)).toFixed(2)}
                                        </div>

                                        {/* Remove button */}
                                        <button
                                            type="button"
                                            onClick={() => removeFormItemRow(idx)}
                                            className="p-2 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-900/35 hover:border-rose-900/60 rounded-lg text-rose-400 hover:text-rose-350 transition-colors shrink-0 self-end sm:self-center"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-850 pt-4">
                        <div className="text-xs font-bold text-slate-400">
                            Total Items: <span className="text-slate-200">{formItems.length} lines</span>
                        </div>
                        <div className="text-sm font-black font-mono text-slate-200 flex items-center gap-2">
                            <span>Estimated Total Amount:</span>
                            <span className="text-indigo-400 text-lg">${calculatedFormTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <Textarea
                        label="Internal Purchase order Comments"
                        id="form-notes"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Log shipping timelines, freight pricing details or invoice codes..."
                    />
                </form>
            </Modal>



            {/* DELETE PO DRAFT CONFIRMATION */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Cancel & Delete Draft PO"
                footer={
                    <>
                        <Button variant="secondary" size="sm" onClick={() => setDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="danger" 
                            size="sm" 
                            loading={submitting} 
                            onClick={handleConfirmDelete}
                        >
                            Delete Order
                        </Button>
                    </>
                }
            >
                <div className="space-y-2">
                    <p className="font-semibold text-slate-200">Are you sure you want to delete this purchase order draft?</p>
                    <p className="text-slate-400">
                        This will permanently delete draft order <strong className="text-white">#PO-{currentPO?.id}</strong>. Items will not be added to stock. This action cannot be undone.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
