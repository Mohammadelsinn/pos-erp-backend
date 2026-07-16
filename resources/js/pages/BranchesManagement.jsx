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
import { Plus, Edit, Trash2, MapPin, Phone, Mail, ToggleLeft, ToggleRight, GitBranch, ShieldAlert, AlertCircle } from 'lucide-react';

export default function BranchesManagement() {
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(null); // for editing

    // Form fields
    const [formName, setFormName] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formIsActive, setFormIsActive] = useState(true);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Fetch branches
    const fetchBranches = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/branches');
            setBranches(response.data);
        } catch (err) {
            console.error('Failed to fetch branches.', err);
            setError(err.response?.data?.message || 'Failed to load branches. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    // Filter branches
    const filteredBranches = branches.filter((b) => {
        const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (b.address && b.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (b.email && b.email.toLowerCase().includes(searchQuery.toLowerCase()));
                              
        const matchesStatus = statusFilter === 'all' || 
                              (statusFilter === 'active' && b.is_active) || 
                              (statusFilter === 'inactive' && !b.is_active);
                              
        return matchesSearch && matchesStatus;
    });

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
    };

    // Open create modal
    const handleCreateOpen = () => {
        setCurrentBranch(null);
        setFormName('');
        setFormAddress('');
        setFormPhone('');
        setFormEmail('');
        setFormIsActive(true);
        setFormErrors({});
        setModalOpen(true);
    };

    // Open edit modal
    const handleEditOpen = (branch) => {
        setCurrentBranch(branch);
        setFormName(branch.name);
        setFormAddress(branch.address || '');
        setFormPhone(branch.phone || '');
        setFormEmail(branch.email || '');
        setFormIsActive(!!branch.is_active);
        setFormErrors({});
        setModalOpen(true);
    };

    // Open delete confirm modal
    const handleDeleteOpen = (branch) => {
        setCurrentBranch(branch);
        setDeleteModalOpen(true);
    };

    // Toggle branch status
    const handleToggleStatus = async (branch) => {
        try {
            const response = await axios.patch(`/api/branches/${branch.id}/toggle-status`);
            setBranches(branches.map(b => b.id === branch.id ? { ...b, is_active: response.data.branch.is_active } : b));
        } catch (err) {
            console.error('Failed to toggle branch status.', err);
            alert(err.response?.data?.message || 'Failed to update branch status. Please try again.');
        }
    };

    // Form submit
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});

        const errors = {};
        if (!formName) errors.name = 'Branch name is required';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);

        const payload = {
            name: formName,
            address: formAddress,
            phone: formPhone,
            email: formEmail,
            is_active: formIsActive
        };

        try {
            if (currentBranch) {
                const response = await axios.put(`/api/branches/${currentBranch.id}`, payload);
                setBranches(branches.map(b => b.id === currentBranch.id ? response.data : b));
            } else {
                const response = await axios.post('/api/branches', payload);
                setBranches([...branches, response.data]);
            }
            setModalOpen(false);
        } catch (err) {
            if (err.response?.status === 422) {
                setFormErrors(err.response.data.errors || {});
            } else {
                console.error('Failed to save branch.', err);
                alert(err.response?.data?.message || 'Failed to save branch. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Confirm delete branch
    const handleConfirmDelete = async () => {
        if (!currentBranch) return;
        setSubmitting(true);
        try {
            await axios.delete(`/api/branches/${currentBranch.id}`);
            setBranches(branches.filter(b => b.id !== currentBranch.id));
        } catch (err) {
            console.error('Failed to delete branch.', err);
            alert(err.response?.data?.message || 'Failed to delete branch. Please try again.');
        } finally {
            setSubmitting(false);
            setDeleteModalOpen(false);
        }
    };

    // Columns config for reusable Table
    const columns = [
        {
            key: 'name',
            header: 'Branch Location',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center font-bold text-indigo-400">
                        <GitBranch className="w-4.5 h-4.5" />
                    </div>
                    <div>
                        <div className="font-bold text-slate-205">{row.name}</div>
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-650" />
                            <span className="truncate max-w-[250px]">{row.address || 'No address registered.'}</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'contact',
            header: 'Contact Information',
            render: (row) => (
                <div className="space-y-0.5 text-slate-400 font-medium">
                    {row.phone && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{row.phone}</span>
                        </div>
                    )}
                    {row.email && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{row.email}</span>
                        </div>
                    )}
                    {!row.phone && !row.email && (
                        <span className="text-[10px] text-slate-600 italic">No contact info.</span>
                    )}
                </div>
            )
        },
        {
            key: 'is_active',
            header: 'Operating Status',
            render: (row) => (
                <button
                    onClick={() => handleToggleStatus(row)}
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
                        onClick={() => handleEditOpen(row)}
                        className="p-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-850 hover:border-slate-800 rounded-lg text-slate-450 hover:text-slate-200 transition-colors"
                        title="Edit location details"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => handleDeleteOpen(row)}
                        className="p-2 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-900/35 hover:border-rose-900/60 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                        title="Remove branch location"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )
        }
    ];

    const actions = (
        <Button 
            variant="primary" 
            size="md" 
            icon={Plus} 
            onClick={handleCreateOpen}
        >
            Add Branch Location
        </Button>
    );

    return (
        <PageWrapper
            title="Company Branch Locations"
            subtitle="Administer store register divisions, warehouse depots, and regional offices."
            breadcrumbs={[{ label: "Overview", path: "/dashboard" }, { label: "Branches" }]}
            actions={actions}
        >
            <div className="space-y-6">

                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                        <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
                        <span className="font-semibold">{error}</span>
                    </div>
                )}

                {/* Search */}
                <Filters
                    searchPlaceholder="Search branch by name, address or email..."
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    onReset={resetFilters}
                >
                    {/* Status filter */}
                    <div className="w-full sm:w-36">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-355 outline-none focus:border-indigo-500/80 transition-colors"
                        >
                            <option value="all" className="bg-slate-900">All Statuses</option>
                            <option value="active" className="bg-slate-900">Active Only</option>
                            <option value="inactive" className="bg-slate-900">Inactive Only</option>
                        </select>
                    </div>
                </Filters>

                {/* Table or Loading */}
                {isLoading ? (
                    <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="h-6 bg-slate-800/30 w-1/4 rounded-md"></div>
                        <div className="space-y-3">
                            <Skeleton variant="text" />
                            <Skeleton variant="text" className="w-11/12" />
                            <Skeleton variant="text" className="w-10/12" />
                        </div>
                    </div>
                ) : filteredBranches.length === 0 ? (
                    <EmptyState 
                        title="No branches found" 
                        description="Try resetting your filters or register a new branch location."
                        action={
                            <Button variant="secondary" size="sm" onClick={resetFilters}>
                                Reset search filters
                            </Button>
                        }
                    />
                ) : (
                    <Table
                        columns={columns}
                        data={filteredBranches}
                        isLoading={false}
                        totalRecords={filteredBranches.length}
                    />
                )}

                {/* Add/Edit Modal */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={currentBranch ? `Modify Branch: ${currentBranch.name}` : 'Register New Branch'}
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
                                {currentBranch ? 'Save Changes' : 'Create Location'}
                            </Button>
                        </>
                    }
                >
                    <form className="space-y-4">
                        <Input
                            label="Branch/Location Name"
                            id="form-name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="e.g. Downtown Outlet"
                            error={formErrors.name}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Phone Number"
                                id="form-phone"
                                value={formPhone}
                                onChange={(e) => setFormPhone(e.target.value)}
                                placeholder="e.g. +1 (555) 000-0000"
                            />

                            <Input
                                label="Email Address"
                                id="form-email"
                                type="email"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                placeholder="e.g. downtown@yourcompany.com"
                            />
                        </div>

                        <Textarea
                            label="Physical Address"
                            id="form-address"
                            value={formAddress}
                            onChange={(e) => setFormAddress(e.target.value)}
                            placeholder="Street details, building blocks, city..."
                            rows={3}
                        />

                        <div className="pt-2">
                            <Checkbox
                                label="Operating Status"
                                description="Inactive branches cannot run register drawers or checkout sales."
                                id="form-active"
                                checked={formIsActive}
                                onChange={(e) => setFormIsActive(e.target.checked)}
                            />
                        </div>
                    </form>
                </Modal>

                {/* Delete Confirm Modal */}
                <Modal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    title="Remove Branch Location"
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
                                Remove Branch
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-2">
                        <p className="font-semibold text-slate-205 flex items-center gap-1.5">
                            <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                            Are you sure you want to delete this branch location?
                        </p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            This will permanently remove the branch location <strong className="text-white">{currentBranch?.name}</strong>. It will detach the branch assignment from any terminal drawers. This action cannot be undone.
                        </p>
                    </div>
                </Modal>

            </div>
        </PageWrapper>
    );
}
