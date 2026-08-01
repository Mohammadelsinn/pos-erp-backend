import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { Input, Textarea, Select } from '../components/FormControls';
import { 
    Plus, Edit, Trash2, ShieldAlert, CheckCircle, 
    XCircle, RefreshCw, Folder, BookOpen, AlertCircle
} from 'lucide-react';

export default function ChartOfAccounts() {
    // Account listing states
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTypeTab, setActiveTypeTab] = useState('asset'); // 'asset', 'liability', 'equity', 'revenue', 'expense'
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

    // Form modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // Form fields
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState('asset');
    const [detailType, setDetailType] = useState('');
    const [description, setDescription] = useState('');
    const [balance, setBalance] = useState('');
    const [isActive, setIsActive] = useState(true);

    const fetchAccounts = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/accounting/accounts');
            setAccounts(response.data || []);
        } catch (err) {
            console.error("Failed to load accounts:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Filter accounts by active type tab, search query, and status
    const filteredAccounts = accounts.filter(acc => {
        const matchesType = acc.type === activeTypeTab;
        const matchesSearch = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              acc.code.includes(searchQuery);
        const matchesStatus = statusFilter === 'all' || 
                              (statusFilter === 'active' && acc.is_active) || 
                              (statusFilter === 'inactive' && !acc.is_active);
        return matchesType && matchesSearch && matchesStatus;
    });

    // Group counts/sums
    const getTypeMetrics = (typeKey) => {
        const group = accounts.filter(acc => acc.type === typeKey);
        const count = group.length;
        const totalBalance = group.reduce((sum, acc) => sum + Number(acc.balance), 0);
        return { count, totalBalance };
    };

    // Reset form fields
    const resetForm = () => {
        setCode('');
        setName('');
        setType('asset');
        setDetailType('');
        setDescription('');
        setBalance('');
        setIsActive(true);
        setError(null);
        setFormErrors({});
        setSelectedAccount(null);
    };

    // Open add modal
    const handleOpenAddModal = () => {
        resetForm();
        setType(activeTypeTab);
        setIsAddModalOpen(true);
    };

    // Open edit modal
    const handleOpenEditModal = (account) => {
        resetForm();
        setSelectedAccount(account);
        setCode(account.code);
        setName(account.name);
        setType(account.type);
        setDetailType(account.detail_type || '');
        setDescription(account.description || '');
        setBalance(account.balance);
        setIsActive(account.is_active);
        setIsEditModalOpen(true);
    };

    // Open delete modal
    const handleOpenDeleteModal = (account) => {
        setSelectedAccount(account);
        setIsDeleteModalOpen(true);
    };

    // Handle Create Account
    const handleAddAccount = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setError(null);

        // Validation
        const errors = {};
        if (!code.trim()) errors.code = "Account code is required.";
        if (!name.trim()) errors.name = "Account name is required.";
        if (!type) errors.type = "Account type is required.";

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        try {
            await axios.post('/api/accounting/accounts', {
                code,
                name,
                type,
                detail_type: detailType,
                description,
                balance: balance ? Number(balance) : 0
            });
            await fetchAccounts();
            setIsAddModalOpen(false);
            resetForm();
        } catch (err) {
            console.error("Failed to create account:", err);
            setError(err.response?.data?.message || "Could not create account. Please check code uniqueness.");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Edit Account
    const handleEditAccount = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setError(null);

        // Validation
        const errors = {};
        if (!name.trim()) errors.name = "Account name is required.";

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name,
                detail_type: detailType,
                description,
                is_active: isActive
            };
            if (!selectedAccount.is_system) {
                payload.code = code;
                payload.type = type;
                payload.balance = balance ? Number(balance) : 0;
            }

            await axios.put(`/api/accounting/accounts/${selectedAccount.id}`, payload);
            await fetchAccounts();
            setIsEditModalOpen(false);
            resetForm();
        } catch (err) {
            console.error("Failed to edit account:", err);
            setError(err.response?.data?.message || "Could not update account.");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Delete Account
    const handleDeleteAccount = async () => {
        setError(null);
        setSubmitting(true);
        try {
            await axios.delete(`/api/accounting/accounts/${selectedAccount.id}`);
            await fetchAccounts();
            setIsDeleteModalOpen(false);
            resetForm();
        } catch (err) {
            console.error("Failed to delete account:", err);
            setError(err.response?.data?.message || "Could not delete account.");
        } finally {
            setSubmitting(false);
        }
    };

    // Table columns mapping
    const columns = [
        {
            header: 'Code',
            accessor: 'code',
            render: (code) => <span className="font-mono text-slate-100 font-bold">{code}</span>
        },
        {
            header: 'Account Name',
            accessor: 'name',
            render: (name, row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                        {name}
                        {row.is_system && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-950/60 border border-slate-800 text-slate-400 text-[9px] font-black uppercase flex items-center gap-1">
                                <ShieldAlert className="w-2.5 h-2.5 text-indigo-400" />
                                System
                            </span>
                        )}
                    </span>
                    {row.description && (
                        <span className="text-[10px] text-slate-500 max-w-xs truncate">{row.description}</span>
                    )}
                </div>
            )
        },
        {
            header: 'Detail Type',
            accessor: 'detail_type',
            render: (detail) => (
                <span className="text-slate-350 font-semibold text-xs">
                    {detail || 'General'}
                </span>
            )
        },
        {
            header: 'Status',
            accessor: 'is_active',
            render: (active) => (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    {active ? (
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
            header: 'Balance',
            accessor: 'balance',
            render: (val) => (
                <span className="font-mono text-slate-100 font-bold text-sm">
                    ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            )
        },
        {
            header: 'Actions',
            accessor: 'id',
            render: (id, row) => (
                <div className="flex items-center gap-2">
                    <Button 
                        variant="secondary" 
                        size="xs" 
                        icon={Edit}
                        onClick={() => handleOpenEditModal(row)}
                        title="Edit Account Details"
                    />
                    
                    {!row.is_system && (
                        <Button 
                            variant="secondary" 
                            size="xs" 
                            icon={Trash2}
                            onClick={() => handleOpenDeleteModal(row)}
                            className="hover:bg-rose-500/15 hover:text-rose-400 border-slate-800"
                            title="Delete Account"
                        />
                    )}
                </div>
            )
        }
    ];

    // Tabs info
    const tabs = [
        { key: 'asset', label: 'Assets (1xxx)' },
        { key: 'liability', label: 'Liabilities (2xxx)' },
        { key: 'equity', label: 'Equity (3xxx)' },
        { key: 'revenue', label: 'Revenue (4xxx)' },
        { key: 'expense', label: 'Expenses (5xxx)' }
    ];

    return (
        <PageWrapper
            title="Chart of Accounts Ledger"
            subtitle="Organize, edit, and audit your standard and custom financial ledger categories."
            actions={
                <div className="flex items-center gap-2.5">
                    <Button 
                        variant="secondary" 
                        icon={RefreshCw} 
                        onClick={fetchAccounts}
                        disabled={isLoading}
                    >
                        Reload
                    </Button>
                    <Button 
                        variant="primary" 
                        icon={Plus} 
                        onClick={handleOpenAddModal}
                    >
                        Add Account
                    </Button>
                </div>
            }
        >
            {/* Account Type Tabs selection */}
            <div className="flex border-b border-slate-800 pb-px gap-1 overflow-x-auto">
                {tabs.map(t => {
                    const isActive = activeTypeTab === t.key;
                    const metrics = getTypeMetrics(t.key);
                    return (
                        <button
                            key={t.key}
                            onClick={() => setActiveTypeTab(t.key)}
                            className={`px-4 py-3 text-xs font-extrabold uppercase border-b-2 tracking-wider shrink-0 transition-all flex items-center gap-2 ${isActive ? 'border-indigo-500 text-indigo-400 bg-slate-900/40' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-650'}`} />
                            <span>{t.label}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/80 text-[9px] text-slate-400 font-bold">{metrics.count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Account Search and Status Filters */}
            <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                    <div className="w-64">
                        <Input
                            placeholder="Search accounts by code or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            id="coa-search"
                        />
                    </div>
                    <div className="w-48">
                        <Select
                            id="coa-status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Account Statuses</option>
                            <option value="active">Active Accounts Only</option>
                            <option value="inactive">Inactive Accounts Only</option>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Total Balance info for category */}
            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <BookOpen className="w-4 h-4 text-slate-500" />
                    <span>Group Ledger Totals</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Estimated Group Balance:</span>
                    <span className="font-mono text-indigo-400 font-black text-base">
                        ${getTypeMetrics(activeTypeTab).totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Accounts Table */}
            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="w-full h-11" />
                    <Skeleton className="w-full h-11" />
                    <Skeleton className="w-full h-11" />
                </div>
            ) : filteredAccounts.length === 0 ? (
                <EmptyState
                    title="No accounts under this type"
                    description={`Add custom ${activeTypeTab} accounts to organize your ledgers.`}
                    icon={Folder}
                />
            ) : (
                <Table 
                    columns={columns}
                    data={filteredAccounts}
                />
            )}

            {/* Add Account Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Create Ledger Account"
                size="md"
            >
                <form onSubmit={handleAddAccount} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4.5 h-4.5" />
                            <span className="font-bold">{error}</span>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Input
                                label="Account Code (Unique)"
                                id="acc-code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="e.g. 1050"
                                error={formErrors.code}
                            />
                        </div>
                        <div>
                            <Input
                                label="Account Name"
                                id="acc-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Chase Bank Checking"
                                error={formErrors.name}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Select
                                label="Account Type"
                                id="acc-type"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                error={formErrors.type}
                            >
                                <option value="asset">Asset (1xxx)</option>
                                <option value="liability">Liability (2xxx)</option>
                                <option value="equity">Equity (3xxx)</option>
                                <option value="revenue">Revenue (4xxx)</option>
                                <option value="expense">Expense (5xxx)</option>
                            </Select>
                        </div>
                        <div>
                            <Input
                                label="Detail Type"
                                id="acc-detail"
                                value={detailType}
                                onChange={(e) => setDetailType(e.target.value)}
                                placeholder="e.g. Cash, Inventory, Rent"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Input
                                label="Initial Balance"
                                type="number"
                                step="0.01"
                                id="acc-balance"
                                value={balance}
                                onChange={(e) => setBalance(e.target.value)}
                                placeholder="e.g. 1500.00"
                            />
                        </div>
                    </div>

                    <div>
                        <Textarea
                            label="Account Description (Optional)"
                            id="acc-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what items or entries log into this account..."
                            rows="2"
                        />
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                        <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Creating...' : 'Create Account'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Account Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={selectedAccount?.is_system ? "Edit System Account" : "Edit Custom Account"}
                size="md"
            >
                <form onSubmit={handleEditAccount} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4.5 h-4.5" />
                            <span className="font-bold">{error}</span>
                        </div>
                    )}
                    
                    {selectedAccount?.is_system && (
                        <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl text-[10px] text-slate-400 leading-relaxed flex items-start gap-2.5">
                            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <span>This is a **System Account** required by the core ERP module. Modifying the Account Code, Account Type, or initial balance settings is blocked. You may only rename or update its description.</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Input
                                label="Account Code"
                                id="edit-code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                disabled={selectedAccount?.is_system}
                                error={formErrors.code}
                            />
                        </div>
                        <div>
                            <Input
                                label="Account Name"
                                id="edit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                error={formErrors.name}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Select
                                label="Account Type"
                                id="edit-type"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                disabled={selectedAccount?.is_system}
                                error={formErrors.type}
                            >
                                <option value="asset">Asset (1xxx)</option>
                                <option value="liability">Liability (2xxx)</option>
                                <option value="equity">Equity (3xxx)</option>
                                <option value="revenue">Revenue (4xxx)</option>
                                <option value="expense">Expense (5xxx)</option>
                            </Select>
                        </div>
                        <div>
                            <Input
                                label="Detail Type"
                                id="edit-detail"
                                value={detailType}
                                onChange={(e) => setDetailType(e.target.value)}
                                placeholder="e.g. Cash, Inventory, Rent"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {!selectedAccount?.is_system && (
                            <div>
                                <Input
                                    label="Account Balance"
                                    type="number"
                                    step="0.01"
                                    id="edit-balance"
                                    value={balance}
                                    onChange={(e) => setBalance(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="flex items-center mt-6">
                            <label className="flex items-center gap-2.5 text-slate-300 font-semibold text-xs cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                                />
                                Account Status Active
                            </label>
                        </div>
                    </div>

                    <div>
                        <Textarea
                            label="Account Description (Optional)"
                            id="edit-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="2"
                        />
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Account confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Ledger Account"
                size="sm"
            >
                <div className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4.5 h-4.5" />
                            <span className="font-bold">{error}</span>
                        </div>
                    )}
                    
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Are you sure you want to permanently delete custom account <strong className="text-slate-200">{selectedAccount?.code} - {selectedAccount?.name}</strong>? This action cannot be undone and will erase all balance calculations associated with this code.
                    </p>

                    <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                        <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={handleDeleteAccount} 
                            disabled={submitting}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {submitting ? 'Deleting...' : 'Delete Account'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </PageWrapper>
    );
}
