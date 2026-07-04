import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, Eye, EyeOff, Terminal, Key } from 'lucide-react';

export default function Login() {
    const { login, loading } = useAuth();
    const navigate = useNavigate();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('login'); // login / help
    const [companyInfo, setCompanyInfo] = useState({
        name: 'System ERP',
        logo: ''
    });

    useEffect(() => {
        axios.get('/api/settings')
            .then(res => {
                setCompanyInfo({
                    name: res.data.company_name || 'System ERP',
                    logo: res.data.company_logo || ''
                });
            })
            .catch(err => {
                console.warn('Failed to load company info in login page', err);
            });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        const result = await login(email, password);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message || 'Login failed. Please check your credentials.');
        }
    };

    const handleQuickLogin = async (roleEmail) => {
        setEmail(roleEmail);
        setPassword('password');
        setError('');
        const result = await login(roleEmail, 'password');
        if (result.success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
            
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none"></div>

            <div className="w-full max-w-md z-10">
                {/* Logo / Header */}
                <div className="text-center mb-8">
                    {companyInfo.logo ? (
                        <div className="inline-flex items-center justify-center w-16 h-16 border border-slate-800 bg-slate-950/40 rounded-2xl overflow-hidden shadow-xl shadow-indigo-500/5 mb-4">
                            <img src={companyInfo.logo} alt="Company Logo" className="w-full h-full object-contain animate-fadeIn" />
                        </div>
                    ) : (
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xl shadow-indigo-500/20 mb-4 animate-pulse">
                            <Shield className="w-8 h-8" />
                        </div>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                        {companyInfo.name}
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        POS, Inventory & Accounting Suite
                    </p>
                </div>

                {/* Login Glassmorphic Card */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-800/85">
                        <button
                            onClick={() => setActiveTab('login')}
                            className={`flex-1 py-3.5 text-center text-sm font-medium transition-all ${
                                activeTab === 'login'
                                    ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/40'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setActiveTab('help')}
                            className={`flex-1 py-3.5 text-center text-sm font-medium transition-all ${
                                activeTab === 'help'
                                    ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/40'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            System Quick-Access
                        </button>
                    </div>

                    <div className="p-8">
                        {activeTab === 'login' ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Error Alert */}
                                {error && (
                                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 animate-shake">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5"></div>
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Email input */}
                                <div className="space-y-2">
                                    <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                                            <Mail className="w-4 h-4" />
                                        </span>
                                        <input
                                            id="email"
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@example.com"
                                            className="block w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-200 placeholder-slate-600 outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Password input */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            Password
                                        </label>
                                        <a href="#" className="text-xs text-indigo-400 hover:underline">
                                            Forgot password?
                                        </a>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                                            <Lock className="w-4 h-4" />
                                        </span>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="block w-full pl-10 pr-10 py-3 bg-slate-950/50 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-200 placeholder-slate-600 outline-none transition-all text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="relative w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white font-medium rounded-xl text-sm shadow-lg shadow-indigo-600/20 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Authenticating...
                                        </span>
                                    ) : (
                                        'Sign In to Dashboard'
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Use the quick-access profiles below to instantly log in with different system permissions.
                                </p>
                                
                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleQuickLogin('admin@pos-erp.test')}
                                        className="w-full flex items-center justify-between p-3.5 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-left transition-all group"
                                    >
                                        <div>
                                            <div className="text-sm font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                                                System Administrator
                                            </div>
                                            <div className="text-xs text-slate-500">admin@pos-erp.test (Full Access)</div>
                                        </div>
                                        <Key className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                    </button>

                                    <button
                                        onClick={() => handleQuickLogin('cashier@pos-erp.test')}
                                        className="w-full flex items-center justify-between p-3.5 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-left transition-all group"
                                    >
                                        <div>
                                            <div className="text-sm font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                                                Store Cashier
                                            </div>
                                            <div className="text-xs text-slate-500">cashier@pos-erp.test (POS & Drawer)</div>
                                        </div>
                                        <Key className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                    </button>

                                    <button
                                        onClick={() => handleQuickLogin('accountant@pos-erp.test')}
                                        className="w-full flex items-center justify-between p-3.5 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-left transition-all group"
                                    >
                                        <div>
                                            <div className="text-sm font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                                                Lead Accountant
                                            </div>
                                            <div className="text-xs text-slate-500">accountant@pos-erp.test (Ledgers & Reports)</div>
                                        </div>
                                        <Key className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                    </button>
                                </div>

                                <div className="p-3.5 bg-slate-950/30 rounded-xl border border-slate-900 flex items-start gap-2.5">
                                    <Terminal className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-slate-500 leading-relaxed">
                                        <strong className="text-slate-400">Simulation details:</strong> All profiles use default password: <code className="text-indigo-400 font-mono">password</code>. Inventory and ledgers are reactive based on selected roles.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer text */}
                <div className="text-center mt-8 text-xs text-slate-600">
                    &copy; 2026 ERP Systems. Protected by end-to-end encryption.
                </div>
            </div>
        </div>
    );
}
