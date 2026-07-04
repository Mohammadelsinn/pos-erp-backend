import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { 
    LayoutGrid, Calculator, ShoppingBag, Package, Archive, 
    ArrowUpRight, Truck, Warehouse, DollarSign, TrendingDown, 
    CreditCard, Percent, Key, Users, UserCheck, GitBranch, 
    CheckSquare, Store, FileText, Settings, Shield, ChevronLeft, ChevronRight, Menu, Lock, Building,
    AlertTriangle
} from 'lucide-react';

const navigationGroups = [
    {
        title: "Core Operations",
        items: [
            { name: "Dashboard", path: "/dashboard", icon: LayoutGrid },
            { name: "POS Station", path: "/pos", icon: Calculator },
            { name: "Order Ledger", path: "/orders", icon: ShoppingBag },
        ]
    },
    {
        title: "Catalog & Supply",
        items: [
            { name: "Products", path: "/products", icon: Package },
            { name: "Inventory Stock", path: "/inventory", icon: Archive },
            { name: "Stock Adjustment", path: "/inventory/adjust", icon: CheckSquare },
            { name: "Damaged/Lost Stock", path: "/inventory/damaged-lost", icon: AlertTriangle },
            { name: "Movement History", path: "/inventory/movement-history", icon: FileText },
            { name: "Purchases", path: "/purchases", icon: ArrowUpRight },
            { name: "Suppliers", path: "/suppliers", icon: Truck },
            { name: "Warehouses", path: "/warehouses", icon: Warehouse },
        ]
    },
    {
        title: "Accounting & Finance",
        items: [
            { name: "General Ledger", path: "/accounting", icon: DollarSign },
            { name: "Expenses Tracker", path: "/expenses", icon: TrendingDown },
            { name: "Payments", path: "/payments", icon: CreditCard },
            { name: "Commissions", path: "/commissions", icon: Percent },
            { name: "Cash Drawer", path: "/cash-drawer", icon: Key },
        ]
    },
    {
        title: "Staff & Locations",
        items: [
            { name: "Customers Profile", path: "/customers", icon: Users },
            { name: "Staff Members", path: "/staff", icon: UserCheck },
            { name: "System Roles", path: "/roles", icon: Shield },
            { name: "System Permissions", path: "/permissions", icon: Lock },
            { name: "Branch Settings", path: "/branches", icon: GitBranch },
            { name: "Task Approvals", path: "/approvals", icon: CheckSquare },
        ]
    },
    {
        title: "Integrations & Logs",
        items: [
            { name: "Company Profile", path: "/company", icon: Building },
            { name: "Shopify Sync", path: "/shopify", icon: Store },
            { name: "WooCommerce Sync", path: "/woocommerce", icon: Store },
            { name: "Activity Logs", path: "/activity-logs", icon: FileText },
            { name: "System Settings", path: "/settings", icon: Settings },
        ]
    }
];

export default function Sidebar({ isOpen, toggleSidebar, isMobileOpen, closeMobileSidebar }) {
    const [companyInfo, setCompanyInfo] = useState({
        name: 'System ERP',
        logo: ''
    });

    const fetchCompanyInfo = async () => {
        try {
            const response = await axios.get('/api/settings');
            setCompanyInfo({
                name: response.data.company_name || 'System ERP',
                logo: response.data.company_logo || ''
            });
        } catch (err) {
            console.warn('Failed to load company settings in sidebar', err);
        }
    };

    useEffect(() => {
        fetchCompanyInfo();

        const handleUpdate = () => {
            fetchCompanyInfo();
        };

        window.addEventListener('company-settings-updated', handleUpdate);
        return () => {
            window.removeEventListener('company-settings-updated', handleUpdate);
        };
    }, []);

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            {isMobileOpen && (
                <div 
                    onClick={closeMobileSidebar}
                    className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                />
            )}

            {/* Sidebar Column */}
            <aside 
                className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800/80 transition-all duration-300 ${
                    isOpen ? 'w-64' : 'w-[72px]'
                } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                {/* Brand / Logo Area */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/85">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {companyInfo.logo ? (
                            <div className="w-9 h-9 border border-slate-800 bg-slate-950/40 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-indigo-500/5">
                                <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shrink-0 shadow-lg shadow-indigo-500/10">
                                <Shield className="w-5 h-5" />
                            </div>
                        )}
                        {isOpen && (
                            <span className="font-bold text-sm bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent truncate tracking-tight">
                                {companyInfo.name}
                            </span>
                        )}
                    </div>
                    {/* Collapsible toggle buttons (hidden on mobile) */}
                    <button 
                        onClick={toggleSidebar}
                        className="hidden lg:flex items-center justify-center w-6 h-6 rounded-lg bg-slate-950/60 hover:bg-slate-950/100 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        {isOpen ? <ChevronLeft className="w-4.5 h-4.5" /> : <ChevronRight className="w-4.5 h-4.5" />}
                    </button>
                </div>

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    {navigationGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-1.5">
                            {isOpen ? (
                                <h3 className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                                    {group.title}
                                </h3>
                            ) : (
                                <div className="border-t border-slate-800/80 my-2 mx-1 first:hidden" />
                            )}
                            
                            <ul className="space-y-0.5">
                                {group.items.map((item, itemIdx) => {
                                    const Icon = item.icon;
                                    return (
                                        <li key={itemIdx}>
                                            <NavLink
                                                to={item.path}
                                                onClick={closeMobileSidebar}
                                                className={({ isActive }) => 
                                                    `flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                                                        isActive 
                                                            ? 'text-white bg-indigo-600/90 shadow-md shadow-indigo-600/15' 
                                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40 border border-transparent hover:border-slate-800/60'
                                                    }`
                                                }
                                                title={!isOpen ? item.name : undefined}
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-105 duration-200 ${
                                                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                                                        }`} />
                                                        {isOpen && <span className="truncate">{item.name}</span>}
                                                        {!isOpen && (
                                                            <div className="absolute left-[70px] bg-slate-950 border border-slate-800 text-slate-200 font-semibold px-2 py-1.5 rounded-lg text-[10px] invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-xl">
                                                                {item.name}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </NavLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Sidebar footer showing connected status */}
                <div className="p-4 border-t border-slate-800/85 bg-slate-950/20 text-center">
                    {isOpen ? (
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span>Sys status:</span>
                            <span className="flex items-center gap-1.5 text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                Connected
                            </span>
                        </div>
                    ) : (
                        <div className="inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900 shadow-glow animate-pulse"></div>
                    )}
                </div>
            </aside>
        </>
    );
}
