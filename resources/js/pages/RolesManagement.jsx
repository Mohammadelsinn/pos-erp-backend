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
import { ShieldAlert, Plus, Edit, Trash2, Shield, ToggleLeft, ToggleRight, CheckSquare, AlertCircle } from 'lucide-react';

export default function RolesManagement() {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentRole, setCurrentRole] = useState(null); // for editing
    
    // Form fields
    const [formName, setFormName] = useState('');
    const [formDisplayName, setFormDisplayName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPermissions, setFormPermissions] = useState([]); // array of permission IDs
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Fetch roles and permissions
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                axios.get('/api/roles'),
                axios.get('/api/permissions')
            ]);
            setRoles(rolesRes.data);
            setPermissions(permsRes.data);
        } catch (err) {
            console.error('Failed to fetch roles/permissions.', err);
            setError(err.response?.data?.message || 'Failed to load roles. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter roles
    const filteredRoles = roles.filter((r) => {
        return r.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
    });

    // Open create modal
    const handleCreateOpen = () => {
        setCurrentRole(null);
        setFormName('');
        setFormDisplayName('');
        setFormDescription('');
        setFormPermissions([]);
        setFormErrors({});
        setModalOpen(true);
    };

    // Open edit modal
    const handleEditOpen = (role) => {
        setCurrentRole(role);
        setFormName(role.name);
        setFormDisplayName(role.display_name);
        setFormDescription(role.description || '');
        
        const permIds = role.permissions ? role.permissions.map(p => p.id) : [];
        setFormPermissions(permIds);
        
        setFormErrors({});
        setModalOpen(true);
    };

    // Open delete confirm modal
    const handleDeleteOpen = (role) => {
        setCurrentRole(role);
        setDeleteModalOpen(true);
    };

    // Toggle permission selection
    const handlePermissionToggle = (permId) => {
        if (formPermissions.includes(permId)) {
            setFormPermissions(formPermissions.filter(id => id !== permId));
        } else {
            setFormPermissions([...formPermissions, permId]);
        }
    };

    // Select all permissions
    const handleSelectAllPermissions = () => {
        if (formPermissions.length === permissions.length) {
            setFormPermissions([]);
        } else {
            setFormPermissions(permissions.map(p => p.id));
        }
    };

    // Form submit
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});

        const errors = {};
        if (!formName) errors.name = 'Role code-name is required';
        if (!formDisplayName) errors.display_name = 'Display name is required';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);

        const payload = {
            name: formName.toLowerCase().replace(/\s+/g, '_'),
            display_name: formDisplayName,
            description: formDescription,
            permissions: formPermissions
        };

        try {
            if (currentRole) {
                const response = await axios.put(`/api/roles/${currentRole.id}`, payload);
                setRoles(roles.map(r => r.id === currentRole.id ? response.data : r));
            } else {
                const response = await axios.post('/api/roles', payload);
                setRoles([...roles, response.data]);
            }
            setModalOpen(false);
        } catch (err) {
            if (err.response?.status === 422) {
                setFormErrors(err.response.data.errors || {});
            } else {
                console.error('Failed to save role.', err);
                alert(err.response?.data?.message || 'Failed to save role. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Confirm delete role
    const handleConfirmDelete = async () => {
        if (!currentRole) return;
        setSubmitting(true);
        try {
            await axios.delete(`/api/roles/${currentRole.id}`);
            setRoles(roles.filter(r => r.id !== currentRole.id));
        } catch (err) {
            console.error('Failed to delete role.', err);
            alert(err.response?.data?.message || 'Failed to delete role. Please try again.');
        } finally {
            setSubmitting(false);
            setDeleteModalOpen(false);
        }
    };

    // Columns config for reusable Table
    const columns = [
        {
            key: 'display_name',
            header: 'Role Display Name',
            render: (row) => (
                <div>
                    <div className="font-bold text-slate-205 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-400" />
                        <span>{row.display_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{row.name}</div>
                </div>
            )
        },
        {
            key: 'description',
            header: 'Description',
            render: (row) => (
                <span className="text-slate-400 line-clamp-2 max-w-sm font-medium">{row.description || 'No description provided.'}</span>
            )
        },
        {
            key: 'permissions',
            header: 'Granted Permissions',
            render: (row) => {
                const count = row.permissions ? row.permissions.length : 0;
                return (
                    <div className="flex flex-wrap gap-1 max-w-md">
                        {count === 0 ? (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-950/20 border border-slate-900 px-2 py-0.5 rounded-lg">No Permissions</span>
                        ) : count === permissions.length ? (
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                <CheckSquare className="w-3 h-3" />
                                All Access Privilege
                            </span>
                        ) : (
                            row.permissions.slice(0, 3).map((p) => (
                                <span 
                                    key={p.id} 
                                    className="text-[9px] font-bold text-slate-400 bg-slate-950/40 border border-slate-850 px-2 py-0.5 rounded-lg whitespace-nowrap"
                                >
                                    {p.display_name}
                                </span>
                            ))
                        )}
                        {count > 3 && count < permissions.length && (
                            <span className="text-[9px] font-semibold text-slate-500 bg-slate-950/20 border border-slate-900 px-1.5 py-0.5 rounded-lg">
                                +{count - 3} more
                            </span>
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
                        onClick={() => handleEditOpen(row)}
                        className="p-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-850 hover:border-slate-800 rounded-lg text-slate-450 hover:text-slate-200 transition-colors"
                        title="Configure permissions"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </button>
                    {row.name !== 'admin' && (
                        <button
                            onClick={() => handleDeleteOpen(row)}
                            className="p-2 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-900/35 hover:border-rose-900/60 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                            title="Delete role"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
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
            Add System Role
        </Button>
    );

    return (
        <PageWrapper
            title="System Roles & Permissions"
            subtitle="Configure granular access control privileges and staff role classes."
            breadcrumbs={[{ label: "Overview", path: "/dashboard" }, { label: "Roles & Permissions" }]}
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
                    searchPlaceholder="Search roles by name or description..."
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    onReset={() => setSearchQuery('')}
                />

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
                ) : filteredRoles.length === 0 ? (
                    <EmptyState 
                        title="No system roles found" 
                        description="Try resetting your filters or create a new access control role."
                        action={
                            <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                                Reset search query
                            </Button>
                        }
                    />
                ) : (
                    <Table
                        columns={columns}
                        data={filteredRoles}
                        isLoading={false}
                        totalRecords={filteredRoles.length}
                    />
                )}

                {/* Add/Edit Modal */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={currentRole ? `Modify Role: ${currentRole.display_name}` : 'Establish New Access Role'}
                    size="lg"
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
                                {currentRole ? 'Save Changes' : 'Create Role'}
                            </Button>
                        </>
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left: Role Details */}
                        <div className="space-y-4 border-r border-transparent md:border-slate-850 md:pr-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-2">Role Information</h4>
                            
                            <Input
                                label="Display Title Name"
                                id="form-display-name"
                                value={formDisplayName}
                                onChange={(e) => setFormDisplayName(e.target.value)}
                                placeholder="e.g. Sales Cashier Supervisor"
                                error={formErrors.display_name}
                            />

                            <Input
                                label="System Identification Name"
                                id="form-name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="e.g. sales_supervisor"
                                error={formErrors.name}
                                disabled={currentRole?.name === 'admin'}
                                helperText="Machine code-name. All spaces will be snake_cased automatically."
                            />

                            <Textarea
                                label="Privilege Description"
                                id="form-description"
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="State what responsibilities and modules this role category administers..."
                                rows={4}
                            />
                        </div>

                        {/* Right: Permission Toggles */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Privilege Grants</h4>
                                <button
                                    type="button"
                                    onClick={handleSelectAllPermissions}
                                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                                >
                                    {formPermissions.length === permissions.length ? 'Clear All' : 'Select All'}
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                {permissions.map((p) => {
                                    const isChecked = formPermissions.includes(p.id);
                                    return (
                                        <div 
                                            key={p.id}
                                            onClick={() => handlePermissionToggle(p.id)}
                                            className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer select-none transition-all ${
                                                isChecked
                                                    ? 'bg-indigo-950/10 border-indigo-500/40 text-slate-200'
                                                    : 'bg-slate-950/20 border-slate-850/60 text-slate-400 hover:border-slate-800'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                readOnly
                                                className="w-4 h-4 rounded border-slate-800 bg-slate-950/50 text-indigo-650 focus:ring-offset-0 pointer-events-none mt-0.5"
                                            />
                                            <div>
                                                <div className={`text-xs font-semibold ${isChecked ? 'text-indigo-400' : 'text-slate-350'}`}>
                                                    {p.display_name}
                                                </div>
                                                <div className="text-[10px] text-slate-500 leading-normal mt-0.5">{p.description}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* Delete Confirm Modal */}
                <Modal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    title="Confirm Role Removal"
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
                                Delete Role
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-2">
                        <p className="font-semibold text-slate-250 flex items-center gap-1.5">
                            <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                            Are you absolutely sure you want to delete this role?
                        </p>
                        <p className="text-slate-400">
                            This will permanently delete the role category <strong className="text-white">{currentRole?.display_name} ({currentRole?.name})</strong> from the database. Any staff members assigned this role will have their privileges revoked until re-assigned.
                        </p>
                    </div>
                </Modal>

            </div>
        </PageWrapper>
    );
}
