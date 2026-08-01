import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Filters from '../components/Filters';
import EmptyState from '../components/EmptyState';
import { Skeleton, CardGridSkeleton } from '../components/Skeleton';
import { Input, Textarea, Select } from '../components/FormControls';
import {
    Plus, Edit, Trash2, TrendingDown, Calendar, Wallet,
    Receipt, AlertCircle, RefreshCw, CreditCard, GitBranch,
    Tag, CalendarDays, Layers, Paperclip, FileText, X, Upload, Eye,
    Clock, CheckCircle2, XCircle, ShieldCheck
} from 'lucide-react';

const isImageFile = (nameOrUrl = '') => /\.(png|jpe?g|gif|webp|svg)$/i.test(nameOrUrl);

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'check', label: 'Check' },
    { value: 'other', label: 'Other' }
];

const APPROVAL_STATUSES = {
    pending: { label: 'Pending', icon: Clock, className: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
    approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
    rejected: { label: 'Rejected', icon: XCircle, className: 'bg-rose-500/10 border-rose-500/20 text-rose-400' }
};

function ApprovalBadge({ status }) {
    const meta = APPROVAL_STATUSES[status] || APPROVAL_STATUSES.pending;
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${meta.className}`}>
            <Icon className="w-2.5 h-2.5" />
            {meta.label}
        </span>
    );
}

export default function Expenses() {
    // List states
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [pageSize] = useState(10);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [approvalFilter, setApprovalFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Reference data
    const [categories, setCategories] = useState([]); // expense-type chart-of-account entries
    const [branches, setBranches] = useState([]);

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // Form fields
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
    const [accountId, setAccountId] = useState('');
    const [branchId, setBranchId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [description, setDescription] = useState('');
    const [receiptPath, setReceiptPath] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [receiptName, setReceiptName] = useState('');
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [receiptUploadError, setReceiptUploadError] = useState(null);

    const fetchExpenses = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: currentPage,
                per_page: pageSize,
                search: searchQuery || undefined,
                account_id: categoryFilter !== 'all' ? categoryFilter : undefined,
                branch_id: branchFilter !== 'all' ? branchFilter : undefined,
                approval_status: approvalFilter !== 'all' ? approvalFilter : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined
            };
            const response = await axios.get('/api/expenses', { params });
            setExpenses(response.data.data || []);
            setTotalPages(response.data.last_page || 1);
            setTotalRecords(response.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch expenses:', err);
            setError(err.response?.data?.message || 'Failed to load expenses. Please try again.');
            setExpenses([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReferenceData = async () => {
        try {
            const [accountsRes, branchesRes] = await Promise.all([
                axios.get('/api/accounting/accounts'),
                axios.get('/api/branches')
            ]);
            const expenseAccounts = (accountsRes.data || []).filter(a => a.type === 'expense' && a.is_active);
            setCategories(expenseAccounts);
            setBranches((branchesRes.data || []).filter(b => b.is_active));
        } catch (err) {
            console.error('Failed to load expense categories/branches:', err);
        }
    };

    useEffect(() => {
        fetchReferenceData();
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [currentPage, categoryFilter, branchFilter, approvalFilter, dateFrom, dateTo]);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            setCurrentPage(1);
            fetchExpenses();
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    const resetFilters = () => {
        setSearchQuery('');
        setCategoryFilter('all');
        setBranchFilter('all');
        setApprovalFilter('all');
        setDateFrom('');
        setDateTo('');
        setCurrentPage(1);
    };

    const resetForm = () => {
        setExpenseDate(new Date().toISOString().slice(0, 10));
        setAccountId(categories[0]?.id || '');
        setBranchId(branches[0]?.id || '');
        setAmount('');
        setPaymentMethod('cash');
        setDescription('');
        setReceiptPath('');
        setReceiptUrl('');
        setReceiptName('');
        setReceiptUploadError(null);
        setFormError(null);
        setFormErrors({});
        setCurrentExpense(null);
    };

    const handleReceiptUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = ''; // allow re-selecting the same file later

        const maxSizeBytes = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSizeBytes) {
            setReceiptUploadError('Receipt file is too large. Maximum size is 5MB.');
            return;
        }

        setReceiptUploadError(null);
        setIsUploadingReceipt(true);

        const formData = new FormData();
        formData.append('receipt', file);

        try {
            const response = await axios.post('/api/expenses/upload-receipt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setReceiptPath(response.data.path);
            setReceiptUrl(response.data.url);
            setReceiptName(file.name);
        } catch (err) {
            console.error('Receipt upload failed:', err);
            setReceiptUploadError(err.response?.data?.message || 'Failed to upload receipt. Please try again.');
        } finally {
            setIsUploadingReceipt(false);
        }
    };

    const handleRemoveReceipt = () => {
        setReceiptPath('');
        setReceiptUrl('');
        setReceiptName('');
        setReceiptUploadError(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsFormOpen(true);
    };

    const handleOpenEdit = (expense) => {
        setCurrentExpense(expense);
        setExpenseDate((expense.expense_date || '').slice(0, 10) || new Date().toISOString().slice(0, 10));
        setAccountId(expense.account_id || expense.account?.id || '');
        setBranchId(expense.branch_id || expense.branch?.id || '');
        setAmount(expense.amount ?? '');
        setPaymentMethod(expense.payment_method || 'cash');
        setDescription(expense.description || '');
        setReceiptPath(expense.receipt_path || '');
        setReceiptUrl(expense.receipt_url || '');
        setReceiptName(expense.receipt_name || (expense.receipt_path ? expense.receipt_path.split('/').pop() : ''));
        setReceiptUploadError(null);
        setFormError(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenDelete = (expense) => {
        setCurrentExpense(expense);
        setIsDeleteOpen(true);
    };

    const validate = () => {
        const errors = {};
        if (!expenseDate) errors.expenseDate = 'Expense date is required.';
        if (!accountId) errors.accountId = 'Please select an expense category.';
        if (!amount || Number(amount) <= 0) errors.amount = 'Enter an amount greater than 0.';
        if (!paymentMethod) errors.paymentMethod = 'Select a payment method.';
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        const errors = validate();
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const payload = {
            expense_date: expenseDate,
            account_id: accountId,
            branch_id: branchId || null,
            amount: Number(amount),
            payment_method: paymentMethod,
            description: description || null,
            receipt_path: receiptPath || null
        };

        setSubmitting(true);
        try {
            if (currentExpense) {
                await axios.put(`/api/expenses/${currentExpense.id}`, payload);
            } else {
                await axios.post('/api/expenses', payload);
            }
            await fetchExpenses();
            setIsFormOpen(false);
            resetForm();
        } catch (err) {
            console.error('Failed to save expense:', err);
            setFormError(err.response?.data?.message || 'Could not save expense. Please check the form and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!currentExpense) return;
        setSubmitting(true);
        try {
            await axios.delete(`/api/expenses/${currentExpense.id}`);
            await fetchExpenses();
            setIsDeleteOpen(false);
            setCurrentExpense(null);
        } catch (err) {
            console.error('Failed to delete expense:', err);
            setFormError(err.response?.data?.message || 'Could not delete expense.');
        } finally {
            setSubmitting(false);
        }
    };

    // Derived stats (based on currently loaded page of expenses)
    const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const thisMonthAmount = expenses
        .filter(e => {
            const d = new Date(e.expense_date);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const uniqueCategories = new Set(expenses.map(e => e.account?.id || e.account_id)).size;
    const pendingApprovalCount = expenses.filter(e => (e.approval_status || 'pending') === 'pending').length;

    const columns = [
        {
            key: 'expense_date',
            header: 'Date',
            render: (row) => {
                const d = new Date(row.expense_date);
                return (
                    <div className="flex items-center gap-1.5 text-slate-350">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                );
            }
        },
        {
            key: 'account',
            header: 'Category',
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wide">
                    <Tag className="w-3 h-3" />
                    {row.account?.name || 'Uncategorized'}
                </span>
            )
        },
        {
            key: 'description',
            header: 'Description',
            render: (row) => (
                <span className="text-slate-350 max-w-xs truncate block">{row.description || '—'}</span>
            )
        },
        {
            key: 'branch',
            header: 'Branch',
            render: (row) => (
                <span className="text-slate-400 font-semibold">{row.branch?.name || 'All Branches'}</span>
            )
        },
        {
            key: 'payment_method',
            header: 'Payment Method',
            render: (row) => (
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wide">
                    {(row.payment_method || '').replace('_', ' ') || 'N/A'}
                </span>
            )
        },
        {
            key: 'amount',
            header: 'Amount',
            className: 'text-right',
            render: (row) => (
                <span className="font-mono font-bold text-rose-400 block text-right">
                    -${Number(row.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            )
        },
        {
            key: 'approval_status',
            header: 'Approval',
            render: (row) => <ApprovalBadge status={row.approval_status || 'pending'} />
        },
        {
            key: 'receipt',
            header: 'Receipt',
            className: 'text-center',
            render: (row) => (
                row.receipt_url ? (
                    <a
                        href={row.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                        title="View attached receipt"
                    >
                        <Paperclip className="w-3.5 h-3.5" />
                    </a>
                ) : (
                    <span className="text-slate-650">—</span>
                )
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="secondary"
                        size="xs"
                        icon={Edit}
                        onClick={() => handleOpenEdit(row)}
                        title="Edit Expense"
                    />
                    <Button
                        variant="secondary"
                        size="xs"
                        icon={Trash2}
                        onClick={() => handleOpenDelete(row)}
                        className="hover:bg-rose-500/15 hover:text-rose-400 border-slate-800"
                        title="Delete Expense"
                    />
                </div>
            )
        }
    ];

    return (
        <PageWrapper
            title="Expenses Tracker"
            subtitle="Log and monitor overhead spending across branches, categorized by ledger account."
            breadcrumbs={[{ label: 'Accounting', path: '/accounting' }, { label: 'Expenses Tracker' }]}
            actions={
                <div className="flex items-center gap-2.5">
                    <Link to="/expenses/categories">
                        <Button variant="secondary" icon={Layers}>
                            Manage Categories
                        </Button>
                    </Link>
                    <Button variant="secondary" icon={RefreshCw} onClick={fetchExpenses} disabled={isLoading}>
                        Reload
                    </Button>
                    <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
                        Add Expense
                    </Button>
                </div>
            }
        >
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* Stats Row */}
            {isLoading ? (
                <CardGridSkeleton count={4} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Total Expenses (Page)</span>
                            <span className="text-2xl font-black font-mono tracking-tight block text-rose-400">
                                ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 shrink-0">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">This Month</span>
                            <span className="text-2xl font-black font-mono tracking-tight block text-amber-400">
                                ${thisMonthAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shrink-0">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Records / Categories</span>
                            <span className="text-2xl font-black block text-slate-200 font-mono">
                                {totalRecords} <span className="text-slate-550 text-sm">/ {uniqueCategories}</span>
                            </span>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 shrink-0">
                            <Receipt className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Pending Approval</span>
                            <span className="text-2xl font-black block text-amber-400 font-mono">{pendingApprovalCount}</span>
                        </div>
                        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <Filters
                searchPlaceholder="Search expenses by description..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                onReset={resetFilters}
            >
                <div className="w-full sm:w-48">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-350 outline-none focus:border-indigo-500/80 transition-colors"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full sm:w-44">
                    <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-350 outline-none focus:border-indigo-500/80 transition-colors"
                    >
                        <option value="all">All Branches</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full sm:w-40">
                    <select
                        value={approvalFilter}
                        onChange={(e) => setApprovalFilter(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-350 outline-none focus:border-indigo-500/80 transition-colors"
                    >
                        <option value="all">All Approval Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <div className="w-32">
                        <Input type="date" id="exp-date-from" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>
                    <span>to</span>
                    <div className="w-32">
                        <Input type="date" id="exp-date-to" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                </div>
            </Filters>

            {/* Expenses Table */}
            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="w-full h-11" />
                    <Skeleton className="w-full h-11" />
                    <Skeleton className="w-full h-11" />
                </div>
            ) : expenses.length === 0 ? (
                <EmptyState
                    title="No expenses recorded"
                    description="Adjust your search criteria, or log a new expense to start tracking overhead spending."
                    icon={Receipt}
                    action={
                        <Button variant="secondary" size="sm" onClick={resetFilters}>
                            Reset Filters
                        </Button>
                    }
                />
            ) : (
                <Table
                    columns={columns}
                    data={expenses}
                    totalRecords={totalRecords}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                />
            )}

            {/* Create / Edit Expense Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={currentExpense ? 'Edit Expense' : 'Log New Expense'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                            <span className="font-bold">{formError}</span>
                        </div>
                    )}

                    {currentExpense && (
                        <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approval Status</span>
                            <ApprovalBadge status={currentExpense.approval_status || 'pending'} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Expense Date"
                            type="date"
                            id="exp-form-date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            error={formErrors.expenseDate}
                        />
                        <Input
                            label="Amount"
                            type="number"
                            step="0.01"
                            min="0"
                            id="exp-form-amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            error={formErrors.amount}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Expense Category"
                            id="exp-form-account"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            error={formErrors.accountId}
                        >
                            <option value="">Select category...</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                        </Select>
                        <Select
                            label="Branch (Optional)"
                            id="exp-form-branch"
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </Select>
                    </div>

                    <Select
                        label="Payment Method"
                        id="exp-form-payment"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        error={formErrors.paymentMethod}
                    >
                        {PAYMENT_METHODS.map(pm => (
                            <option key={pm.value} value={pm.value}>{pm.label}</option>
                        ))}
                    </Select>

                    <Textarea
                        label="Description / Notes (Optional)"
                        id="exp-form-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What was this expense for?"
                        rows="2"
                    />

                    {/* Receipt Attachment */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Receipt Attachment (Optional)
                        </label>

                        {receiptUploadError && (
                            <p className="text-[10px] font-semibold text-red-400">{receiptUploadError}</p>
                        )}

                        {receiptUrl ? (
                            <div className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
                                {isImageFile(receiptName || receiptUrl) ? (
                                    <img
                                        src={receiptUrl}
                                        alt="Receipt preview"
                                        className="w-12 h-12 object-cover rounded-lg border border-slate-800 shrink-0"
                                    />
                                ) : (
                                    <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-200 truncate">{receiptName || 'Receipt file'}</p>
                                    <a
                                        href={receiptUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:underline font-semibold"
                                    >
                                        <Eye className="w-3 h-3" />
                                        View Receipt
                                    </a>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRemoveReceipt}
                                    className="p-1.5 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-900/35 hover:border-rose-900/60 rounded-lg text-rose-400 hover:text-rose-350 transition-colors shrink-0"
                                    title="Remove attachment"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <label className={`flex flex-col items-center justify-center gap-2 py-6 bg-slate-950/40 hover:bg-slate-950/70 border border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all text-center ${isUploadingReceipt ? 'opacity-60 pointer-events-none' : ''}`}>
                                {isUploadingReceipt ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-[11px] text-slate-400 font-semibold">Uploading receipt...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 text-slate-500" />
                                        <span className="text-[11px] text-slate-400 font-semibold">Click to attach a receipt (image or PDF)</span>
                                        <span className="text-[10px] text-slate-600">Max 5MB</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleReceiptUpload}
                                    disabled={isUploadingReceipt}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                        <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : currentExpense ? 'Save Changes' : 'Log Expense'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Delete Expense"
                size="sm"
            >
                <div className="space-y-4">
                    {formError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                            <span className="font-bold">{formError}</span>
                        </div>
                    )}
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Are you sure you want to permanently delete this expense record
                        {currentExpense?.description ? <> — <strong className="text-slate-200">{currentExpense.description}</strong></> : ''}?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                        <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleDelete}
                            disabled={submitting}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {submitting ? 'Deleting...' : 'Delete Expense'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </PageWrapper>
    );
}
