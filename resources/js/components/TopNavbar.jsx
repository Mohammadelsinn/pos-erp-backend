import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, Search, Bell, GitBranch, ChevronDown, User, LogOut, Settings, HelpCircle, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const mockNotifications = [
    { id: 1, title: 'Low Stock Alert', desc: 'iPhone 15 Pro Max stock is below 5 units.', time: '10m ago', read: false },
    { id: 2, title: 'New Shopify Order', desc: 'Order #SH-9839 pending inventory fulfillment.', time: '45m ago', read: false },
    { id: 3, title: 'Approval Required', desc: 'Expense request from Sarah Cashier ($450.00).', time: '2h ago', read: true }
];

export default function TopNavbar({ toggleSidebar, toggleMobileSidebar }) {
    const { user, logout, activeBranch, changeBranch } = useAuth();
    
    // Dropdown states
    const [branchOpen, setBranchOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    
    // Theme state
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'dark');

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // Refs for clicking outside
    const branchRef = useRef(null);
    const notifRef = useRef(null);
    const profileRef = useRef(null);

    // Click outside listener
    useEffect(() => {
        function handleClickOutside(event) {
            if (branchRef.current && !branchRef.current.contains(event.target)) setBranchOpen(false);
            if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
            if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [branches, setBranches] = useState(['Main Branch']);

    useEffect(() => {
        axios.get('/api/branches')
            .then(res => {
                const activeBranches = res.data.filter(b => b.is_active).map(b => b.name);
                if (activeBranches.length > 0) {
                    setBranches(activeBranches);
                    if (!activeBranches.includes(activeBranch)) {
                        changeBranch(activeBranches[0]);
                    }
                }
            })
            .catch(err => {
                console.warn('API error loading switcher branches, using defaults.', err);
                setBranches(['Main Branch', 'Warehouse A', 'Downtown POS Branch', 'Uptown POS Branch']);
            });
    }, [activeBranch]);

    return (
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 bg-slate-900 border-b border-slate-800/80 backdrop-blur-md">
            
            {/* Left Side: Mobile Menu Button & Search */}
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleMobileSidebar}
                    className="p-2 lg:hidden rounded-xl bg-slate-950/60 hover:bg-slate-950/100 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <button
                    onClick={toggleSidebar}
                    className="hidden lg:p-2 rounded-xl bg-slate-950/60 hover:bg-slate-950/100 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Global Search */}
                <div className="hidden md:flex items-center relative w-64 lg:w-80">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5" />
                    <input
                        type="text"
                        placeholder="Quick search (Ctrl + K)..."
                        className="w-full bg-slate-950/50 border border-slate-800/80 rounded-xl pl-10 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
                    />
                </div>
            </div>

            {/* Right Side: Quick Action Widgets */}
            <div className="flex items-center gap-2 sm:gap-3.5">
                
                {/* Branch Switcher Dropdown */}
                <div className="relative" ref={branchRef}>
                    <button
                        onClick={() => setBranchOpen(!branchOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all"
                    >
                        <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="max-w-[80px] sm:max-w-none truncate">{activeBranch}</span>
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>
                    {branchOpen && (
                        <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800/90 shadow-2xl rounded-xl py-1.5 z-50">
                            <div className="px-3 py-1.5 border-b border-slate-800/85 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Switch active warehouse / branch
                            </div>
                            {branches.map((b) => (
                                <button
                                    key={b}
                                    onClick={() => {
                                        changeBranch(b);
                                        setBranchOpen(false);
                                    }}
                                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-950/60 transition-colors flex items-center justify-between ${
                                        activeBranch === b ? 'text-indigo-400 bg-slate-950/30' : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    <span>{b}</span>
                                    {activeBranch === b && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="p-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-slate-205 transition-all flex items-center justify-center"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-indigo-400" />}
                </button>

                {/* Notifications Panel */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setNotifOpen(!notifOpen)}
                        className="relative p-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
                    >
                        <Bell className="w-4.5 h-4.5" />
                        {mockNotifications.some(n => !n.read) && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-glow animate-pulse"></span>
                        )}
                    </button>
                    {notifOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800/90 shadow-2xl rounded-xl overflow-hidden z-50">
                            <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/85 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-200">Alert Center</span>
                                <button className="text-[10px] font-semibold text-indigo-400 hover:underline">Mark all as read</button>
                            </div>
                            <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
                                {mockNotifications.map((notif) => (
                                    <div key={notif.id} className={`p-3.5 text-left transition-colors hover:bg-slate-950/40 ${!notif.read ? 'bg-indigo-950/5' : ''}`}>
                                        <div className="flex justify-between items-baseline gap-2">
                                            <h4 className={`text-xs font-semibold ${!notif.read ? 'text-white' : 'text-slate-300'}`}>{notif.title}</h4>
                                            <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">{notif.time}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">{notif.desc}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="p-2 border-t border-slate-800/85 bg-slate-950/10 text-center">
                                <button className="text-[10px] font-bold text-slate-400 hover:text-slate-200 block w-full py-1">View all activity</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="h-6 w-[1px] bg-slate-850"></div>

                {/* Profile Panel */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className="flex items-center gap-2 p-1 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
                    >
                        <img
                            src={user?.avatar || "https://ui-avatars.com/api/?name=Admin"}
                            alt={user?.name}
                            className="w-7 h-7 rounded-lg border border-slate-800/80 object-cover shrink-0"
                        />
                        <span className="hidden sm:inline text-xs font-semibold text-slate-300 pr-1 truncate max-w-[100px]">
                            {user?.name}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 pr-1 hidden sm:block shrink-0" />
                    </button>
                    {profileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800/90 shadow-2xl rounded-xl py-1.5 z-50">
                            <div className="px-4 py-2 border-b border-slate-800/85 mb-1.5">
                                <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
                                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">{user?.role}</p>
                            </div>
                            
                            <a href="#" className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-950/60 transition-colors">
                                <User className="w-4 h-4 text-slate-500" />
                                My Profile
                            </a>
                            <a href="#" className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-950/60 transition-colors">
                                <Settings className="w-4 h-4 text-slate-500" />
                                Admin Panel
                            </a>
                            <a href="#" className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-950/60 transition-colors">
                                <HelpCircle className="w-4 h-4 text-slate-500" />
                                Documentation
                            </a>
                            
                            <div className="border-t border-slate-800/85 my-1.5"></div>
                            
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/10 transition-colors text-left"
                            >
                                <LogOut className="w-4 h-4 text-red-400" />
                                Log Out
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
}
