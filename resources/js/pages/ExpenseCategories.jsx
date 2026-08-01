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
import { Input, Textarea } from '../components/FormControls';
import {
    Plus, Edit, Trash2, Tag, Wallet, CheckCircle, XCircle,
    AlertCircle, RefreshCw, Receipt, ChevronLeft, Layers
} from 'lucide-react';

const COLOR_SWATCHES = [
    { value: 'amber', className: 'bg-amber-500' },
    { value: 'rose', className: 'bg-rose-500' },
    { value: 'indigo', className: 'bg-indigo-500' },
    { value: 'emerald', className: 'bg-emerald-500' },
    { value: 'sky', className: 'bg-sky-500' },
    { value: 'violet', className: 'bg-violet-500' },
    { value: 'orange', className: 'bg-orange-500' },
    { value: 'slate', className: 'bg-slate-500' }
];

const badgeClassForColor = (color) => {
    const map = {
        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
        violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
        orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
        slate: 'bg-slate-500/10 border-slate-500/20 text-slate-400'
    };
    return map[color] || map.slate;
};

export default function ExpenseCategories() {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // Form fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('amber');
    const [monthlyBudget, setMonthlyBudget] = useState('');
    const [isActive, setIsActive] = useState(true);

    const fetchCategories = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/expense-categories');
            setCategories(response.data || []);
        } catch (err) {
            console.error('Failed to fetch expense categories:', err);
            setError(err.response?.data?.message || 'Failed to load expense categories. Please try again.');
            setCategories([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const filteredCategories = categories.filter(cat => {
        const matchesSearch = (cat.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (cat.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && cat.is_active) ||
            (statusFilter === 'inactive' && !cat.is_active);
        return matchesSearch && matchesStatus;
    });

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setColor('amber');
        setMonthlyBudget('');
        setIsActive(true);
        setFormError(null);
        setFormErrors({});
        setCurrentCategory(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsFormOpen(true);
    };

    const handleOpenEdit = (category) => {
        setCurrentCategory(category);
        setName(category.name || '');
        setDescription(category.description || '');
        setColor(category.color || 'amber');
        setMonthlyBudget(category.monthly_budget ?? '');
        setIsActive(category.is_active ?? true);
        setFormError(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenDelete = (category) => {
        setCurrentCategory(category);
        setIsDeleteOpen(true);
    };

    const validate = () => {
        const errors = {};
        if (!name.trim()) errors.name = 'Category name is required.';
        if (monthlyBudget !== '' && Number(monthlyBudget) < 0) errors.monthlyBudget = 'Budget cannot be negative.';
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        const errors = validate();
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const payload = {
            name: name.trim(),
            description: description || null,
            color,
            monthly_budget: monthlyBudget !== '' ? Number(monthlyBudget) : null,
            is_active: isActive
        };

        setSubmitting(true);
        try {
            if (currentCategory) {
                await axios.put(`/api/expense-categories/${currentCategory.id}`, payload);
            } else {
                await axios.post('/api/expense-categories', payload);
            }
            await fetchCategories();
            setIsFormOpen(false);
            resetForm();
        } catch (err) {
            console.error('Failed to save expense category:', err);
            setFormError(err.response?.data?.message || 'Could not save category. Please check the form and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!currentCategory) return;
        setSubmitting(true);
        try {
            await axios.delete(`/api/expense-categories/${currentCategory.id}`);
            await fetchCategories();
            setIsDeleteOpen(false);
            setCurrentCategory(null);
        } catch (err) {
            console.error('Failed to delete expense category:', err);
            setFormError(err.response?.data?.message || 'Could not delete category. It may be in use by existing expenses.');
        } finally {
            setSubmitting(false);
        }
    };

    // Stats
    const totalCategories = categories.length;
    const activeCategories = categories.filter(c => c.is_active).length;
    const totalBudget = categories.reduce((sum, c) => sum + (Number(c.monthly_budget) || 0), 0);

    const columns = [
        {
            key: 'name',
            header: 'Category',
            render: (row) => (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${badgeClassForColor(row.color)}`}>
                    <Tag className="w-3 h-3" />
                    {row.name}
                </span>
            )
        },
        {
            key: 'description',
            header: 'Description',
            render: (row) => (
                <span className="text-slate-400 max-w-sm truncate block">{row.description || '—'}</span>
            )
        },
        {
            key: 'monthly_budget',
            header: 'Monthly Budget',
            className: 'text-right',
            render: (row) => (
                <span className="font-mono text-slate-200 font-bold block text-right">
                    {row.monthly_budget ? `$${Number(row.monthly_budget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </span>
            )
        },
        {
            key: 'expenses_count',
            header: 'Logged Expenses',
            className: 'text-center',
            render: (row) => (
                <span className="font-mono text-slate-350 font-semibold">{row.expenses_count ?? 0}</span>
            )
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (row) => (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${row.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    {row.is_active ? (
                        <>
                            <CheckCircle className="w-2.5 h-2.5" />
                            Active
                        </>
                    ) : (
                        <>
                            <XCircle className="w-2.5 h-2.5" />
                            Inactive
                        </>
                    )}
                </span>
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
                        title="Edit Category"
                    />
                    <Button
                        variant="secondary"
                        size="xs"
                        icon={Trash2}
                        onClick={() => handleOpenDelete(row)}
                        className="hover:bg-rose-500/15 hover:text-rose-400 border-slate-800"
                        title="Delete Category"
                    />
                </div>
            )
        }
    ];

    return (
        <PageWrapper
            title="Expense Categories"
            subtitle="Organize overhead spending into reusable categories with monthly budget targets."
            breadcrumbs={[
                { label: 'Accounting', path: '/accounting' },
                { label: 'Expenses Tracker', path: '/expenses' },
                { label: 'Categories' }
            ]}
            actions={
                <div className="flex items-center gap-2.5">
                    <Link to="/expenses">
                        <Button variant="secondary" icon={ChevronLeft}>
                            Back to Expenses
                        </Button>
                    </Link>
                    <Button variant="secondary" icon={RefreshCw} onClick={fetchCategories} disabled={isLoading}>
                        Reload
                    </Button>
                    <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
                        Add Category
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
                <CardGridSkeleton count={3} cols="grid-cols-1 sm:grid-cols-3" />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Total Categories</span>
                            <span className="text-2xl font-black block text-slate-200 font-mono">{totalCategories}</span>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 shrink-0">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Active Categories</span>
                            <span className="text-2xl font-black block text-emerald-400 font-mono">{activeCategories}</span>
                        </div>
                        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shrink-0">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="p-5 border rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-900/50 shadow-xl border-slate-850 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Total Monthly Budget</span>
                            <span className="text-2xl font-black font-mono tracking-tight block text-indigo-400">
                                ${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shrink-0">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <Filters
                searchPlaceholder="Search categories by name or description..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                onReset={resetFilters}
            >
                <div className="w-full sm:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-350 outline-none focus:border-indigo-500/80 transition-colors"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>
            </Filters>

            {/* Categories Table */}
            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="w-full h-11" />
                    <Skeleton className="w-full h-11" />
                    <Skeleton className="w-full h-11" />
                </div>
            ) : filteredCategories.length === 0 ? (
                <EmptyState
                    title="No expense categories found"
                    description="Adjust your search criteria, or create a new category to start organizing expenses."
                    icon={Receipt}
                    action={
                        <Button variant="secondary" size="sm" onClick={resetFilters}>
                            Reset Filters
                        </Button>
                    }
                />
            ) : (
                <Table columns={columns} data={filteredCategories} />
            )}

            {/* Create / Edit Category Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={currentCategory ? 'Edit Expense Category' : 'Create Expense Category'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                            <span className="font-bold">{formError}</span>
                        </div>
                    )}

                    <Input
                        label="Category Name"
                        id="cat-form-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rent, Utilities, Marketing"
                        error={formErrors.name}
                    />

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Badge Color
                        </label>
                        <div className="flex flex-wrap items-center gap-2.5">
                            {COLOR_SWATCHES.map(swatch => (
                                <button
                                    key={swatch.value}
                                    type="button"
                                    onClick={() => setColor(swatch.value)}
                                    className={`w-7 h-7 rounded-full ${swatch.className} transition-all ${color === swatch.value ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-slate-200 scale-110' : 'opacity-70 hover:opacity-100'}`}
                                    title={swatch.value}
                                />
                            ))}
                        </div>
                    </div>

                    <Input
                        label="Monthly Budget (Optional)"
                        type="number"
                        step="0.01"
                        min="0"
                        id="cat-form-budget"
                        value={monthlyBudget}
                        onChange={(e) => setMonthlyBudget(e.target.value)}
                        placeholder="e.g. 1500.00"
                        error={formErrors.monthlyBudget}
                        helperText="Used to flag overspending once expenses are tracked against this category."
                    />

                    <Textarea
                        label="Description (Optional)"
                        id="cat-form-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what expenses fall under this category..."
                        rows="2"
                    />

                    <label className="flex items-center gap-2.5 text-slate-300 font-semibold text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                        />
                        Category Active
                    </label>

                    <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                        <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : currentCategory ? 'Save Changes' : 'Create Category'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Delete Expense Category"
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
                        Are you sure you want to permanently delete category <strong className="text-slate-200">{currentCategory?.name}</strong>?
                        Existing expenses logged under this category will keep their record, but it will no longer be selectable for new entries.
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
                            {submitting ? 'Deleting...' : 'Delete Category'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </PageWrapper>
    );
}
