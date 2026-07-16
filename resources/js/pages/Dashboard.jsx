import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import { useAuth } from '../context/AuthContext';
import {
    Users, Shield, Key, GitBranch, ArrowUpRight,
    RefreshCw, Calendar, MapPin, Building, Globe,
    Settings as SettingsIcon, ShieldCheck, CheckCircle2, Circle,
    AlertCircle
} from 'lucide-react';
import { Skeleton } from '../components/Skeleton';

export default function Dashboard() {
    const { user, activeBranch } = useAuth();

    const [data, setData] = useState({
        users: [],
        roles: [],
        permissions: [],
        branches: [],
        settings: {
            company_name: '',
            currency: 'USD',
            timezone: 'UTC',
            date_format: 'Y-m-d'
        }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(null);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [usersRes, rolesRes, permsRes, branchesRes, settingsRes] = await Promise.all([
                axios.get('/api/users'),
                axios.get('/api/roles'),
                axios.get('/api/permissions'),
                axios.get('/api/branches'),
                axios.get('/api/settings')
            ]);
            
            setData({
                users: usersRes.data || [],
                roles: rolesRes.data || [],
                permissions: permsRes.data || [],
                branches: branchesRes.data || [],
                settings: settingsRes.data || {
                    company_name: '',
                    currency: 'USD',
                    timezone: 'UTC',
                    date_format: 'Y-m-d'
                }
            });
        } catch (err) {
            console.error('Failed to load dashboard data.', err);
            setError(err.response?.data?.message || 'Failed to load dashboard data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        await fetchDashboardData();
        setTimeout(() => setIsSyncing(false), 600);
    };

    // Prepare stats counts dynamically
    const stats = [
        { 
            title: "Staff Directory", 
            value: `${data.users.length} Active Accounts`, 
            description: `${data.users.filter(u => u.is_active).length} online/active sessions`,
            icon: Users, 
            color: "indigo",
            link: "/staff"
        },
        { 
            title: "Access Control Roles", 
            value: `${data.roles.length} System Classes`, 
            description: "Custom role permissions mapped",
            icon: Shield, 
            color: "violet",
            link: "/roles"
        },
        { 
            title: "Access Credentials", 
            value: `${data.permissions.length} Permissions`, 
            description: "Granular capability rules",
            icon: Key, 
            color: "amber",
            link: "/permissions"
        },
        { 
            title: "Branch Divisions", 
            value: `${data.branches.length} Total Branches`, 
            description: `${data.branches.filter(b => b.is_active).length} currently operating`,
            icon: GitBranch, 
            color: "rose",
            link: "/branches"
        }
    ];

    const actions = (
        <>
            <button 
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold text-slate-350 hover:text-white transition-all disabled:opacity-50"
            >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
                Sync System Data
            </button>
            <Link 
                to="/settings"
                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 active:scale-95 transition-all"
            >
                <SettingsIcon className="w-3.5 h-3.5" />
                Configure preferences
            </Link>
        </>
    );

    return (
        <PageWrapper
            title="System Command Center"
            subtitle={`Welcome back, ${user?.name} (${user?.role}). Active register drawer: ${activeBranch}`}
            breadcrumbs={[{ label: "Overview" }]}
            actions={actions}
        >
            <div className="space-y-6">

                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                        <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
                        <span className="font-semibold">{error}</span>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, idx) => {
                        const Icon = stat.icon;
                        const colorMap = {
                            indigo: "from-indigo-500/10 to-indigo-500/0 text-indigo-400 border-indigo-500/20 group-hover:border-indigo-500/40",
                            violet: "from-violet-500/10 to-violet-500/0 text-violet-400 border-violet-500/20 group-hover:border-violet-500/40",
                            amber: "from-amber-500/10 to-amber-500/0 text-amber-400 border-amber-500/20 group-hover:border-amber-500/40",
                            rose: "from-rose-500/10 to-rose-500/0 text-rose-400 border-rose-500/20 group-hover:border-rose-500/40",
                        };

                        return (
                            <Link 
                                to={stat.link}
                                key={idx}
                                className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/85 p-5 rounded-2xl shadow-xl hover:border-slate-700/60 hover:bg-slate-900/70 transition-all group block text-left"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.title}</p>
                                        <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">{stat.value}</h3>
                                    </div>
                                    <div className={`p-3 rounded-xl bg-gradient-to-br border transition-all ${colorMap[stat.color]}`}>
                                        <Icon className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />
                                    </div>
                                </div>
                                
                                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold tracking-wide">
                                    <span className="truncate">{stat.description}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Welcoming Banner / Hero Area */}
                <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-indigo-950/15 border border-slate-800/90 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                    <div className="absolute top-[-40%] right-[-10%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none"></div>
                    <div className="space-y-3 z-10 text-center md:text-left">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Security Shield Activated
                        </div>
                        <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
                            {data.settings.company_name || 'Enterprise'} ERP Hub
                        </h2>
                        <p className="text-xs text-slate-450 max-w-xl leading-relaxed">
                            Configure company regional parameters, access tokens, branch locations, and staff profiles dynamically. Select options from the stats grid or sidebar to edit system entities.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0 z-10 w-full md:w-auto justify-center">
                        <Link 
                            to="/company"
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-md"
                        >
                            <Building className="w-4 h-4 text-indigo-450" />
                            Edit Profile
                        </Link>
                        <Link 
                            to="/permissions"
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-md"
                        >
                            <Key className="w-4 h-4 text-amber-450" />
                            Manage Keys
                        </Link>
                    </div>
                </div>

                {/* Main Dashboard Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Columns: Staff Directory Summary */}
                    <div className="lg:col-span-2 backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 lg:p-6 shadow-xl flex flex-col">
                        <div className="flex justify-between items-center mb-5 border-b border-slate-850 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-200">Staff Members Quick view</h3>
                                <p className="text-xs text-slate-500">Live roster of corporate accounts.</p>
                            </div>
                            <Link to="/staff" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                                Manage Staff
                            </Link>
                        </div>

                        {isLoading ? (
                            <div className="space-y-3 py-4">
                                <Skeleton variant="text" />
                                <Skeleton variant="text" className="w-11/12" />
                            </div>
                        ) : data.users.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-xs font-medium">No registered staff.</div>
                        ) : (
                            <div className="overflow-x-auto flex-grow">
                                <table className="w-full text-left border-collapse text-xs font-medium">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-500">
                                            <th className="py-2.5 px-2 uppercase tracking-wider font-bold">Staff Member</th>
                                            <th className="py-2.5 px-2 uppercase tracking-wider font-bold">Primary Role</th>
                                            <th className="py-2.5 px-2 uppercase tracking-wider font-bold text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-850/60 text-slate-350">
                                        {data.users.slice(0, 4).map((staff) => (
                                            <tr key={staff.id} className="hover:bg-slate-950/20 transition-colors">
                                                <td className="py-3 px-2 flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center font-bold text-indigo-400 text-[10px]">
                                                        {staff.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-250">{staff.name}</div>
                                                        <div className="text-[9px] text-slate-500 font-semibold">{staff.email}</div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="text-[10px] text-slate-400 font-semibold">
                                                        {staff.roles?.[0]?.display_name || staff.roles?.[0]?.name || 'Store Cashier'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <span className={`inline-flex px-1.5 py-0.2 rounded border text-[9px] font-bold ${
                                                        staff.is_active
                                                            ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                                                            : 'bg-rose-500/10 text-rose-455 border-rose-500/20'
                                                    }`}>
                                                        {staff.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Local Settings & Branches Info */}
                    <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 lg:p-6 shadow-xl space-y-6 flex flex-col justify-between">
                        
                        {/* Regional preference details */}
                        <div className="space-y-4">
                            <div className="border-b border-slate-850 pb-3">
                                <h3 className="text-sm font-bold text-slate-200">Localization preferences</h3>
                                <p className="text-xs text-slate-500">Active regional configurations.</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-slate-950/45 border border-slate-850 rounded-xl text-xs font-semibold text-slate-350">
                                    <div className="flex items-center gap-2">
                                        <Building className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>Terminal Currency</span>
                                    </div>
                                    <span className="font-bold text-slate-200">{data.settings.currency || 'USD'}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-950/45 border border-slate-850 rounded-xl text-xs font-semibold text-slate-350">
                                    <div className="flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>System Timezone</span>
                                    </div>
                                    <span className="font-bold text-slate-200 truncate max-w-[120px]">{data.settings.timezone || 'UTC'}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-950/45 border border-slate-850 rounded-xl text-xs font-semibold text-slate-350">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>Date Layout</span>
                                    </div>
                                    <span className="font-bold text-slate-200">{data.settings.date_format || 'Y-m-d'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Branch Status */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-slate-850 pt-4">
                                <span>Operating Outlets</span>
                                <Link to="/branches" className="text-indigo-400 hover:text-indigo-300">View All</Link>
                            </div>
                            
                            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                {data.branches.slice(0, 3).map((branch) => (
                                    <div key={branch.id} className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                        <div className="flex items-center gap-2 truncate">
                                            {branch.is_active ? (
                                                <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
                                            ) : (
                                                <Circle className="w-2 h-2 text-rose-500 fill-rose-500" />
                                            )}
                                            <span className="truncate">{branch.name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 shrink-0">
                                            {branch.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </PageWrapper>
    );
}
