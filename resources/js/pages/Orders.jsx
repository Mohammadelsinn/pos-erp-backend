import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { 
    ShoppingBag, 
    Calendar, 
    User, 
    Building2, 
    CreditCard, 
    Eye, 
    XCircle, 
    Printer, 
    RotateCcw,
    Search
} from 'lucide-react';

export default function Orders() {
    // Dropdowns & lists
    const [orders, setOrders] = useState([]);
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [error, setError] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Filter states
    const [search, setSearch] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedPayment, setSelectedPayment] = useState('all');
    const [customerId, setCustomerId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Detail & action states
    const [viewingOrder, setViewingOrder] = useState(null);
    const [cancelConfirmOrder, setCancelConfirmOrder] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);

    // Fetch filters data (branches)
    useEffect(() => {
        const fetchFiltersData = async () => {
            setLoadingFilters(true);
            try {
                const response = await axios.get('/api/branches');
                // Support both standard paginated response and list response
                const list = response.data.data || response.data || [];
                setBranches(list);
            } catch (err) {
                console.error("Failed to load branches in Order Ledger page:", err);
            } finally {
                setLoadingFilters(false);
            }
        };
        fetchFiltersData();
    }, []);

    // Fetch Orders from POS Orders API
    const fetchOrders = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: currentPage,
                per_page: pageSize,
                search: search || undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
                payment_method: selectedPayment !== 'all' ? selectedPayment : undefined,
                customer_id: customerId || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined
            };

            const response = await axios.get('/api/pos/orders', { params });
            const data = response.data;
            setOrders(data.data || []);
            setTotalPages(data.last_page || 1);
            setTotalRecords(data.total || 0);
        } catch (err) {
            console.error("Failed to load orders:", err);
            setError("Failed to fetch transaction records. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Re-fetch on filter changes or page changes
    useEffect(() => {
        fetchOrders();
    }, [currentPage, selectedBranch, selectedStatus, selectedPayment, startDate, endDate]);

    // Handle search form submit
    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        setCurrentPage(1);
        fetchOrders();
    };

    // Reset filters
    const handleResetFilters = () => {
        setSearch('');
        setSelectedBranch('all');
        setSelectedStatus('all');
        setSelectedPayment('all');
        setCustomerId('');
        setStartDate('');
        setEndDate('');
        setCurrentPage(1);
    };

    // Handle Order Cancellation
    const handleCancelOrder = async () => {
        if (!cancelConfirmOrder) return;
        setIsCancelling(true);
        try {
            const response = await axios.post(`/api/pos/orders/${cancelConfirmOrder.id}/cancel`);
            if (response.data.success) {
                // Update local order state
                setOrders(prev => prev.map(o => o.id === cancelConfirmOrder.id ? { ...o, status: 'cancelled' } : o));
                setCancelConfirmOrder(null);
                // If viewing the details, update the modal too
                if (viewingOrder && viewingOrder.id === cancelConfirmOrder.id) {
                    setViewingOrder(prev => ({ ...prev, status: 'cancelled' }));
                }
            } else {
                alert(response.data.message || "Failed to cancel the order.");
            }
        } catch (err) {
            console.error("Failed to cancel order:", err);
            alert(err.response?.data?.message || "An error occurred while canceling the order.");
        } finally {
            setIsCancelling(false);
        }
    };

    // Date formatting helper
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

    // Status styling helper
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-450 border border-emerald-500/10 shadow-sm">
                        Completed
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-455 border border-rose-500/10 shadow-sm">
                        Cancelled
                    </span>
                );
            case 'held':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/10 shadow-sm">
                        Held
                    </span>
                );
            case 'draft':
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-405 border border-indigo-500/10 shadow-sm">
                        Draft
                    </span>
                );
        }
    };

    // Columns config for Table
    const columns = [
        {
            header: 'Order Details',
            accessor: 'order_number',
            render: (orderNumber, row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-200 text-xs tracking-wide">
                        {orderNumber || `ID: ${row.id}`}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        <span>{formatDate(row.created_at)}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Branch & Cashier',
            accessor: 'branch',
            render: (branch, row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-slate-300 text-xs font-semibold flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {branch ? branch.name : 'Unknown Branch'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-600" />
                        {row.user ? row.user.name : 'System'}
                    </span>
                </div>
            )
        },
        {
            header: 'Customer',
            accessor: 'customer_id',
            render: (customerId) => (
                <span className="text-xs text-slate-350 font-medium">
                    {customerId ? `Customer ID: ${customerId}` : 'Walk-in Customer'}
                </span>
            )
        },
        {
            header: 'Payment & Items',
            accessor: 'payment_method',
            render: (pm, row) => {
                const totalItems = row.items ? row.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0) : 0;
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-slate-300 text-xs font-semibold uppercase flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            {pm ? pm.replace('_', ' ') : 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                            {totalItems} {totalItems === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (status) => renderStatusBadge(status)
        },
        {
            header: 'Total Amount',
            accessor: 'total_amount',
            className: 'text-right',
            render: (total) => (
                <span className="font-mono font-bold text-xs text-indigo-400">
                    ${parseFloat(total).toFixed(2)}
                </span>
            )
        },
        {
            header: 'Actions',
            className: 'text-center',
            render: (row) => (
                <div className="flex items-center justify-center gap-2">
                    <Button 
                        variant="secondary"
                        size="xs"
                        icon={Eye}
                        onClick={() => setViewingOrder(row)}
                        title="View details"
                        className="p-1.5 text-slate-405 hover:text-slate-200 border-slate-800 bg-slate-950/20 hover:bg-slate-900/60"
                    />
                    {row.status === 'completed' && (
                        <Button 
                            variant="danger"
                            size="xs"
                            icon={XCircle}
                            onClick={() => setCancelConfirmOrder(row)}
                            title="Cancel order"
                            className="p-1.5 text-red-400 hover:text-red-300 border-red-950/30 bg-red-950/10 hover:bg-red-950/30"
                        />
                    )}
                </div>
            )
        }
    ];

    const breadcrumbs = [
        { label: 'Core Operations', path: '/dashboard' },
        { label: 'Order Ledger' }
    ];

    return (
        <PageWrapper
            title="Order Ledger"
            subtitle="Full historical list of POS transactions, sales orders, draft tickets, and cancellation audits."
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-4">
                
                {/* Advanced Search & Filters Toolbar */}
                <div className="p-4 bg-slate-900 border border-slate-800/80 rounded-xl space-y-4 shadow-md">
                    <form onSubmit={handleSearchSubmit} className="space-y-3">
                        <div className="flex flex-col lg:flex-row gap-3">
                            
                            {/* Search bar */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search by order number or notes..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-250 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
                                />
                            </div>

                            {/* Filters Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:flex gap-2">
                                
                                {/* Branch dropdown */}
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => { setSelectedBranch(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                                >
                                    <option value="all" className="bg-slate-900">All Branches</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
                                    ))}
                                </select>

                                {/* Status dropdown */}
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-355 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                                >
                                    <option value="all" className="bg-slate-900">All Statuses</option>
                                    <option value="completed" className="bg-slate-900">Completed</option>
                                    <option value="cancelled" className="bg-slate-900">Cancelled</option>
                                    <option value="held" className="bg-slate-900">Held</option>
                                    <option value="draft" className="bg-slate-900">Draft</option>
                                </select>

                                {/* Payment Method */}
                                <select
                                    value={selectedPayment}
                                    onChange={(e) => { setSelectedPayment(e.target.value); setCurrentPage(1); }}
                                    className="px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                                >
                                    <option value="all" className="bg-slate-900">All Payments</option>
                                    <option value="cash" className="bg-slate-900">Cash</option>
                                    <option value="card" className="bg-slate-900">Card</option>
                                    <option value="stripe" className="bg-slate-900">Stripe</option>
                                    <option value="bank_transfer" className="bg-slate-900">Bank Transfer</option>
                                    <option value="split" className="bg-slate-900">Split Payment</option>
                                </select>

                                {/* Customer ID filter */}
                                <div className="relative col-span-1 min-w-[120px]">
                                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Cust. ID"
                                        value={customerId}
                                        onChange={(e) => { setCustomerId(e.target.value); setCurrentPage(1); }}
                                        className="w-full pl-8 pr-2 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-250 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Date filters and actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/40">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Date Range:
                                </span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                                    className="px-2 py-1.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500 font-semibold"
                                />
                                <span className="text-xs text-slate-600 font-medium">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                                    className="px-2 py-1.5 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:border-indigo-500 font-semibold"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Button 
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    className="h-8 shrink-0 px-4"
                                >
                                    Apply
                                </Button>
                                <Button 
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    icon={RotateCcw}
                                    onClick={handleResetFilters}
                                    className="h-8 shrink-0 text-slate-450 hover:text-slate-200 border-slate-800/60"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Orders List Table */}
                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                    <Table 
                        columns={columns}
                        data={orders}
                        isLoading={isLoading}
                        emptyMessage={error || "No orders found matching the filters."}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={totalRecords}
                        pageSize={pageSize}
                    />
                </div>
            </div>

            {/* ORDER DETAIL VIEW MODAL */}
            {viewingOrder && (
                <Modal 
                    isOpen={!!viewingOrder} 
                    onClose={() => setViewingOrder(null)}
                    title={`Transaction Receipt — ${viewingOrder.order_number || `ID: ${viewingOrder.id}`}`}
                    size="lg"
                >
                    <div className="space-y-6">
                        {/* Summary Header */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Status</span>
                                <div className="mt-1">{renderStatusBadge(viewingOrder.status)}</div>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Branch</span>
                                <span className="block text-xs font-bold text-slate-200 mt-1 flex items-center gap-1">
                                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                    {viewingOrder.branch ? viewingOrder.branch.name : 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cashier</span>
                                <span className="block text-xs font-bold text-slate-200 mt-1 flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 text-slate-500" />
                                    {viewingOrder.user ? viewingOrder.user.name : 'System'}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Payment Method</span>
                                <span className="block text-xs font-bold text-slate-200 mt-1 uppercase flex items-center gap-1">
                                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                                    {viewingOrder.payment_method ? viewingOrder.payment_method.replace('_', ' ') : 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Order Items Table */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-405 uppercase tracking-wider flex items-center gap-1.5">
                                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                                Purchased Items
                            </h4>
                            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/20">
                                <table className="w-full text-left border-collapse text-xs font-semibold">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                                            <th className="py-2.5 px-3">Product Name</th>
                                            <th className="py-2.5 px-3 text-right">Unit Price</th>
                                            <th className="py-2.5 px-3 text-center">Qty</th>
                                            <th className="py-2.5 px-3 text-right">Discount</th>
                                            <th className="py-2.5 px-3 text-right">Total Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-850 text-slate-300">
                                        {viewingOrder.items && viewingOrder.items.map((item, idx) => {
                                            const vDetails = item.variation ? [
                                                item.variation.size && `Size: ${item.variation.size}`,
                                                item.variation.color && `Color: ${item.variation.color}`,
                                                item.variation.material && `Mat: ${item.variation.material}`
                                            ].filter(Boolean).join(', ') : '';

                                            return (
                                                <tr key={idx} className="hover:bg-slate-900/10">
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-200">{item.product ? item.product.name : 'Unknown Product'}</span>
                                                            {vDetails && (
                                                                <span className="text-[10px] text-slate-500 font-semibold">{vDetails}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono">${parseFloat(item.unit_price).toFixed(2)}</td>
                                                    <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono text-rose-455">${parseFloat(item.discount_amount).toFixed(2)}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono text-slate-100">${parseFloat(item.total_price).toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Order Summary Calculations */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Notes details */}
                            <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/20 border border-slate-850/50">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Order Notes / Logs</span>
                                <p className="text-slate-400 text-xs italic leading-relaxed">
                                    {viewingOrder.notes || 'No customer remarks or specific transaction notes logged.'}
                                </p>
                            </div>

                            {/* Calculation table */}
                            <div className="space-y-2.5 p-4 rounded-xl bg-indigo-955/10 border border-indigo-900/20">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                    <span>Subtotal:</span>
                                    <span className="font-mono text-slate-300">${parseFloat(viewingOrder.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
                                    <span>Discounts (-) :</span>
                                    <span className="font-mono">${parseFloat(viewingOrder.discount_amount).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                    <span>Tax Amount:</span>
                                    <span className="font-mono text-slate-300">${parseFloat(viewingOrder.tax_amount).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-indigo-900/30 pt-2.5 flex items-center justify-between text-sm font-bold text-indigo-400">
                                    <span>Grand Total:</span>
                                    <span className="font-mono text-lg">${parseFloat(viewingOrder.total_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer details & Action */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                            <span className="text-[10px] text-slate-550 font-mono">
                                Registered at: {new Date(viewingOrder.created_at).toLocaleString()}
                            </span>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Printer}
                                    onClick={() => window.print()}
                                    className="flex-1 sm:flex-initial text-slate-300 border-slate-800"
                                >
                                    Print Receipt
                                </Button>
                                {viewingOrder.status === 'completed' && (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        icon={XCircle}
                                        onClick={() => {
                                            setCancelConfirmOrder(viewingOrder);
                                        }}
                                        className="flex-1 sm:flex-initial"
                                    >
                                        Cancel Transaction
                                    </Button>
                                )}
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setViewingOrder(null)}
                                    className="flex-1 sm:flex-initial border-slate-800"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* TRANSACTION CANCELLATION CONFIRMATION MODAL */}
            {cancelConfirmOrder && (
                <Modal
                    isOpen={!!cancelConfirmOrder}
                    onClose={() => setCancelConfirmOrder(null)}
                    title="Confirm Order Cancellation"
                    size="sm"
                >
                    <div className="space-y-4">
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Are you sure you want to cancel transaction <strong className="text-white">{cancelConfirmOrder.order_number || `ID: ${cancelConfirmOrder.id}`}</strong>?
                        </p>
                        <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-[11px] text-red-400 leading-relaxed font-semibold">
                            ⚠️ This action will mark the transaction as <strong>Cancelled</strong> and automatically return all items to stock. This operation is permanent and cannot be undone.
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setCancelConfirmOrder(null)}
                                disabled={isCancelling}
                                className="border-slate-800"
                            >
                                No, Keep Order
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleCancelOrder}
                                isLoading={isCancelling}
                                disabled={isCancelling}
                            >
                                Yes, Cancel Order
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

        </PageWrapper>
    );
}
