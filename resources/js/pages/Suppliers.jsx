import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Filters from '../components/Filters';
import { Input, Textarea, Checkbox } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
    Truck, Plus, Edit, Trash2, ToggleLeft, ToggleRight,
    Search, Mail, Phone, MapPin, FileText, ChevronLeft,
    Building, AlertCircle, Calendar, CreditCard, RefreshCw
} from 'lucide-react';

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Detail / Profile state
    const [viewingSupplier, setViewingSupplier] = useState(null);
    const [supplierOrders, setSupplierOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentSupplier, setCurrentSupplier] = useState(null); // for editing/deleting

    // Form fields
    const [formName, setFormName] = useState('');
    const [formCompanyName, setFormCompanyName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formBalance, setFormBalance] = useState('0.00');
    const [formNotes, setFormNotes] = useState('');
    const [formIsActive, setFormIsActive] = useState(true);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Fetch suppliers list
    const fetchSuppliers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: currentPage,
                per_page: pageSize,
                search: searchQuery || undefined,
                is_active: statusFilter !== 'all' ? (statusFilter === 'active' ? 1 : 0) : undefined
            };
            const response = await axios.get('/api/suppliers', { params });
            setSuppliers(response.data.data);
            setTotalPages(response.data.last_page);
            setTotalRecords(response.data.total);
        } catch (err) {
            console.error('Failed to fetch suppliers.', err);
            setError(err.response?.data?.message || 'Failed to load suppliers. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch orders for active profile
    const fetchSupplierOrders = async (supplierId) => {
        setLoadingOrders(true);
        try {
            const response = await axios.get('/api/purchase-orders', {
                params: { supplier_id: supplierId, per_page: 50 }
            });
            setSupplierOrders(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch supplier purchase orders.', err);
            setError(err.response?.data?.message || 'Failed to load purchase orders for this supplier. Please try again.');
        } finally {
            setLoadingOrders(false);
        }
    };

    useEffect(() => {
        if (!viewingSupplier) {
            fetchSuppliers();
        } else {
            fetchSupplierOrders(viewingSupplier.id);
        }
    }, [currentPage, statusFilter, viewingSupplier]);

    // Handle search triggering with timeout/reset page
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setCurrentPage(1);
            if (!viewingSupplier) {
                fetchSuppliers();
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    // Open create modal
    const handleCreateOpen = () => {
        setCurrentSupplier(null);
        setFormName('');
        setFormCompanyName('');
        setFormEmail('');
        setFormPhone('');
        setFormAddress('');
        setFormBalance('0.00');
        setFormNotes('');
        setFormIsActive(true);
        setFormErrors({});
        setModalOpen(true);
    };

    // Open edit modal
    const handleEditOpen = (supplier, e) => {
        if (e) e.stopPropagation(); // Prevent opening profile
        setCurrentSupplier(supplier);
        setFormName(supplier.name);
        setFormCompanyName(supplier.company_name || '');
        setFormEmail(supplier.email || '');
        setFormPhone(supplier.phone || '');
        setFormAddress(supplier.address || '');
        setFormBalance(parseFloat(supplier.balance || 0).toFixed(2));
        setFormNotes(supplier.notes || '');
        setFormIsActive(!!supplier.is_active);
        setFormErrors({});
        setModalOpen(true);
    };

    // Open delete confirm modal
    const handleDeleteOpen = (supplier, e) => {
        if (e) e.stopPropagation(); // Prevent opening profile
        setCurrentSupplier(supplier);
        setDeleteModalOpen(true);
    };

    // Toggle status inline
    const handleToggleStatus = async (supplier, e) => {
        if (e) e.stopPropagation();
        try {
            const response = await axios.patch(`/api/suppliers/${supplier.id}/toggle-status`);
            const updated = response.data.supplier;
            setSuppliers(suppliers.map(s => s.id === supplier.id ? { ...s, is_active: updated.is_active } : s));
            if (viewingSupplier && viewingSupplier.id === supplier.id) {
                setViewingSupplier({ ...viewingSupplier, is_active: updated.is_active });
            }
        } catch (err) {
            console.error('Failed to toggle supplier status.', err);
            alert(err.response?.data?.message || 'Failed to update supplier status. Please try again.');
        }
    };

    // Submit Create/Edit
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});

        // Validations
        const errors = {};
        if (!formName.trim()) errors.name = 'Supplier Contact Name is required';
        if (formEmail && !/\S+@\S+\.\S+/.test(formEmail)) errors.email = 'Please enter a valid email address';
        if (formBalance && isNaN(parseFloat(formBalance))) errors.balance = 'Balance must be a valid number';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        const payload = {
            name: formName,
            company_name: formCompanyName || null,
            email: formEmail || null,
            phone: formPhone || null,
            address: formAddress || null,
            balance: parseFloat(formBalance || 0),
            notes: formNotes || null,
            is_active: formIsActive
        };

        try {
            if (currentSupplier) {
                // Update
                const response = await axios.put(`/api/suppliers/${currentSupplier.id}`, payload);
                const updated = response.data;
                setSuppliers(suppliers.map(s => s.id === currentSupplier.id ? updated : s));
                if (viewingSupplier && viewingSupplier.id === currentSupplier.id) {
                    setViewingSupplier(updated);
                }
            } else {
                // Create
                const response = await axios.post('/api/suppliers', payload);
                setSuppliers([...suppliers, response.data]);
            }
            setModalOpen(false);
        } catch (err) {
            if (err.response?.status === 422) {
                setFormErrors(err.response.data.errors || {});
            } else {
                console.error('Failed to save supplier.', err);
                alert(err.response?.data?.message || 'Failed to save supplier. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Confirm Delete
    const handleConfirmDelete = async () => {
        if (!currentSupplier) return;
        setSubmitting(true);
        try {
            await axios.delete(`/api/suppliers/${currentSupplier.id}`);
            setSuppliers(suppliers.filter(s => s.id !== currentSupplier.id));
            if (viewingSupplier && viewingSupplier.id === currentSupplier.id) {
                setViewingSupplier(null);
            }
        } catch (err) {
            console.error('Failed to delete supplier.', err);
            alert(err.response?.data?.message || 'Failed to delete supplier. Please try again.');
        } finally {
            setSubmitting(false);
            setDeleteModalOpen(false);
        }
    };

    // Columns config for main suppliers table
    const columns = [
        {
            key: 'name',
            header: 'Supplier / Company',
            render: (row) => (
                <div 
                    onClick={() => setViewingSupplier(row)}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center font-bold text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shadow-md">
                        {row.company_name ? row.company_name.charAt(0) : row.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                            {row.company_name || 'No Company Name'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                            <span>Contact: {row.name}</span>
                            {row.email && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                    <span className="truncate max-w-[120px]">{row.email}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'contact',
            header: 'Phone / Location',
            render: (row) => (
                <div className="space-y-0.5">
                    {row.phone ? (
                        <div className="flex items-center gap-1 text-slate-350">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{row.phone}</span>
                        </div>
                    ) : (
                        <span className="text-slate-600 italic">No phone</span>
                    )}
                    {row.address && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold truncate max-w-[200px]">
                            <MapPin className="w-3 h-3 text-slate-650 shrink-0" />
                            <span>{row.address}</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'balance',
            header: 'Outstanding Balance',
            className: 'text-right',
            render: (row) => {
                const balanceVal = parseFloat(row.balance || 0);
                const hasBalance = balanceVal > 0;
                return (
                    <div className="text-right">
                        <span className={`inline-flex px-2.5 py-1.5 rounded-lg border text-xs font-bold font-mono tracking-wide ${
                            hasBalance 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-sm shadow-rose-500/5' 
                                : 'bg-slate-950/40 text-slate-500 border-slate-800'
                        }`}>
                            ${balanceVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (row) => (
                <button
                    onClick={(e) => handleToggleStatus(row, e)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all hover:scale-102 ${
                        row.is_active
                            ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-455 border-rose-500/20'
                    }`}
                >
                    {row.is_active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-rose-400" />}
                    <span>{row.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                </button>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={(e) => handleEditOpen(row, e)}
                        className="p-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-850 hover:border-slate-800 rounded-lg text-slate-450 hover:text-slate-200 transition-colors"
                        title="Edit supplier"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => handleDeleteOpen(row, e)}
                        className="p-2 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-900/35 hover:border-rose-900/60 rounded-lg text-rose-400 hover:text-rose-350 transition-colors"
                        title="Delete supplier"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )
        }
    ];

    // Profile page Purchase Orders table columns
    const orderColumns = [
        {
            key: 'id',
            header: 'Order Code',
            render: (row) => (
                <span className="font-mono text-indigo-400 font-bold">#PO-{row.id}</span>
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
            key: 'user',
            header: 'Ordered By',
            render: (row) => (
                <span className="text-slate-300 font-semibold">{row.user?.name || 'System Operator'}</span>
            )
        },
        {
            key: 'total_amount',
            header: 'Total Cost',
            className: 'text-right',
            render: (row) => (
                <span className="font-mono font-bold text-slate-200 text-right block">
                    ${parseFloat(row.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Workflow Status',
            render: (row) => {
                const statusMap = {
                    draft: 'bg-slate-800 text-slate-400 border-slate-700/50',
                    ordered: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    partially_received: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    received: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                };
                const cls = statusMap[row.status] || 'bg-slate-800 text-slate-350';
                return (
                    <span className={`inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${cls}`}>
                        {row.status_label || row.status}
                    </span>
                );
            }
        }
    ];

    // Page header actions
    const headerActions = (
        <Button 
            variant="primary" 
            size="md" 
            icon={Plus} 
            onClick={handleCreateOpen}
        >
            Add New Supplier
        </Button>
    );

    // Calculate aggregated profile stats
    const totalSpent = supplierOrders.reduce((sum, order) => {
        return order.status !== 'cancelled' ? sum + parseFloat(order.total_amount || 0) : sum;
    }, 0);
    const activeOrdersCount = supplierOrders.filter(order => ['ordered', 'partially_received', 'draft'].includes(order.status)).length;

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}
            {!viewingSupplier ? (
                // LIST VIEW
                <PageWrapper
                    title="Suppliers Ledger"
                    subtitle="Track wholesaler catalog contracts, company contacts, and outstanding accounting logs."
                    breadcrumbs={[{ label: "Overview", path: "/dashboard" }, { label: "Suppliers" }]}
                    actions={headerActions}
                >
                    <div className="space-y-6">
                        {/* Filters */}
                        <Filters
                            searchPlaceholder="Search suppliers by name, company, email..."
                            searchValue={searchQuery}
                            onSearchChange={setSearchQuery}
                            onReset={resetFilters}
                        >
                            {/* Status Filter */}
                            <div className="w-full sm:w-44">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-355 outline-none focus:border-indigo-500/80 transition-colors"
                                >
                                    <option value="all" className="bg-slate-900">All Statuses</option>
                                    <option value="active" className="bg-slate-900">Active Partners</option>
                                    <option value="inactive" className="bg-slate-900">Inactive Partners</option>
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
                        ) : suppliers.length === 0 ? (
                            <EmptyState 
                                title="No suppliers found" 
                                description="Adjust your filters, search for a different company, or register a new supply partner."
                                action={
                                    <Button variant="secondary" size="sm" onClick={resetFilters}>
                                        Reset Filters
                                    </Button>
                                }
                            />
                        ) : (
                            <Table
                                columns={columns}
                                data={suppliers}
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
            ) : (
                // PROFILE VIEW
                <PageWrapper
                    title={`${viewingSupplier.company_name || viewingSupplier.name}`}
                    subtitle={`Supplier Profile Dashboard • System Partner ID #${viewingSupplier.id}`}
                    breadcrumbs={[
                        { label: "Overview", path: "/dashboard" }, 
                        { label: "Suppliers", onClick: () => setViewingSupplier(null) },
                        { label: viewingSupplier.company_name || viewingSupplier.name }
                    ]}
                    actions={
                        <Button 
                            variant="secondary" 
                            size="md" 
                            icon={ChevronLeft} 
                            onClick={() => setViewingSupplier(null)}
                        >
                            Back to Ledger
                        </Button>
                    }
                >
                    <div className="space-y-6">
                        
                        {/* Financial Statistics row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Card 1: Balance Display */}
                            <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Outstanding Balance</span>
                                    <span className={`text-2xl font-black font-mono tracking-tight block ${
                                        parseFloat(viewingSupplier.balance || 0) > 0 ? 'text-rose-450' : 'text-slate-300'
                                    }`}>
                                        ${parseFloat(viewingSupplier.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className={`p-3 rounded-xl border shrink-0 ${
                                    parseFloat(viewingSupplier.balance || 0) > 0 
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                        : 'bg-slate-950/60 text-slate-500 border-slate-800'
                                }`}>
                                    <CreditCard className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Card 2: Total Spent */}
                            <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Total Purchases</span>
                                    <span className="text-2xl font-black font-mono tracking-tight block text-indigo-400">
                                        ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shrink-0">
                                    <RefreshCw className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Card 3: Total Orders */}
                            <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Total POs</span>
                                    <span className="text-2xl font-black block text-slate-200">
                                        {supplierOrders.length}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Card 4: Active Orders */}
                            <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">In-Transit / Draft</span>
                                    <span className="text-2xl font-black block text-amber-400">
                                        {activeOrdersCount}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shrink-0">
                                    <Truck className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        {/* Split profile section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {/* Left: Contact card & quick actions */}
                            <div className="space-y-6 lg:col-span-1">
                                <div className="p-6 border rounded-2xl bg-slate-900/40 border-slate-850 backdrop-blur-md space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Building className="w-4 h-4 text-indigo-400" />
                                            Partner Contact File
                                        </h3>
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-wide ${
                                            viewingSupplier.is_active 
                                                ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                                                : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'
                                        }`}>
                                            {viewingSupplier.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-4 text-xs">
                                        {/* Contact Name */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800">
                                                <span className="font-bold text-slate-455">ID</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Account Contact</span>
                                                <span className="font-bold text-slate-200">{viewingSupplier.name}</span>
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800">
                                                <Mail className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Email Address</span>
                                                {viewingSupplier.email ? (
                                                    <a href={`mailto:${viewingSupplier.email}`} className="font-semibold text-indigo-400 hover:underline">{viewingSupplier.email}</a>
                                                ) : (
                                                    <span className="text-slate-600 italic">None logged</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800">
                                                <Phone className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Phone Connection</span>
                                                {viewingSupplier.phone ? (
                                                    <span className="font-bold text-slate-300">{viewingSupplier.phone}</span>
                                                ) : (
                                                    <span className="text-slate-600 italic">None logged</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Address */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800">
                                                <MapPin className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Wholesale Address</span>
                                                {viewingSupplier.address ? (
                                                    <span className="font-medium text-slate-350 leading-relaxed block">{viewingSupplier.address}</span>
                                                ) : (
                                                    <span className="text-slate-600 italic">None logged</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Internal Notes */}
                                        <div className="pt-3 border-t border-slate-850">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Contract / Internal Notes</span>
                                            <p className="text-slate-400 italic leading-relaxed text-[11px]">
                                                {viewingSupplier.notes || '"No internal comments recorded for this wholesale partner yet."'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-4 border-t border-slate-850 flex gap-2">
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            icon={Edit} 
                                            onClick={(e) => handleEditOpen(viewingSupplier, e)}
                                            className="flex-1"
                                        >
                                            Edit Partner
                                        </Button>
                                        <Button 
                                            variant="danger" 
                                            size="sm" 
                                            icon={Trash2} 
                                            onClick={(e) => handleDeleteOpen(viewingSupplier, e)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Purchase Orders History Log */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-4.5 h-4.5 text-indigo-400" />
                                        Historical Purchase Orders
                                    </h3>
                                </div>

                                {loadingOrders ? (
                                    <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                                        <Skeleton variant="text" />
                                        <Skeleton variant="text" className="w-11/12" />
                                        <Skeleton variant="text" className="w-10/12" />
                                    </div>
                                ) : supplierOrders.length === 0 ? (
                                    <EmptyState 
                                        title="No purchase orders registered" 
                                        description="You have not created any purchase orders for this supplier. Go to Purchases to generate one."
                                    />
                                ) : (
                                    <Table
                                        columns={orderColumns}
                                        data={supplierOrders}
                                        isLoading={false}
                                        totalRecords={supplierOrders.length}
                                        totalPages={1}
                                    />
                                )}
                            </div>
                        </div>

                    </div>
                </PageWrapper>
            )}

            {/* Add / Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={currentSupplier ? 'Modify Supply Partner details' : 'Register New Wholesaler Partner'}
                footer={
                    <>
                        <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            size="sm" 
                            loading={submitting} 
                            onClick={handleFormSubmit}
                        >
                            {currentSupplier ? 'Save Changes' : 'Create Account'}
                        </Button>
                    </>
                }
            >
                <form className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Contact Full Name *"
                            id="form-name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="e.g. John Doe"
                            error={formErrors.name}
                            icon={Search}
                        />

                        <Input
                            label="Company Name"
                            id="form-company-name"
                            value={formCompanyName}
                            onChange={(e) => setFormCompanyName(e.target.value)}
                            placeholder="e.g. Apex Global Inc"
                            icon={Building}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Email Address"
                            id="form-email"
                            type="email"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            placeholder="e.g. contact@apex.com"
                            error={formErrors.email}
                            icon={Mail}
                        />

                        <Input
                            label="Phone Connection"
                            id="form-phone"
                            value={formPhone}
                            onChange={(e) => setFormPhone(e.target.value)}
                            placeholder="e.g. +1 555-1234"
                            icon={Phone}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Wholesale Address"
                            id="form-address"
                            value={formAddress}
                            onChange={(e) => setFormAddress(e.target.value)}
                            placeholder="e.g. Suite 120, Warehouse District"
                            icon={MapPin}
                        />

                        <Input
                            label="Outstanding Balance ($)"
                            id="form-balance"
                            value={formBalance}
                            onChange={(e) => setFormBalance(e.target.value)}
                            placeholder="0.00"
                            error={formErrors.balance}
                            icon={CreditCard}
                            disabled={!!currentSupplier} // Balance shouldn't be edited directly here normally, but in creation it sets initial
                            helperText={currentSupplier ? "Balance must be modified through orders and adjustments." : "Initial outstanding balance."}
                        />
                    </div>

                    <Textarea
                        label="Internal Notes / Contracts"
                        id="form-notes"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Log active discount rates, delivery SLAs or minimum item purchase thresholds..."
                    />

                    <div className="pt-2">
                        <Checkbox
                            label="Active Vendor Partner status"
                            description="Inactive partners cannot be associated with new purchase orders or drafts."
                            id="form-active"
                            checked={formIsActive}
                            onChange={(e) => setFormIsActive(e.target.checked)}
                        />
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Confirm Partner Deletion"
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
                            Delete Partner
                        </Button>
                    </>
                }
            >
                <div className="space-y-2">
                    <p className="font-semibold text-slate-200">Are you sure you want to delete this wholesale partner?</p>
                    <p className="text-slate-400">
                        This will permanently remove <strong className="text-white">{currentSupplier?.company_name || currentSupplier?.name}</strong>. Historical purchase logs will be preserved but decoupled. This action cannot be undone.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
