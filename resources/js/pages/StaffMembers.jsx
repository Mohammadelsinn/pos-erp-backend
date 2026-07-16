import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Filters from '../components/Filters';
import { Input, Select, Checkbox } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { UserPlus, Edit, Trash2, Shield, ToggleLeft, ToggleRight, Search, Mail, Key, AlertCircle } from 'lucide-react';

export default function StaffMembers() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    
    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // for editing
    
    // Form fields
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formIsActive, setFormIsActive] = useState(true);
    const [formRole, setFormRole] = useState(''); // role ID
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    
    // Fetch users and roles on mount
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                axios.get('/api/users'),
                axios.get('/api/roles')
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
        } catch (err) {
            console.error('Failed to fetch staff/roles.', err);
            setError(err.response?.data?.message || 'Failed to load staff members. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filtered data calculation
    const filteredUsers = users.filter((u) => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              u.email.toLowerCase().includes(searchQuery.toLowerCase());
                              
        const matchesStatus = statusFilter === 'all' || 
                              (statusFilter === 'active' && u.is_active) || 
                              (statusFilter === 'inactive' && !u.is_active);
                              
        const uRole = u.roles && u.roles[0] ? u.roles[0].name : '';
        const matchesRole = roleFilter === 'all' || uRole === roleFilter;
                            
        return matchesSearch && matchesStatus && matchesRole;
    });

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setRoleFilter('all');
    };

    // Open create modal
    const handleCreateOpen = () => {
        setCurrentUser(null);
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormIsActive(true);
        setFormRole(roles[0]?.id || 2);
        setFormErrors({});
        setModalOpen(true);
    };

    // Open edit modal
    const handleEditOpen = (user) => {
        setCurrentUser(user);
        setFormName(user.name);
        setFormEmail(user.email);
        setFormPassword(''); // leave blank for editing
        setFormIsActive(!!user.is_active);
        
        const roleId = user.roles && user.roles[0] ? user.roles[0].id : (roles[0]?.id || 2);
        setFormRole(roleId);
        
        setFormErrors({});
        setModalOpen(true);
    };

    // Open delete confirm modal
    const handleDeleteOpen = (user) => {
        setCurrentUser(user);
        setDeleteModalOpen(true);
    };

    // Toggle user status
    const handleToggleStatus = async (user) => {
        try {
            const response = await axios.patch(`/api/users/${user.id}/toggle-status`);
            // Update local state
            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: response.data.user.is_active } : u));
        } catch (err) {
            console.error('Failed to toggle staff status.', err);
            alert(err.response?.data?.message || 'Failed to update staff member status. Please try again.');
        }
    };

    // Submit Create/Edit Form
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});
        
        // Basic validations
        const errors = {};
        if (!formName) errors.name = 'Name is required';
        if (!formEmail) errors.email = 'Email is required';
        if (!currentUser && !formPassword) errors.password = 'Password is required';
        if (!currentUser && formPassword && formPassword.length < 8) errors.password = 'Password must be at least 8 characters';
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        
        const payload = {
            name: formName,
            email: formEmail,
            is_active: formIsActive,
            roles: [Number(formRole)]
        };
        if (formPassword) {
            payload.password = formPassword;
        }

        try {
            if (currentUser) {
                // Update
                const response = await axios.put(`/api/users/${currentUser.id}`, payload);
                setUsers(users.map(u => u.id === currentUser.id ? response.data : u));
            } else {
                // Create
                const response = await axios.post('/api/users', payload);
                setUsers([...users, response.data]);
            }
            setModalOpen(false);
        } catch (err) {
            if (err.response?.status === 422) {
                setFormErrors(err.response.data.errors || {});
            } else {
                console.error('Failed to save staff member.', err);
                alert(err.response?.data?.message || 'Failed to save staff member. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Confirm delete
    const handleConfirmDelete = async () => {
        if (!currentUser) return;
        setSubmitting(true);

        try {
            await axios.delete(`/api/users/${currentUser.id}`);
            setUsers(users.filter(u => u.id !== currentUser.id));
        } catch (err) {
            console.error('Failed to delete staff member.', err);
            alert(err.response?.data?.message || 'Failed to delete staff member. Please try again.');
        } finally {
            setSubmitting(false);
            setDeleteModalOpen(false);
        }
    };

    // Columns config for reusable Table
    const columns = [
        {
            key: 'name',
            header: 'Staff Member',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center font-bold text-indigo-400">
                        {row.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-slate-200">{row.name}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'role',
            header: 'System Role',
            render: (row) => {
                const roleName = row.roles && row.roles[0] ? (row.roles[0].display_name || row.roles[0].name) : 'Store Cashier';
                return (
                    <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-slate-350">{roleName}</span>
                    </div>
                );
            }
        },
        {
            key: 'is_active',
            header: 'Account Status',
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
            key: 'created_at',
            header: 'Joined Date',
            render: (row) => {
                const date = new Date(row.created_at);
                return <span className="text-slate-400">{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>;
            }
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
                        title="Edit profile"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => handleDeleteOpen(row)}
                        className="p-2 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-900/35 hover:border-rose-900/60 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                        title="Delete account"
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
            icon={UserPlus} 
            onClick={handleCreateOpen}
        >
            Add Staff Member
        </Button>
    );

    return (
        <PageWrapper
            title="Staff Members Management"
            subtitle="Administer user access permissions, credentials, roles, and session states."
            breadcrumbs={[{ label: "Overview", path: "/dashboard" }, { label: "Staff Members" }]}
            actions={actions}
        >
            <div className="space-y-6">

                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                        <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
                        <span className="font-semibold">{error}</span>
                    </div>
                )}

                {/* Filters */}
                <Filters
                    searchPlaceholder="Search by name or email..."
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
                            <option value="active" className="bg-slate-900">Active Accounts</option>
                            <option value="inactive" className="bg-slate-900">Inactive Accounts</option>
                        </select>
                    </div>

                    {/* Role filter */}
                    <div className="w-full sm:w-40">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-355 outline-none focus:border-indigo-500/80 transition-colors"
                        >
                            <option value="all" className="bg-slate-900">All Roles</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.name} className="bg-slate-900">{role.display_name}s</option>
                            ))}
                        </select>
                    </div>
                </Filters>

                {/* Table or Empty State */}
                {isLoading ? (
                    <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="h-6 bg-slate-800/30 w-1/4 rounded-md"></div>
                        <div className="space-y-3">
                            <Skeleton variant="text" />
                            <Skeleton variant="text" className="w-11/12" />
                            <Skeleton variant="text" className="w-10/12" />
                        </div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <EmptyState 
                        title="No staff members found" 
                        description="Modify your search filters or add a new staff member account to this branch."
                        action={
                            <Button variant="secondary" size="sm" onClick={resetFilters}>
                                Clear filters
                            </Button>
                        }
                    />
                ) : (
                    <Table
                        columns={columns}
                        data={filteredUsers}
                        isLoading={false}
                        totalRecords={filteredUsers.length}
                    />
                )}

                {/* Add/Edit Modal */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={currentUser ? 'Modify Staff Member Profile' : 'Register New Staff Member'}
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
                                {currentUser ? 'Save Changes' : 'Create Account'}
                            </Button>
                        </>
                    }
                >
                    <form className="space-y-4">
                        <Input
                            label="Full Name"
                            id="form-name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="e.g. John Doe"
                            error={formErrors.name}
                            icon={Search}
                        />

                        <Input
                            label="Email Address"
                            id="form-email"
                            type="email"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            placeholder="e.g. john@pos-erp.test"
                            error={formErrors.email}
                            icon={Mail}
                        />

                        <Input
                            label={currentUser ? 'New Password (leave blank to keep current)' : 'Account Password'}
                            id="form-password"
                            type="password"
                            value={formPassword}
                            onChange={(e) => setFormPassword(e.target.value)}
                            placeholder={currentUser ? '••••••••' : 'Password (min. 8 chars)'}
                            error={formErrors.password}
                            icon={Key}
                        />

                        <Select
                            label="System Permissions Role"
                            id="form-role"
                            value={formRole}
                            onChange={(e) => setFormRole(Number(e.target.value))}
                            options={roles.map(r => ({ value: r.id, label: r.display_name }))}
                            icon={Shield}
                        />

                        <div className="pt-2">
                            <Checkbox
                                label="Active Account Status"
                                description="If inactive, the user cannot sign in or initiate drawer actions."
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
                    title="Confirm Account Deletion"
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
                                Delete Account
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-2">
                        <p className="font-semibold text-slate-200">Are you sure you want to delete this staff member account?</p>
                        <p className="text-slate-400">
                            This will permanently remove <strong className="text-white">{currentUser?.name} ({currentUser?.email})</strong> and detach all role privileges. This action cannot be undone.
                        </p>
                    </div>
                </Modal>

            </div>
        </PageWrapper>
    );
}
