import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Input, Textarea, Select } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
    DollarSign,
    Lock,
    Unlock,
    Plus,
    Minus,
    History,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    CheckCircle2,
    Calendar,
    FileText,
    User,
    GitBranch
} from 'lucide-react';

export default function CashDrawer() {
    const { activeBranch } = useAuth();
    
    // Core state
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
    
    // History tab state
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [branches, setBranches] = useState([]);

    // Fetch branches on mount
    useEffect(() => {
        axios.get('/api/branches')
            .then(res => {
                setBranches(res.data.filter(b => b.is_active));
            })
            .catch(err => {
                console.error("Failed to load branches:", err);
            });
    }, []);

    const activeBranchObj = branches.find(b => b.name === activeBranch);
    const activeBranchId = activeBranchObj ? activeBranchObj.id : null;
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    
    // Modals
    const [openingModalOpen, setOpeningModalOpen] = useState(false);
    const [cashInOutModalOpen, setCashInOutModalOpen] = useState(false);
    const [closingModalOpen, setClosingModalOpen] = useState(false);
    const [historyDetailModalOpen, setHistoryDetailModalOpen] = useState(false);
    
    // Summary / Closing Report state
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);

    // Form inputs
    const [openingBalance, setOpeningBalance] = useState('100.00');
    const [openingNotes, setOpeningNotes] = useState('');
    const [cashInOutType, setCashInOutType] = useState('cash_in'); // cash_in or cash_out
    const [cashInOutAmount, setCashInOutAmount] = useState('');
    const [cashInOutReason, setCashInOutReason] = useState('');
    const [actualClosingBalance, setActualClosingBalance] = useState('');
    const [closingNotes, setClosingNotes] = useState('');
    const [useDenominations, setUseDenominations] = useState(false);
    const [denominations, setDenominations] = useState({
        '100': '', '50': '', '20': '', '10': '', '5': '', '1': '',
        '0.25': '', '0.10': '', '0.05': '', '0.01': ''
    });

    // Error & loading status for operations
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // Fetch active session
    const fetchActiveSession = async () => {
        if (!activeBranchId) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/api/cash-drawer/current`, {
                params: { branch_id: activeBranchId }
            });
            // Map keys from backend schema to frontend expectation
            const mappedSession = response.data ? {
                ...response.data,
                opening_balance: response.data.opening_amount,
                expected_closing_balance: response.data.current_balance !== undefined ? response.data.current_balance : response.data.expected_amount
            } : null;
            setSession(mappedSession);
        } catch (err) {
            if (err.response?.status === 404) {
                setSession(null);
            } else {
                console.error('Failed to load active session:', err);
                setError('Failed to retrieve cash register status. Please try refreshing.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch history logs
    const fetchHistory = async (page = 1) => {
        if (!activeBranchId) return;
        setHistoryLoading(true);
        try {
            const response = await axios.get('/api/cash-drawer/sessions', {
                params: {
                    branch_id: activeBranchId,
                    status: 'closed',
                    page: page,
                    per_page: 10
                }
            });
            // Map values for the history logs table
            const mappedHistory = (response.data.data || []).map(s => ({
                ...s,
                opening_balance: s.opening_amount,
                expected_closing_balance: s.expected_amount,
                actual_closing_balance: s.closing_amount
            }));
            setHistoryData(mappedHistory);
            setCurrentPage(response.data.current_page);
            setTotalPages(response.data.last_page);
            setTotalRecords(response.data.total);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (activeBranchId) {
            fetchActiveSession();
            if (activeTab === 'history') {
                fetchHistory(1);
            }
        }
    }, [activeBranchId, activeTab]);

    // Calculate actual cash from denominations
    useEffect(() => {
        if (!useDenominations) return;
        
        let total = 0;
        Object.entries(denominations).forEach(([val, count]) => {
            if (count && !isNaN(count) && Number(count) > 0) {
                total += Number(val) * Number(count);
            }
        });
        
        setActualClosingBalance(total.toFixed(2));
    }, [denominations, useDenominations]);

    const handleDenominationChange = (val, count) => {
        setDenominations(prev => ({
            ...prev,
            [val]: count === '' ? '' : parseInt(count, 10) || 0
        }));
    };

    // Handle open register
    const handleOpenSession = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setError(null);

        if (!openingBalance || isNaN(openingBalance) || Number(openingBalance) < 0) {
            setFormErrors({ opening_balance: 'Please enter a valid positive opening balance.' });
            return;
        }

        setSubmitting(true);
        try {
            const response = await axios.post('/api/cash-drawer/open', {
                branch_id: activeBranchId,
                opening_amount: Number(openingBalance),
                notes: openingNotes
            });
            const mappedSession = response.data ? {
                ...response.data,
                opening_balance: response.data.opening_amount,
                expected_closing_balance: response.data.expected_amount
            } : null;
            setSession(mappedSession);
            setOpeningModalOpen(false);
            // Reset form
            setOpeningNotes('');
        } catch (err) {
            console.error('Failed to open register:', err);
            setError(err.response?.data?.message || 'Could not open cash register session.');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle close register
    const handleCloseSession = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setError(null);

        if (!actualClosingBalance || isNaN(actualClosingBalance) || Number(actualClosingBalance) < 0) {
            setFormErrors({ actual_closing_balance: 'Please enter a valid positive closing amount.' });
            return;
        }

        setSubmitting(true);
        try {
            await axios.post('/api/cash-drawer/close', {
                cash_drawer_session_id: session.id,
                closing_amount: Number(actualClosingBalance),
                notes: closingNotes
            });
            setSession(null);
            setClosingModalOpen(false);
            // Reset form
            setActualClosingBalance('');
            setClosingNotes('');
            setUseDenominations(false);
            setDenominations({
                '100': '', '50': '', '20': '', '10': '', '5': '', '1': '',
                '0.25': '', '0.10': '', '0.05': '', '0.01': ''
            });
            // Switch tab to history to see the closed register
            setActiveTab('history');
        } catch (err) {
            console.error('Failed to close register:', err);
            setError(err.response?.data?.message || 'Could not close cash register session.');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle manual Cash In / Cash Out adjustment
    const handleCashInOut = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setError(null);

        if (!cashInOutAmount || isNaN(cashInOutAmount) || Number(cashInOutAmount) <= 0) {
            setFormErrors({ amount: 'Please enter a valid transaction amount greater than 0.' });
            return;
        }

        if (!cashInOutReason.trim()) {
            setFormErrors({ description: 'Description/reason is required.' });
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(`/api/cash-drawer/${cashInOutType === 'cash_in' ? 'cash-in' : 'cash-out'}`, {
                cash_drawer_session_id: session.id,
                amount: Number(cashInOutAmount),
                notes: cashInOutReason
            });
            await fetchActiveSession();
            setCashInOutModalOpen(false);
            // Reset form
            setCashInOutAmount('');
            setCashInOutReason('');
        } catch (err) {
            console.error('Failed to adjust cash:', err);
            setError(err.response?.data?.message || 'Could not register manual cash adjustment.');
        } finally {
            setSubmitting(false);
        }
    };

    // Fetch aggregated shift summary and payment breakdown
    const fetchSessionSummary = async (sessionId) => {
        setSummaryLoading(true);
        setSummaryOpen(true);
        try {
            const response = await axios.get(`/api/cash-drawer/sessions/${sessionId}/cashier-report`);
            const data = response.data;
            
            // Format to what the UI expects:
            const formattedData = {
                session: {
                    id: data.session_id,
                    status: data.status,
                    opened_at: data.opened_at,
                    closed_at: data.closed_at,
                    notes: data.notes || '',
                    user: { name: data.cashier?.name || 'Cashier' },
                    branch: { name: data.branch?.name || 'Branch' }
                },
                summary: {
                    sales_count: data.transactions.filter(t => t.type === 'sale').length,
                    sales_total: data.total_sales,
                    tax_total: 0.00,
                    discount_total: 0.00,
                    payment_methods: [
                        { payment_method: 'Cash', count: data.transactions.filter(t => t.type === 'sale').length, total: data.total_sales }
                    ],
                    cash_flow: {
                        opening_balance: data.opening_amount,
                        cash_in: data.total_cash_in,
                        cash_out: data.total_cash_out,
                        pos_cash_sales: data.total_sales,
                        expected: data.expected_amount,
                        actual: data.closing_amount,
                        difference: data.difference
                    }
                }
            };
            
            setSummaryData(formattedData);
        } catch (err) {
            console.error('Failed to fetch session summary:', err);
        } finally {
            setSummaryLoading(false);
        }
    };

    const printReport = () => {
        window.print();
    };

    // Formatted date string utility
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    // Compute active session metrics
    const getActiveMetrics = () => {
        if (!session || !session.transactions) {
            return { sales: 0, cashIn: 0, cashOut: 0, expected: 0 };
        }
        
        const sales = session.transactions
            .filter(t => t.type === 'sale')
            .reduce((sum, t) => sum + Number(t.amount), 0);
            
        const cashIn = session.transactions
            .filter(t => t.type === 'cash_in')
            .reduce((sum, t) => sum + Number(t.amount), 0);
            
        const cashOut = session.transactions
            .filter(t => t.type === 'cash_out')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expected = Number(session.opening_balance) + sales + cashIn - cashOut;
        
        return { sales, cashIn, cashOut, expected };
    };

    const metrics = getActiveMetrics();

    // Table columns for active session transactions
    const transactionColumns = [
        {
            header: 'Date & Time',
            key: 'created_at',
            render: (val) => formatDate(val)
        },
        {
            header: 'Type',
            key: 'type',
            render: (val) => {
                const badgeStyles = {
                    sale: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                    refund: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                    cash_in: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
                    cash_out: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                };
                const labels = {
                    sale: 'POS Cash Sale',
                    refund: 'Refund',
                    cash_in: 'Cash In',
                    cash_out: 'Cash Out'
                };
                return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeStyles[val] || 'bg-slate-800 text-slate-400'}`}>
                        {labels[val] || val}
                    </span>
                );
            }
        },
        {
            header: 'Description',
            key: 'description'
        },
        {
            header: 'Amount',
            key: 'amount',
            className: 'text-right',
            render: (val, row) => {
                const isNegative = row.type === 'cash_out' || row.type === 'refund';
                const formatted = Number(val).toFixed(2);
                return (
                    <span className={`font-mono text-xs font-bold ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isNegative ? '-' : '+'}${formatted}
                    </span>
                );
            }
        }
    ];

    // Table columns for historical closed sessions
    const historyColumns = [
        {
            header: 'Opened At',
            key: 'opened_at',
            render: (val) => formatDate(val)
        },
        {
            header: 'Closed At',
            key: 'closed_at',
            render: (val) => formatDate(val)
        },
        {
            header: 'Cashier',
            key: 'user',
            render: (user) => (
                <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{user?.name || 'Unknown User'}</span>
                </div>
            )
        },
        {
            header: 'Opening Cash',
            key: 'opening_balance',
            render: (val) => <span className="font-mono">${Number(val).toFixed(2)}</span>
        },
        {
            header: 'Expected Cash',
            key: 'expected_closing_balance',
            render: (val) => <span className="font-mono">${Number(val).toFixed(2)}</span>
        },
        {
            header: 'Actual Cash',
            key: 'actual_closing_balance',
            render: (val) => <span className="font-mono">${val ? Number(val).toFixed(2) : '-'}</span>
        },
        {
            header: 'Shortage / Surplus',
            key: 'difference',
            render: (val) => {
                const numVal = Number(val || 0);
                if (numVal === 0) {
                    return <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">Balanced</span>;
                } else if (numVal > 0) {
                    return <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 font-mono text-[10px] font-bold">Surplus (+${numVal.toFixed(2)})</span>;
                } else {
                    return <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-450 font-mono text-[10px] font-bold">Shortage (-${Math.abs(numVal).toFixed(2)})</span>;
                }
            }
        },
        {
            header: 'Actions',
            key: 'actions',
            className: 'text-right',
            render: (_, row) => (
                <Button size="sm" variant="secondary" onClick={() => fetchSessionSummary(row.id)}>
                    Inspect Logs
                </Button>
            )
        }
    ];

    // Compute expected closing value during input
    const getClosingDiff = () => {
        const actual = Number(actualClosingBalance || 0);
        const expected = metrics.expected;
        return actual - expected;
    };

    return (
        <PageWrapper
            title="Cash Drawer Sessions"
            subtitle="Manage cashier registers, verify end-of-day balances, and log cash inflows/outflows."
            breadcrumbs={[{ label: "Accounting" }, { label: "Cash Drawer" }]}
        >
            {/* Top Navigation Tabs */}
            <div className="flex border-b border-slate-800/80 mb-6 gap-6">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative ${
                        activeTab === 'active' 
                            ? 'text-indigo-400 border-b-2 border-indigo-500' 
                            : 'text-slate-500 hover:text-slate-350'
                    }`}
                >
                    Active Register
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative ${
                        activeTab === 'history' 
                            ? 'text-indigo-400 border-b-2 border-indigo-500' 
                            : 'text-slate-500 hover:text-slate-350'
                    }`}
                >
                    Session History
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Skeleton className="h-28 rounded-2xl" />
                        <Skeleton className="h-28 rounded-2xl" />
                        <Skeleton className="h-28 rounded-2xl" />
                        <Skeleton className="h-28 rounded-2xl" />
                    </div>
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
            ) : activeTab === 'active' ? (
                // ACTIVE REGISTER TAB
                !session ? (
                    // CLOSED REGISTER / OPEN REGISTER FORM
                    <div className="max-w-xl mx-auto my-12 backdrop-blur-xl bg-slate-900/40 border border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-6">
                        <div className="inline-flex items-center justify-center p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-450 animate-pulse">
                            <Lock className="w-8 h-8" />
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-base font-bold text-slate-200">Register is Closed</h3>
                            <p className="text-slate-450 text-xs leading-relaxed max-w-sm mx-auto">
                                There is currently no active cash drawer session for the cashier user at <span className="text-indigo-400 font-bold">{activeBranch}</span>. Set the starting till balance to open the drawer.
                            </p>
                        </div>

                        <div className="border-t border-slate-850 pt-6">
                            <form onSubmit={handleOpenSession} className="space-y-4 text-left">
                                <Input
                                    id="opening-balance"
                                    label="Starting Till Cash ($)"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={openingBalance}
                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                    error={formErrors.opening_balance}
                                    icon={DollarSign}
                                    required
                                />

                                <Textarea
                                    id="opening-notes"
                                    label="Opening Session Notes"
                                    placeholder="Enter drawer details, cashier shift info, etc. (optional)"
                                    value={openingNotes}
                                    onChange={(e) => setOpeningNotes(e.target.value)}
                                />

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-400 font-semibold">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <Button 
                                    type="submit" 
                                    className="w-full" 
                                    loading={submitting} 
                                    icon={Unlock}
                                >
                                    Open Register Session
                                </Button>
                            </form>
                        </div>
                    </div>
                ) : (
                    // ACTIVE REGISTER VIEW
                    <div className="space-y-6">
                        {/* Upper Stat Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Card 1: Opening Till */}
                            <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                                <div className="absolute right-4 top-4 p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opening Till Cash</span>
                                <h3 className="text-xl font-bold text-slate-200 mt-2 font-mono">${Number(session.opening_balance).toFixed(2)}</h3>
                                <span className="block text-[10px] text-slate-500 mt-1">Opened: {formatDate(session.opened_at)}</span>
                            </div>

                            {/* Card 2: Cash Sales */}
                            <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                                <div className="absolute right-4 top-4 p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">POS Cash Sales</span>
                                <h3 className="text-xl font-bold text-slate-200 mt-2 font-mono">${metrics.sales.toFixed(2)}</h3>
                                <span className="block text-[10px] text-slate-500 mt-1">From POS sales receipts</span>
                            </div>

                            {/* Card 3: Inflow/Outflow Adjustments */}
                            <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                                <div className="absolute right-4 top-4 p-2 rounded-xl bg-amber-500/10 text-amber-400">
                                    <TrendingDown className="w-4 h-4" />
                                </div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Till Adjustments</span>
                                <h3 className="text-xl font-bold text-slate-200 mt-2 font-mono">
                                    +${metrics.cashIn.toFixed(2)} / -${metrics.cashOut.toFixed(2)}
                                </h3>
                                <span className="block text-[10px] text-slate-500 mt-1">Manual Cash In & Cash Out</span>
                            </div>

                            {/* Card 4: Expected Total */}
                            <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-950/20 to-violet-950/20 border border-indigo-850/50 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                                <div className="absolute right-4 top-4 p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Expected Cash in Drawer</span>
                                <h3 className="text-xl font-bold text-indigo-200 mt-2 font-mono">${metrics.expected.toFixed(2)}</h3>
                                <span className="block text-[10px] text-indigo-400/60 mt-1">Current calculated balance</span>
                            </div>
                        </div>

                        {/* Control Bar & Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/25 border border-slate-800/65 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                                    <GitBranch className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-200">Register Location: {activeBranch}</h4>
                                    <p className="text-[10px] text-slate-500">Cashier Session Managed by: {session.user?.name}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Plus}
                                    onClick={() => {
                                        setCashInOutType('cash_in');
                                        setCashInOutModalOpen(true);
                                    }}
                                    className="flex-1 sm:flex-none text-emerald-450 border-emerald-950 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                                >
                                    Cash In
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Minus}
                                    onClick={() => {
                                        setCashInOutType('cash_out');
                                        setCashInOutModalOpen(true);
                                    }}
                                    className="flex-1 sm:flex-none text-rose-450 border-rose-950 hover:border-rose-500/50 hover:bg-rose-500/5"
                                >
                                    Cash Out
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={FileText}
                                    onClick={() => fetchSessionSummary(session.id)}
                                    className="flex-1 sm:flex-none"
                                >
                                    Shift Report
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    icon={Lock}
                                    onClick={() => setClosingModalOpen(true)}
                                    className="flex-1 sm:flex-none"
                                >
                                    Close Till Register
                                </Button>
                            </div>
                        </div>

                        {/* Session Transactions History */}
                        <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Register Transactions</h3>
                                <span className="text-[10px] text-slate-500 font-semibold">{session.transactions?.length || 0} entries this shift</span>
                            </div>

                            <Table
                                columns={transactionColumns}
                                data={session.transactions || []}
                                emptyMessage="No transactions completed in this register session."
                                minWidth="700px"
                            />
                        </div>
                    </div>
                )
            ) : (
                // HISTORICAL SESSIONS TAB
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Closed Register Sessions</h3>
                        <span className="text-[10px] text-slate-500 font-semibold">{totalRecords} past logs</span>
                    </div>

                    <Table
                        columns={historyColumns}
                        data={historyData}
                        isLoading={historyLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalRecords={totalRecords}
                        onPageChange={(page) => fetchHistory(page)}
                        emptyMessage="No closed register sessions found for this branch."
                        minWidth="900px"
                    />
                </div>
            )}

            {/* MODALS */}
            
            {/* Modal: Cash In / Cash Out */}
            <Modal
                isOpen={cashInOutModalOpen}
                onClose={() => setCashInOutModalOpen(false)}
                title={cashInOutType === 'cash_in' ? 'Register Cash Deposit (Cash In)' : 'Register Cash Withdrawal (Cash Out)'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setCashInOutModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant={cashInOutType === 'cash_in' ? 'success' : 'danger'} 
                            onClick={handleCashInOut} 
                            loading={submitting}
                        >
                            {cashInOutType === 'cash_in' ? 'Deposit Cash' : 'Withdraw Cash'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCashInOut} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Transaction Type
                        </label>
                        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-850">
                            <button
                                type="button"
                                onClick={() => setCashInOutType('cash_in')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    cashInOutType === 'cash_in'
                                        ? 'bg-emerald-600/90 text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-350'
                                }`}
                            >
                                Cash In (Deposit)
                            </button>
                            <button
                                type="button"
                                onClick={() => setCashInOutType('cash_out')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    cashInOutType === 'cash_out'
                                        ? 'bg-rose-600/90 text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-350'
                                }`}
                            >
                                Cash Out (Withdrawal)
                            </button>
                        </div>
                    </div>

                    <Input
                        id="cash-amount"
                        label="Amount ($)"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={cashInOutAmount}
                        onChange={(e) => setCashInOutAmount(e.target.value)}
                        error={formErrors.amount}
                        icon={DollarSign}
                        required
                    />

                    <Input
                        id="cash-reason"
                        label="Reason / Description"
                        placeholder="e.g., Adding $20 bills for change, Paying vendor, Petty cash deposit"
                        value={cashInOutReason}
                        onChange={(e) => setCashInOutReason(e.target.value)}
                        error={formErrors.description}
                        required
                    />

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold flex gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </form>
            </Modal>

            {/* Modal: Close Till Register */}
            <Modal
                isOpen={closingModalOpen}
                onClose={() => setClosingModalOpen(false)}
                title="Close Till & Finalize Register Session"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setClosingModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="danger" 
                            onClick={handleCloseSession} 
                            loading={submitting}
                            icon={Lock}
                        >
                            Finalize Session Closure
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCloseSession} className="space-y-4">
                    <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Opening Till Balance:</span>
                            <span className="font-mono text-slate-200 font-bold">${Number(session?.opening_balance).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 border-t border-slate-850 pt-2">
                            <span>Expected Cash in Drawer:</span>
                            <span className="font-mono text-indigo-400 font-extrabold">${metrics.expected.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-1.5 w-full">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Actual Cash in Till Drawer ($)
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setUseDenominations(!useDenominations);
                                    if (!useDenominations) {
                                        // Reset denominations
                                        setDenominations({
                                            '100': '', '50': '', '20': '', '10': '', '5': '', '1': '',
                                            '0.25': '', '0.10': '', '0.05': '', '0.01': ''
                                        });
                                    }
                                }}
                                className="text-[10px] text-indigo-400 hover:text-indigo-350 font-bold uppercase tracking-wider underline cursor-pointer"
                            >
                                {useDenominations ? 'Input cash directly' : 'Count denominations'}
                            </button>
                        </div>
                        <Input
                            id="actual-closing"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={actualClosingBalance}
                            onChange={(e) => setActualClosingBalance(e.target.value)}
                            error={formErrors.actual_closing_balance}
                            icon={DollarSign}
                            readOnly={useDenominations}
                            required
                            helperText={useDenominations ? "Calculated from denomination counter below." : "Count all cash inside the register drawer and enter the total."}
                        />
                    </div>

                    {useDenominations && (
                        <div className="p-4 bg-slate-950/30 border border-slate-800/80 rounded-2xl space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800/20 pb-2">Denomination Counter</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {/* Bills Column */}
                                <div className="space-y-3">
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Bills</span>
                                    {[100, 50, 20, 10, 5, 1].map((bill) => (
                                        <div key={bill} className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-mono text-slate-450 w-12">${bill} x</span>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={denominations[bill.toString()]}
                                                onChange={(e) => handleDenominationChange(bill.toString(), e.target.value)}
                                                className="w-16 py-1 px-2 text-right bg-slate-950/60 border border-slate-800 rounded-lg text-[10px] text-slate-200 outline-none focus:border-indigo-500/80 font-mono font-bold"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Coins Column */}
                                <div className="space-y-3">
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Coins</span>
                                    {[0.25, 0.10, 0.05, 0.01].map((coin) => (
                                        <div key={coin} className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-mono text-slate-450 w-12">${coin.toFixed(2)} x</span>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={denominations[coin.toString()]}
                                                onChange={(e) => handleDenominationChange(coin.toString(), e.target.value)}
                                                className="w-16 py-1 px-2 text-right bg-slate-950/60 border border-slate-800 rounded-lg text-[10px] text-slate-200 outline-none focus:border-indigo-500/80 font-mono font-bold"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {actualClosingBalance !== '' && !isNaN(actualClosingBalance) && (
                        <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-450">Shortage / Surplus:</span>
                            {getClosingDiff() === 0 ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" /> Balanced
                                </span>
                            ) : getClosingDiff() > 0 ? (
                                <span className="text-teal-400 font-bold font-mono">
                                    Surplus (+${getClosingDiff().toFixed(2)})
                                </span>
                            ) : (
                                <span className="text-rose-400 font-bold font-mono">
                                    Shortage (-${Math.abs(getClosingDiff()).toFixed(2)})
                                </span>
                            )}
                        </div>
                    )}

                    <Textarea
                        id="closing-notes"
                        label="Closing Notes / Discrepancy explanation"
                        placeholder="Explain any difference in cash, register problems, or leave shift summaries here..."
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                    />

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold flex gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </form>
            </Modal>

            {/* Modal: Daily Closing Z-Report Summary */}
            <Modal
                isOpen={summaryOpen}
                onClose={() => setSummaryOpen(false)}
                title={summaryData?.session?.status === 'open' ? 'Current Shift Z-Report (Preview)' : 'Daily Register Closing Z-Report'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setSummaryOpen(false)}>
                            Close Report
                        </Button>
                        <Button 
                            variant="primary" 
                            icon={FileText} 
                            onClick={printReport}
                            disabled={summaryLoading || !summaryData}
                        >
                            Print Z-Report
                        </Button>
                    </>
                }
            >
                {summaryLoading ? (
                    <div className="space-y-6 py-4">
                        <Skeleton className="h-10 rounded-xl w-3/4 mx-auto animate-pulse" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Skeleton className="h-16 rounded-xl animate-pulse" />
                            <Skeleton className="h-16 rounded-xl animate-pulse" />
                            <Skeleton className="h-16 rounded-xl animate-pulse" />
                            <Skeleton className="h-16 rounded-xl animate-pulse" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Skeleton className="h-44 rounded-xl animate-pulse" />
                            <Skeleton className="h-44 rounded-xl animate-pulse" />
                        </div>
                    </div>
                ) : summaryData ? (
                    <div className="space-y-6 text-slate-300 select-text" id="z-report-print-area">
                        <style>{`
                            @media print {
                                body * {
                                    visibility: hidden;
                                }
                                #z-report-print-area, #z-report-print-area * {
                                    visibility: visible;
                                }
                                #z-report-print-area {
                                    position: absolute;
                                    left: 0;
                                    top: 0;
                                    width: 100%;
                                    background: white !important;
                                    color: black !important;
                                    padding: 24px !important;
                                    font-size: 11px !important;
                                }
                                #z-report-print-area button, #z-report-print-area .no-print {
                                    display: none !important;
                                }
                                .print-border {
                                    border: 1px solid #000 !important;
                                }
                                .print-text-dark {
                                    color: #000 !important;
                                }
                                .print-bg-light {
                                    background-color: #f3f4f6 !important;
                                }
                            }
                        `}</style>

                        {/* Report Header */}
                        <div className="text-center space-y-1.5 border-b border-slate-800/80 pb-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-100 print-text-dark">
                                {summaryData.session.branch?.name || 'Main Branch'}
                            </h3>
                            <h2 className="text-base font-extrabold text-indigo-400 print-text-dark">
                                Daily Register Closing Report (Z-Report)
                            </h2>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-4 flex-wrap">
                                <span>Session ID: #{summaryData.session.id}</span>
                                <span>•</span>
                                <span>Register Status: {summaryData.session.status.toUpperCase()}</span>
                                <span>•</span>
                                <span>Cashier: {summaryData.session.user?.name}</span>
                            </div>
                        </div>

                        {/* Time Range Banner */}
                        <div className="grid grid-cols-2 gap-4 p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-[10px] font-semibold print-bg-light print-text-dark">
                            <div>
                                <span className="block text-slate-500 uppercase text-[8px] tracking-wider">Opened Shift</span>
                                <span className="font-mono text-slate-350">{formatDate(summaryData.session.opened_at)}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 uppercase text-[8px] tracking-wider">Closed Shift</span>
                                <span className="font-mono text-slate-350">
                                    {summaryData.session.status === 'open' ? 'Active Session (Open)' : formatDate(summaryData.session.closed_at)}
                                </span>
                            </div>
                        </div>

                        {/* Core Balance Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-center print-border print-text-dark">
                                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Opening Till</span>
                                <span className="block text-sm font-bold text-slate-200 mt-1 font-mono">${Number(summaryData.summary.cash_flow.opening_balance).toFixed(2)}</span>
                            </div>
                            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-center print-border print-text-dark">
                                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Expected Till</span>
                                <span className="block text-sm font-bold text-indigo-400 mt-1 font-mono">${Number(summaryData.summary.cash_flow.expected).toFixed(2)}</span>
                            </div>
                            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-center print-border print-text-dark">
                                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Actual Counted</span>
                                <span className="block text-sm font-bold text-slate-200 mt-1 font-mono">
                                    {summaryData.summary.cash_flow.actual !== null 
                                        ? `$${Number(summaryData.summary.cash_flow.actual).toFixed(2)}` 
                                        : 'Open'}
                                </span>
                            </div>
                            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-center print-border print-text-dark">
                                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Shortage / Surplus</span>
                                <span className="block mt-1">
                                    {summaryData.summary.cash_flow.difference === null ? (
                                        <span className="text-xs text-slate-550 font-bold">Shift Open</span>
                                    ) : Number(summaryData.summary.cash_flow.difference) === 0 ? (
                                        <span className="text-xs font-bold text-emerald-400 font-mono">Balanced</span>
                                    ) : Number(summaryData.summary.cash_flow.difference) > 0 ? (
                                        <span className="text-xs font-bold text-teal-400 font-mono">Surplus (+${Number(summaryData.summary.cash_flow.difference).toFixed(2)})</span>
                                    ) : (
                                        <span className="text-xs font-bold text-rose-400 font-mono">Shortage (-${Math.abs(Number(summaryData.summary.cash_flow.difference)).toFixed(2)})</span>
                                    )}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left: Payment Method Summary */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1 print-text-dark">
                                    Sales Breakdown
                                </h4>
                                
                                <div className="overflow-hidden border border-slate-800/80 rounded-xl bg-slate-950/20 print-border">
                                    <table className="w-full text-left text-[11px] font-semibold print-text-dark">
                                        <thead>
                                            <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-450 print-bg-light">
                                                <th className="py-2 px-3">Method</th>
                                                <th className="py-2 px-3 text-center">Txns</th>
                                                <th className="py-2 px-3 text-right">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-850 text-slate-350">
                                            {summaryData.summary.payment_methods.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className="py-4 text-center text-slate-500">No sales transactions logged.</td>
                                                </tr>
                                            ) : (
                                                summaryData.summary.payment_methods.map((method, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-950/10">
                                                        <td className="py-2.5 px-3 uppercase text-[10px]">{method.payment_method}</td>
                                                        <td className="py-2.5 px-3 text-center font-mono">{method.count}</td>
                                                        <td className="py-2.5 px-3 text-right font-mono">${Number(method.total).toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-3 bg-slate-950/30 border border-slate-850 rounded-xl space-y-1.5 text-xs print-bg-light print-text-dark">
                                    <div className="flex justify-between">
                                        <span className="text-slate-450">Gross Sales Subtotal:</span>
                                        <span className="font-mono text-slate-300 font-bold">${Number(summaryData.summary.sales_total).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-450">Total Discounts Given:</span>
                                        <span className="font-mono text-rose-400">-${Number(summaryData.summary.discount_total).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-450">Total Taxes Collected:</span>
                                        <span className="font-mono text-slate-350">${Number(summaryData.summary.tax_total).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-850/80 pt-1.5 font-bold text-slate-200">
                                        <span>Net Sales Total:</span>
                                        <span className="font-mono">${Number(summaryData.summary.sales_total).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Cash Drawer reconciliation */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1 print-text-dark">
                                    Cash Drawer Audit
                                </h4>

                                <div className="p-3.5 bg-slate-950/20 border border-slate-850 rounded-xl space-y-2.5 text-xs print-bg-light print-text-dark">
                                    <div className="flex justify-between">
                                        <span className="text-slate-450">Starting Cash (Opening):</span>
                                        <span className="font-mono font-bold text-slate-300">+${Number(summaryData.summary.cash_flow.opening_balance).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-450">POS Till Cash Sales:</span>
                                        <span className="font-mono font-bold text-emerald-400">+${Number(summaryData.summary.cash_flow.pos_cash_sales).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-450">Manual Adjustments (In):</span>
                                        <span className="font-mono font-bold text-indigo-400">+${Number(summaryData.summary.cash_flow.cash_in).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-450">Manual Adjustments (Out):</span>
                                        <span className="font-mono font-bold text-rose-450">-${Number(summaryData.summary.cash_flow.cash_out).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-850/85 pt-2 font-bold text-slate-200">
                                        <span>Expected Cash Total:</span>
                                        <span className="font-mono text-indigo-350">${Number(summaryData.summary.cash_flow.expected).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-850/40 pt-1.5 font-bold text-slate-200">
                                        <span>Actual Counted Cash:</span>
                                        <span className="font-mono text-slate-200">
                                            {summaryData.summary.cash_flow.actual !== null 
                                                ? `$${Number(summaryData.summary.cash_flow.actual).toFixed(2)}` 
                                                : 'Session Open'}
                                        </span>
                                    </div>
                                    {summaryData.summary.cash_flow.difference !== null && (
                                        <div className="flex justify-between border-t border-dashed border-slate-850 pt-1.5 font-bold">
                                            <span className="text-slate-450">Shortage / Surplus:</span>
                                            {Number(summaryData.summary.cash_flow.difference) === 0 ? (
                                                <span className="text-emerald-400 font-mono">Balanced</span>
                                            ) : Number(summaryData.summary.cash_flow.difference) > 0 ? (
                                                <span className="text-teal-400 font-mono">Surplus (+${Number(summaryData.summary.cash_flow.difference).toFixed(2)})</span>
                                            ) : (
                                                <span className="text-rose-400 font-mono">Shortage (-${Math.abs(Number(summaryData.summary.cash_flow.difference)).toFixed(2)})</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Audit notes and audit history logs */}
                        {summaryData.session.notes && (
                            <div className="p-3.5 bg-slate-900/35 border border-slate-850 rounded-xl space-y-1.5 print-border print-text-dark">
                                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                    Shift Notes & Audit Details
                                </span>
                                <p className="text-[11px] text-slate-450 font-medium whitespace-pre-line leading-relaxed">
                                    {summaryData.session.notes}
                                </p>
                            </div>
                        )}

                        {/* Z-Report print verification signature lines */}
                        <div className="hidden print-only pt-12 mt-12 border-t border-dashed border-black grid grid-cols-2 gap-12 text-black font-semibold text-[11px]">
                            <div className="space-y-1">
                                <p>Cashier Signature: _________________________</p>
                                <p className="text-[9px] text-slate-650 font-medium">Date: __________________</p>
                            </div>
                            <div className="space-y-1">
                                <p>Manager Signature: _________________________</p>
                                <p className="text-[9px] text-slate-650 font-medium">Date: __________________</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 text-xs font-semibold text-slate-400">Failed to load register closing summary report.</div>
                )}
            </Modal>
        </PageWrapper>
    );
}
