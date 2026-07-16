import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Filters from '../components/Filters';
import { Input, Textarea } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { ShieldAlert, Plus, Edit, Trash2, Key, CheckCircle, Shield, AlertCircle } from 'lucide-react';

const SYSTEM_PERMISSIONS = [
    'manage_users',
    'manage_roles',
    'manage_permissions',
    'view_dashboard',
    'manage_settings',
    'manage_branches'
];

export default function PermissionsManagement() {
    const [permissions, setPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentPermission, setCurrentPermission] = useState(null); // for editing

    // Form fields
    const [formName, setFormName] = useState('');
    const [formDisplayName, setFormDisplayName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Fetch permissions
    const fetchPermissions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/permissions');
            setPermissions(response.data);
        } catch (err) {
            console.error('Failed to fetch permissions.', err);
            setError(err.response?.data?.message || 'Failed to load permissions. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPermissions();
    }, []);

    // Filter permissions
    const filteredPermissions = permissions.filter((p) => {
        return p.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    });

    // Open create modal
    const handleCreateOpen = () => {
        setCurrentPermission(null);
        setFormName('');
        setFormDisplayName('');
        setFormDescription('');
        setFormErrors({});
        setModalOpen(true);
    };

    // Open edit modal
    const handleEditOpen = (permission) => {
        setCurrentPermission(permission);
        setFormName(permission.name);
        setFormDisplayName(permission.display_name);
        setFormDescription(permission.description || '');
        setFormErrors({});
        setModalOpen(true);
    };

    // Open delete confirm modal
    const handleDeleteOpen = (permission) => {
        // Prevent deleting system default permissions
        if (SYSTEM_PERMISSIONS.includes(permission.name)) return;
        setCurrentPermission(permission);
        setDeleteModalOpen(true);
    };

    // Form submit
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});

        const errors = {};
        if (!formDisplayName) errors.display_name = 'Display name is required';
        if (!formName) errors.name = 'Permission code-name is required';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);

        const payload = {
            name: formName.toLowerCase().replace(/\s+/g, '_'),
            display_name: formDisplayName,
            description: formDescription
        };

        try {
            if (currentPermission) {
                const response = await axios.put(`/api/permissions/${currentPermission.id}`, payload);
                setPermissions(permissions.map(p => p.id === currentPermission.id ? { ...p, ...response.data } : p));
            } else {
                const response = await axios.post('/api/permissions', payload);
                setPermissions([...permissions, response.data]);
            }
            setModalOpen(false);
        } catch (err) {
            if (err.response?.status === 422) {
                setFormErrors(err.response.data.errors || {});
            } else {
                console.error('Failed to save permission.', err);
                alert(err.response?.data?.message || 'Failed to save permission. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Confirm delete permission
    const handleConfirmDelete = async () => {
        if (!currentPermission) return;
        setSubmitting(true);
        try {
            await axios.delete(`/api/permissions/${currentPermission.id}`);
            setPermissions(permissions.filter(p => p.id !== currentPermission.id));
        } catch (err) {
            console.error('Failed to delete permission.', err);
            alert(err.response?.data?.message || 'Failed to delete permission. Please try again.');
        } finally {
            setSubmitting(false);
            setDeleteModalOpen(false);
        }
    };

    // Columns config for reusable Table
    const columns = [
        {
            key: 'display_name',
            header: 'Permission',
            render: (row) => (
                <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{row.display_name}</span>
                        {SYSTEM_PERMISSIONS.includes(row.name) && (
                            <span className="text-[9px] font-extrabold text-indigo-450 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 select-none">
                                <CheckCircle className="w-2.5 h-2.5" />
                                SYSTEM
                            </span>
                        )}
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
            key: 'roles',
            header: 'Granted To Roles',
            render: (row) => {
                const associatedRoles = row.roles || [];
                return (
                    <div className="flex flex-wrap gap-1 max-w-md">
                        {associatedRoles.length === 0 ? (
                            <span className="text-[9px] font-semibold text-slate-650 bg-slate-950/20 border border-slate-900/60 px-2 py-0.5 rounded-lg">Unassigned</span>
                        ) : (
                            associatedRoles.map((role) => (
                                <span 
                                    key={role.id || role.name} 
                                    className="text-[9px] font-bold text-slate-400 bg-slate-950/40 border border-slate-850 px-2 py-0.5 rounded-lg whitespace-nowrap flex items-center gap-1"
                                >
                                    <Shield className="w-2.5 h-2.5 text-indigo-400/80" />
                                    {role.display_name || role.name}
                                </span>
                            ))
                        )}
                    </div>
                );
            }
        },
        {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (row) => {
                const isSystem = SYSTEM_PERMISSIONS.includes(row.name);
                return (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => handleEditOpen(row)}
                            className="p-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-850 hover:border-slate-800 rounded-lg text-slate-450 hover:text-slate-200 transition-colors"
                            title="Edit permission details"
                        >
                            <Edit className="w-3.5 h-3.5" />
                        </button>
                        {!isSystem ? (
                            <button
                                onClick={() => handleDeleteOpen(row)}
                                className="p-2 bg-rose-950/15 hover:bg-rose-950/30 border border-rose-900/35 hover:border-rose-900/60 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                                title="Delete custom permission"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <div className="w-[31.5px]" /> // placeholder spacer to match sizes
                        )}
                    </div>
                );
            }
        }
    ];

    const actions = (
        <Button 
            variant="primary" 
            size="md" 
            icon={Plus} 
            onClick={handleCreateOpen}
        >
            Create Permission
        </Button>
    );

    return (
        <PageWrapper
            title="System Permissions Directory"
            subtitle="View, construct, and edit access control credentials that drive POS modules."
            breadcrumbs={[{ label: "Overview", path: "/dashboard" }, { label: "Permissions" }]}
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
                    searchPlaceholder="Search permissions by display title or code name..."
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
                ) : filteredPermissions.length === 0 ? (
                    <EmptyState 
                        title="No system permissions found" 
                        description="Try resetting your filters or create a new access credential."
                        action={
                            <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                                Reset search query
                            </Button>
                        }
                    />
                ) : (
                    <Table
                        columns={columns}
                        data={filteredPermissions}
                        isLoading={false}
                        totalRecords={filteredPermissions.length}
                    />
                )}

                {/* Add/Edit Modal */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={currentPermission ? `Modify Permission: ${currentPermission.display_name}` : 'Create New Permission'}
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
                                {currentPermission ? 'Save Changes' : 'Create Permission'}
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <Input
                            label="Display Name Title"
                            id="form-display-name"
                            value={formDisplayName}
                            onChange={(e) => setFormDisplayName(e.target.value)}
                            placeholder="e.g. Process Refunds"
                            error={formErrors.display_name}
                        />

                        <Input
                            label="System Identification Name (Code-Name)"
                            id="form-name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="e.g. process_refunds"
                            error={formErrors.name}
                            disabled={currentPermission && SYSTEM_PERMISSIONS.includes(currentPermission.name)}
                            helperText="Machine identifier used in authorization gates. Spaces will automatically convert to snake_case."
                        />

                        <Textarea
                            label="Permission Description"
                            id="form-description"
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            placeholder="Describe what modules or actions this specific permission unlocks..."
                            rows={3}
                        />
                    </div>
                </Modal>

                {/* Delete Confirm Modal */}
                <Modal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    title="Delete Custom Permission"
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
                                Delete Permission
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-2">
                        <p className="font-semibold text-slate-205 flex items-center gap-1.5">
                            <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                            Are you sure you want to permanently delete this permission?
                        </p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            This will permanently delete the custom permission <strong className="text-white">{currentPermission?.display_name} ({currentPermission?.name})</strong>. It will be detached from any roles currently possessing it. This action is irreversible.
                        </p>
                    </div>
                </Modal>

            </div>
        </PageWrapper>
    );
}
