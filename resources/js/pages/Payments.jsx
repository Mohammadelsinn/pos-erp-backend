import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Filters from '../components/Filters';
import { Select, Input } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import {
    CreditCard,
    DollarSign,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Search,
    User,
    GitBranch,
    FileText,
    RefreshCcw,
    Clock,
    XCircle,
    Eye
} from 'lucide-react';

export default function Payments() {
    // API Data States
    const [payments, setPayments] = useState([]);
    const [summary, setSummary] = useState(null);
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedMethod, setSelectedMethod] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Detail Modal State
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [orderLoading, setOrderLoading] = useState(false);

    // Load branches
    useEffect(() => {
        axios.get('/api/branches')
            .then(res => {
                setBranches(res.data.filter(b => b.is_active));
            })
            .catch(err => {
                console.error("Failed to load branches:", err);
            });
    }, []);

    // Load payment ledger & summary stats
    const fetchPayments = async (page = 1) => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/orders', {
                params: {
                    page,
                    per_page: 10,
                    branch_id: selectedBranch,
                    payment_method: selectedMethod,
                    status: 'all', // We want all completed/cancelled orders
                    date_from: dateFrom,
                    date_to: dateTo
                }
            });

            // Filter on client side by status if selected, because orders API filters by order status, not payment status
            let dataList = response.data.data;
            if (selectedStatus !== 'all') {
                dataList = dataList.filter(o => (o.payment_status || 'paid') === selectedStatus);
            }

            // If client query filter is set, search locally (orders API matches order_number, branch etc.)
            if (searchQuery.trim()) {
                dataList = dataList.filter(o => 
                    o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    o.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            setPayments(dataList);
            setCurrentPage(response.data.current_page);
            setTotalPages(response.data.last_page);
            setTotalRecords(response.data.total);
        } catch (err) {
            console.error("Failed to load payments ledger:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSummary = async () => {
        setIsSummaryLoading(true);
        try {
            const response = await axios.get('/api/orders/payment-summary', {
                params: {
                    branch_id: selectedBranch,
                    date_from: dateFrom,
                    date_to: dateTo
                }
            });
            setSummary(response.data);
        } catch (err) {
            console.error("Failed to load payments summary:", err);
        } finally {
            setIsSummaryLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments(1);
        fetchSummary();
    }, [selectedBranch, selectedMethod, selectedStatus, dateFrom, dateTo]);

    // Handle search query submit/reset
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchPayments(1);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedBranch('all');
        setSelectedMethod('all');
        setSelectedStatus('all');
        setDateFrom('');
        setDateTo('');
    };

    // View details of a payment
    const handleViewDetail = async (payment) => {
        setSelectedPayment(payment);
        setDetailModalOpen(true);
        setOrderLoading(true);
        setPaymentOrder(null);
        try {
            const response = await axios.get(`/api/orders/${payment.id}`);
            setPaymentOrder(response.data);
        } catch (err) {
            console.error("Failed to load payment order details:", err);
        } finally {
            setOrderLoading(false);
        }
    };

    // Format date string utility
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    // Method badge styling
    const getMethodBadgeClass = (method) => {
        const norm = (method || '').toLowerCase();
        if (norm === 'cash') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        if (norm === 'card' || norm === 'credit_card' || norm === 'credit') return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
        return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
    };

    // Status badge styling
    const getStatusBadge = (status) => {
        const norm = (status || 'paid').toLowerCase();
        const styles = {
            paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
            pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
            refunded: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
            failed: 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
        };
        const icons = {
            paid: CheckCircle2,
            pending: Clock,
            refunded: RefreshCcw,
            failed: XCircle
        };
        const Icon = icons[norm] || Clock;
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[norm] || styles.pending}`}>
                <Icon className="w-3 h-3" />
                {norm}
            </span>
        );
    };

    // Table columns configuration
    const columns = [
        {
            header: 'Date & Time',
            key: 'created_at',
            render: (val) => formatDate(val)
        },
        {
            header: 'Order #',
            key: 'order_number',
            render: (val) => <span className="font-mono text-indigo-400 font-bold">{val || 'N/A'}</span>
        },
        {
            header: 'Cashier',
            key: 'user',
            render: (user) => (
                <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{user?.name || 'Cashier'}</span>
                </div>
            )
        },
        {
            header: 'Branch',
            key: 'branch',
            render: (branch) => (
                <div className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                    <span>{branch?.name || 'Branch'}</span>
                </div>
            )
        },
        {
            header: 'Method',
            key: 'payment_method',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getMethodBadgeClass(val)}`}>
                    {val || 'Cash'}
                </span>
            )
        },
        {
            header: 'Amount',
            key: 'total_amount',
            className: 'text-right',
            render: (val) => <span className="font-mono font-bold text-slate-200">${Number(val).toFixed(2)}</span>
        },
        {
            header: 'Status',
            key: 'payment_status',
            render: (val) => getStatusBadge(val)
        },
        {
            header: 'Actions',
            key: 'actions',
            className: 'text-right',
            render: (_, row) => (
                <Button size="sm" variant="secondary" icon={Eye} onClick={() => handleViewDetail(row)}>
                    Details
                </Button>
            )
        }
    ];

    // Compute progress bar percentage share for payment methods
    const getMethodShare = (amount) => {
        if (!summary || !summary.overview || Number(summary.overview.total_collected) === 0) return 0;
        return (Number(amount) / Number(summary.overview.total_collected)) * 100;
    };

    return (
        <PageWrapper
            title="Payments Summary & Ledger"
            subtitle="Track transaction revenues, payment gateway distribution, and ledger history."
            breadcrumbs={[{ label: "Overview", path: "/dashboard" }, { label: "Payments Ledger" }]}
        >
            {/* Overview Stat Cards */}
            {isSummaryLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Skeleton className="h-28 rounded-2xl animate-pulse" />
                    <Skeleton className="h-28 rounded-2xl animate-pulse" />
                    <Skeleton className="h-28 rounded-2xl animate-pulse" />
                    <Skeleton className="h-28 rounded-2xl animate-pulse" />
                </div>
            ) : summary ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Card 1: Total Collected */}
                    <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/15 to-teal-950/15 border border-emerald-900/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                        <div className="absolute right-4 top-4 p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Net Collected</span>
                        <h3 className="text-xl font-bold text-emerald-400 mt-2 font-mono">${Number(summary.overview.total_collected).toFixed(2)}</h3>
                        <span className="block text-[10px] text-slate-350 mt-1">Successful transactions</span>
                    </div>

                    {/* Card 2: Total Refunded */}
                    <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-950/15 to-violet-950/15 border border-indigo-900/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                        <div className="absolute right-4 top-4 p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <RefreshCcw className="w-4 h-4" />
                        </div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Refunded</span>
                        <h3 className="text-xl font-bold text-indigo-400 mt-2 font-mono">${Number(summary.overview.total_refunded).toFixed(2)}</h3>
                        <span className="block text-[10px] text-slate-350 mt-1">Returned payments</span>
                    </div>

                    {/* Card 3: Total Pending */}
                    <div className="backdrop-blur-xl bg-gradient-to-br from-amber-950/15 to-orange-950/15 border border-amber-900/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                        <div className="absolute right-4 top-4 p-2 rounded-xl bg-amber-500/10 text-amber-400">
                            <Clock className="w-4 h-4" />
                        </div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending Collections</span>
                        <h3 className="text-xl font-bold text-amber-400 mt-2 font-mono">${Number(summary.overview.total_pending).toFixed(2)}</h3>
                        <span className="block text-[10px] text-slate-350 mt-1">Unpaid order checkouts</span>
                    </div>

                    {/* Card 4: Total Failed */}
                    <div className="backdrop-blur-xl bg-gradient-to-br from-rose-950/15 to-red-950/15 border border-rose-900/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                        <div className="absolute right-4 top-4 p-2 rounded-xl bg-rose-500/10 text-rose-455">
                            <XCircle className="w-4 h-4" />
                        </div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Failed Transactions</span>
                        <h3 className="text-xl font-bold text-rose-400 mt-2 font-mono">${Number(summary.overview.total_failed).toFixed(2)}</h3>
                        <span className="block text-[10px] text-slate-350 mt-1">Declined payments</span>
                    </div>
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Filters & Visual Share Column */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Filters card */}
                    <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">Filter Payments</h3>

                        <form onSubmit={handleSearchSubmit} className="space-y-3.5">
                            <div className="relative w-full">
                                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                                <input
                                    type="text"
                                    placeholder="Search order number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full py-2.5 pl-9 pr-4 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 outline-none text-xs font-semibold focus:border-indigo-500/80 transition-colors"
                                />
                            </div>

                            <Select
                                id="filter-branch"
                                label="Branch Setting"
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                options={[
                                    { value: 'all', label: 'All Branches' },
                                    ...branches.map(b => ({ value: b.id.toString(), label: b.name }))
                                ]}
                            />

                            <Select
                                id="filter-method"
                                label="Payment Method"
                                value={selectedMethod}
                                onChange={(e) => setSelectedMethod(e.target.value)}
                                options={[
                                    { value: 'all', label: 'All Methods' },
                                    { value: 'cash', label: 'Cash' },
                                    { value: 'card', label: 'Card / Gateway' }
                                ]}
                            />

                            <Select
                                id="filter-status"
                                label="Payment Status"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                options={[
                                    { value: 'all', label: 'All Statuses' },
                                    { value: 'paid', label: 'Paid' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'refunded', label: 'Refunded' },
                                    { value: 'failed', label: 'Failed' }
                                ]}
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    id="date-from"
                                    label="From Date"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                                <Input
                                    id="date-to"
                                    label="To Date"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </div>

                            <div className="pt-2 flex gap-2">
                                <Button type="submit" size="sm" className="flex-1">Apply Filters</Button>
                                <Button type="button" variant="secondary" size="sm" onClick={handleResetFilters}>Reset</Button>
                            </div>
                        </form>
                    </div>

                    {/* Method breakdown card */}
                    <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">Method Distribution</h3>
                        
                        {isSummaryLoading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-6 rounded-md animate-pulse" />
                                <Skeleton className="h-6 rounded-md animate-pulse" />
                                <Skeleton className="h-6 rounded-md animate-pulse" />
                            </div>
                        ) : summary && summary.methods_breakdown.length === 0 ? (
                            <div className="text-center py-4 text-[11px] text-slate-500 font-semibold">No payment share logged.</div>
                        ) : summary ? (
                            <div className="space-y-4">
                                {summary.methods_breakdown.map((item, idx) => (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="uppercase text-[10px] text-slate-400">{item.method}</span>
                                            <span className="font-mono text-slate-200">
                                                ${Number(item.total).toFixed(2)} <span className="text-[10px] text-slate-350">({item.count} txns)</span>
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${
                                                    item.method.toLowerCase() === 'cash' 
                                                        ? 'from-emerald-600 to-teal-500' 
                                                        : 'from-indigo-600 to-violet-500'
                                                }`}
                                                style={{ width: `${getMethodShare(item.total)}%` }}
                                            />
                                        </div>
                                        <span className="block text-right text-[9px] font-bold text-slate-350">
                                            {getMethodShare(item.total).toFixed(1)}% Share
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Payments Ledger List */}
                <div className="lg:col-span-2 space-y-3.5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Ledger Receipts</h3>
                        <span className="text-[10px] text-slate-500 font-semibold">{totalRecords} matching sales</span>
                    </div>

                    <Table
                        columns={columns}
                        data={payments}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalRecords={totalRecords}
                        onPageChange={(page) => fetchPayments(page)}
                        emptyMessage="No payments found matching the selected parameters."
                        minWidth="800px"
                    />
                </div>
            </div>

            {/* MODALS */}
            
            {/* Modal: Payment & Invoice Detail */}
            <Modal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title={`Payment Receipt Transaction | Order #${selectedPayment?.order_number}`}
                size="lg"
                footer={
                    <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
                        Close Details
                    </Button>
                }
            >
                {selectedPayment && (
                    <div className="space-y-6 select-text">
                        {/* Transaction Core info */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-950/40 border border-slate-800 rounded-2xl">
                            <div>
                                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Amount Paid</span>
                                <span className="text-sm font-extrabold text-emerald-400 font-mono">${Number(selectedPayment.total_amount).toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Gateway Method</span>
                                <span className="text-xs font-bold text-slate-350 uppercase">{selectedPayment.payment_method || 'Cash'}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Payment Status</span>
                                <div className="mt-0.5">{getStatusBadge(selectedPayment.payment_status)}</div>
                            </div>
                            <div>
                                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Date & Time</span>
                                <span className="text-xs font-bold text-slate-350 font-mono">{formatDate(selectedPayment.created_at)}</span>
                            </div>
                        </div>

                        {/* Order info */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1">
                                Linked Order items & Checkout
                            </h4>

                            {orderLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-8 rounded-lg animate-pulse" />
                                    <Skeleton className="h-8 rounded-lg animate-pulse" />
                                    <Skeleton className="h-8 rounded-lg animate-pulse" />
                                </div>
                            ) : paymentOrder ? (
                                <div className="space-y-4">
                                    {/* Items Table */}
                                    <div className="overflow-hidden border border-slate-850 rounded-xl bg-slate-950/20">
                                        <table className="w-full text-left text-[11px] font-semibold text-slate-300">
                                            <thead>
                                                <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-450">
                                                    <th className="py-2.5 px-3">Item name</th>
                                                    <th className="py-2.5 px-3 text-center">Qty</th>
                                                    <th className="py-2.5 px-3 text-right">Price</th>
                                                    <th className="py-2.5 px-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-850">
                                                {paymentOrder.items?.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="py-2.5 px-3">
                                                            <div>
                                                                <span className="font-bold text-slate-200">{item.product?.name}</span>
                                                                {item.variation && (
                                                                    <span className="block text-[10px] text-slate-500 font-medium">
                                                                        Size: {item.variation.size || 'N/A'} | Color: {item.variation.color || 'N/A'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                                                        <td className="py-2.5 px-3 text-right font-mono">${Number(item.unit_price).toFixed(2)}</td>
                                                        <td className="py-2.5 px-3 text-right font-mono">${Number(item.total_price).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Checkout Breakdown */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-3 bg-slate-900 border border-slate-800 rounded-xl">
                                        <div className="text-[10px] text-slate-500 font-semibold space-y-0.5">
                                            <p>Register Station: {paymentOrder.branch?.name}</p>
                                            <p>Serving Cashier: {paymentOrder.user?.name} (Shift User)</p>
                                            {paymentOrder.notes && <p className="text-slate-450 mt-1.5 font-medium whitespace-pre-line italic">Note: "{paymentOrder.notes}"</p>}
                                        </div>

                                        <div className="w-full sm:w-56 text-xs space-y-1.5 font-semibold text-slate-350">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Subtotal:</span>
                                                <span className="font-mono text-slate-300">${Number(paymentOrder.subtotal).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Discount Amount:</span>
                                                <span className="font-mono text-rose-400">-${Number(paymentOrder.discount_amount).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Tax Amount:</span>
                                                <span className="font-mono text-slate-300">${Number(paymentOrder.tax_amount).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold text-slate-200">
                                                <span>Grand Total:</span>
                                                <span className="font-mono text-emerald-400">${Number(paymentOrder.total_amount).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-slate-500">Could not retrieve underlying order checkout items.</div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </PageWrapper>
    );
}
