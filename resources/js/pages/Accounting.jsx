import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import Table from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { Select, Input } from '../components/FormControls';
import {
    DollarSign, TrendingUp, TrendingDown, RefreshCw,
    ArrowUpRight, ArrowDownRight, Activity, Calendar, GitBranch,
    FileText, User, ShoppingBag, Percent, BookOpen, Scale, ListChecks
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Accounting() {
    // States
    const [metrics, setMetrics] = useState({
        gross_sales: 0,
        refunds: 0,
        net_sales: 0,
        cogs: 0,
        gross_profit: 0,
        inventory_purchases: 0,
        net_profit: 0
    });
    const [trend, setTrend] = useState([]);
    const [branchBreakdown, setBranchBreakdown] = useState([]);
    const [ledger, setLedger] = useState([]);
    
    // Config states
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Interactive SVG trend chart state
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const [ledgerFilter, setLedgerFilter] = useState('all'); // 'all', 'POS Sale', 'POS Refund', 'Supplier Purchase'

    // Fetch dashboard stats
    const fetchAccountingData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/accounting/dashboard', {
                params: {
                    branch_id: selectedBranch,
                    date_from: dateFrom,
                    date_to: dateTo
                }
            });
            setMetrics(response.data.metrics);
            setTrend(response.data.trend || []);
            setBranchBreakdown(response.data.branch_breakdown || []);
            setLedger(response.data.ledger || []);
        } catch (err) {
            console.error("Failed to load accounting details:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Load branches
    useEffect(() => {
        axios.get('/api/branches')
            .then(res => {
                setBranches(res.data.filter(b => b.is_active));
            })
            .catch(err => {
                console.error("Failed to load branches:", err);
            });
    }, []);

    // Load metrics on change
    useEffect(() => {
        fetchAccountingData();
    }, [selectedBranch, dateFrom, dateTo]);

    const handleSync = async () => {
        setIsSyncing(true);
        await fetchAccountingData();
        setTimeout(() => setIsSyncing(false), 500);
    };

    // Table columns for branch distribution
    const branchColumns = [
        {
            header: 'Branch Location',
            accessor: 'branch_name',
            render: (name) => (
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <GitBranch className="w-4 h-4 text-indigo-400" />
                    <span>{name}</span>
                </div>
            )
        },
        {
            header: 'Net Revenue',
            accessor: 'revenue',
            render: (val) => (
                <span className="font-mono text-slate-100 font-bold">
                    ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            )
        },
        {
            header: 'Supplies Expense',
            accessor: 'purchases',
            render: (val) => (
                <span className="font-mono text-rose-400 font-semibold">
                    -${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            )
        },
        {
            header: 'Net Performance',
            accessor: 'net',
            render: (val) => (
                <span className={`font-mono font-bold ${Number(val) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {Number(val) >= 0 ? '+' : ''}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            )
        }
    ];

    // Table columns for recent ledger feed
    const ledgerColumns = [
        {
            header: 'Date & Time',
            accessor: 'date',
            render: (dateStr) => {
                const d = new Date(dateStr);
                return (
                    <div className="text-slate-350 text-xs">
                        <span className="block font-bold">{d.toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-500">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                );
            }
        },
        {
            header: 'Type',
            accessor: 'type',
            render: (type) => {
                let badgeClass = "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";
                if (type === 'POS Refund') badgeClass = "bg-rose-500/10 border-rose-500/20 text-rose-400";
                if (type === 'Supplier Purchase') badgeClass = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                
                return (
                    <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${badgeClass}`}>
                        {type}
                    </span>
                );
            }
        },
        {
            header: 'Ref Code',
            accessor: 'ref',
            render: (ref, row) => {
                // Link to receipt, refund's accounting entry, or order details if available
                if (row.type === 'POS Sale' || row.type === 'POS Refund') {
                    return (
                        <span
                            className="font-mono text-indigo-400 font-bold hover:underline cursor-pointer"
                            title={row.type === 'POS Refund' ? 'View refund accounting entry' : undefined}
                        >
                            {ref}
                        </span>
                    );
                }
                return <span className="font-mono text-slate-300">{ref}</span>;
            }
        },
        {
            header: 'Location / Cashier',
            accessor: 'branch',
            render: (branch, row) => (
                <div>
                    <span className="block font-semibold text-slate-200 text-xs">{branch}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {row.operator}
                    </span>
                </div>
            )
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (val) => {
                const isPositive = val >= 0;
                return (
                    <span className={`font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                );
            }
        }
    ];

    // Compute margin percentage
    const profitMargin = metrics.net_sales > 0 
        ? ((metrics.gross_profit / metrics.net_sales) * 100).toFixed(1)
        : '0.0';

    // SVG Graph drawing details
    const renderTrendChart = () => {
        if (trend.length === 0) return null;
        
        const width = 600;
        const height = 180;
        const padding = 20;
        
        const maxVal = Math.max(...trend.map(t => Math.max(t.sales, t.expenses, 100))) * 1.1;
        
        const getX = (idx) => padding + (idx / (trend.length - 1)) * (width - padding * 2);
        const getY = (val) => height - padding - (val / maxVal) * (height - padding * 2);
        
        // Build path strings
        let salesPath = "";
        let expensesPath = "";
        
        trend.forEach((point, idx) => {
            const x = getX(idx);
            const ySales = getY(point.sales);
            const yExp = getY(point.expenses);
            
            if (idx === 0) {
                salesPath = `M ${x} ${ySales}`;
                expensesPath = `M ${x} ${yExp}`;
            } else {
                salesPath += ` L ${x} ${ySales}`;
                expensesPath += ` L ${x} ${yExp}`;
            }
        });
        
        return (
            <div className="relative">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = padding + ratio * (height - padding * 2);
                        return (
                            <line 
                                key={i} 
                                x1={padding} 
                                y1={y} 
                                x2={width - padding} 
                                y2={y} 
                                stroke="#1e293b" 
                                strokeWidth="0.7" 
                                strokeDasharray="3,3" 
                            />
                        );
                    })}
                    
                    {/* Sales Area & Line (Indigo) */}
                    <path 
                        d={salesPath} 
                        fill="none" 
                        stroke="#6366f1" 
                        strokeWidth="2" 
                        className="transition-all duration-300"
                    />
                    
                    {/* Expenses Line (Rose) */}
                    <path 
                        d={expensesPath} 
                        fill="none" 
                        stroke="#f43f5e" 
                        strokeWidth="2" 
                        className="transition-all duration-300"
                    />
                    
                    {/* Data Nodes */}
                    {trend.map((point, idx) => {
                        const x = getX(idx);
                        const ySales = getY(point.sales);
                        const yExp = getY(point.expenses);
                        
                        return (
                            <g key={idx}>
                                {/* Invisible vertical trigger line for tooltip hover */}
                                <line
                                    x1={x}
                                    y1={padding}
                                    x2={x}
                                    y2={height - padding}
                                    stroke="transparent"
                                    strokeWidth={width / trend.length}
                                    onMouseEnter={() => setHoveredPoint({ ...point, x, ySales, yExp })}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                    className="cursor-crosshair"
                                />
                                
                                {/* Active dot indicator */}
                                {hoveredPoint?.date === point.date && (
                                    <>
                                        <circle cx={x} cy={ySales} r="4" fill="#6366f1" />
                                        <circle cx={x} cy={yExp} r="4" fill="#f43f5e" />
                                    </>
                                )}
                            </g>
                        );
                    })}
                </svg>
                
                {/* SVG Tooltip Overlay */}
                {hoveredPoint && (
                    <div 
                        className="absolute bg-slate-950/95 border border-slate-800 p-2.5 rounded-xl shadow-2xl z-30 text-[10px] pointer-events-none transition-all"
                        style={{
                            left: `${(hoveredPoint.x / width) * 100}%`,
                            top: `${(hoveredPoint.ySales / height) * 100 - 45}%`,
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <p className="font-bold text-slate-300 mb-1">{new Date(hoveredPoint.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                        <div className="space-y-0.5">
                            <span className="flex items-center gap-1.5 text-indigo-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Sales: ${hoveredPoint.sales.toFixed(2)}
                            </span>
                            <span className="flex items-center gap-1.5 text-rose-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Expenses: ${hoveredPoint.expenses.toFixed(2)}
                            </span>
                            <span className={`flex items-center gap-1.5 font-bold ${hoveredPoint.profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${hoveredPoint.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                Profit: ${hoveredPoint.profit.toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <PageWrapper
            title="Financial Control Center"
            subtitle="Monitor corporate cash flow, sales margins, overhead purchases, and estimations."
            actions={
                <div className="flex items-center gap-2.5">
                    <Button 
                        variant="secondary" 
                        icon={RefreshCw} 
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={`${isSyncing ? 'animate-spin' : ''}`}
                    >
                        Sync Data
                    </Button>
                    <Link to="/accounting/chart-of-accounts">
                        <Button variant="secondary" icon={FileText}>
                            Chart of Accounts
                        </Button>
                    </Link>
                    <Link to="/accounting/general-ledger">
                        <Button variant="secondary" icon={Scale}>
                            General Ledger
                        </Button>
                    </Link>
                    <Link to="/accounting/trial-balance">
                        <Button variant="secondary" icon={ListChecks}>
                            Trial Balance
                        </Button>
                    </Link>
                    <Link to="/accounting/profit-loss">
                        <Button variant="secondary" icon={TrendingUp}>
                            Profit & Loss
                        </Button>
                    </Link>
                    <Link to="/accounting/journal-entry">
                        <Button variant="primary" icon={BookOpen}>
                            New Journal Entry
                        </Button>
                    </Link>
                </div>
            }
        >
            {/* Filtering Control Bar */}
            <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                    <div className="w-44">
                        <Select
                            id="branch-select"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                        >
                            <option value="all">All Corporate Branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </Select>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>Filter:</span>
                        <div className="w-36">
                            <Input
                                type="date"
                                id="date-from"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <span>to</span>
                        <div className="w-36">
                            <Input
                                type="date"
                                id="date-to"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial metrics stats grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="p-5 bg-slate-900/30 border border-slate-800/50 rounded-2xl space-y-3">
                            <Skeleton className="w-16 h-3" />
                            <Skeleton className="w-24 h-6" />
                            <Skeleton className="w-32 h-2.5" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Gross Sales card */}
                    <div className="bg-slate-900/50 border border-slate-800/85 p-5 rounded-2xl shadow-xl hover:border-slate-700/60 transition-all block text-left group">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gross Sales</p>
                                <h3 className="text-xl font-bold tracking-tight text-slate-100 group-hover:text-indigo-400 transition-colors">
                                    ${metrics.gross_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 font-semibold tracking-wide flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Gross client inflows</span>
                        </div>
                    </div>

                    {/* Customer Refunds card */}
                    <div className="bg-slate-900/50 border border-slate-800/85 p-5 rounded-2xl shadow-xl hover:border-slate-700/60 transition-all block text-left group">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer Refunds</p>
                                <h3 className="text-xl font-bold tracking-tight text-slate-100 group-hover:text-rose-400 transition-colors">
                                    -${metrics.refunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                <TrendingDown className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 font-semibold tracking-wide flex items-center gap-1">
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                            <span>Returned payments</span>
                        </div>
                    </div>

                    {/* COGS card */}
                    <div className="bg-slate-900/50 border border-slate-800/85 p-5 rounded-2xl shadow-xl hover:border-slate-700/60 transition-all block text-left group">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cost of Goods (COGS)</p>
                                <h3 className="text-xl font-bold tracking-tight text-slate-100 group-hover:text-violet-400 transition-colors">
                                    ${metrics.cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                                <Percent className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-400 font-semibold tracking-wide flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 font-black">{profitMargin}%</span>
                            <span className="text-slate-500">Sales profit margin</span>
                        </div>
                    </div>

                    {/* Inventory Expenses card */}
                    <div className="bg-slate-900/50 border border-slate-800/85 p-5 rounded-2xl shadow-xl hover:border-slate-700/60 transition-all block text-left group">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inventory Supplies</p>
                                <h3 className="text-xl font-bold tracking-tight text-slate-100 group-hover:text-amber-400 transition-colors">
                                    -${metrics.inventory_purchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 font-semibold tracking-wide flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                            <span>Purchase order payouts</span>
                        </div>
                    </div>

                    {/* Net Profit card */}
                    <div className="bg-slate-900/50 border border-slate-800/85 p-5 rounded-2xl shadow-xl hover:border-slate-700/60 transition-all block text-left group">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Profit (Est.)</p>
                                <h3 className={`text-xl font-bold tracking-tight group-hover:opacity-80 transition-opacity ${metrics.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {metrics.net_profit >= 0 ? '+' : ''}${metrics.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <div className={`p-2.5 rounded-xl border ${metrics.net_profit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 font-semibold tracking-wide flex items-center gap-1">
                            {metrics.net_profit >= 0 ? (
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                            )}
                            <span>Net operational bottom line</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Rolling trend chart & branch distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 30 day financial trend graph */}
                <div className="lg:col-span-2 p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl flex flex-col justify-between min-h-[300px]">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                        <div>
                            <h4 className="text-sm font-bold text-slate-200">Revenues vs. Expenses (Last 30 Days)</h4>
                            <p className="text-[10px] text-slate-500">Daily rolling comparison of completed POS sales and inventory supply payouts.</p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold">
                            <span className="flex items-center gap-1.5 text-indigo-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                Sales
                            </span>
                            <span className="flex items-center gap-1.5 text-rose-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                Expenses
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center">
                        {isLoading ? (
                            <Skeleton className="w-full h-44 rounded-xl" />
                        ) : trend.length === 0 ? (
                            <EmptyState
                                title="No Trend Data"
                                description="Perform POS checkouts or complete purchase orders to begin logging daily performance metrics."
                                icon={Activity}
                                className="py-8"
                            />
                        ) : (
                            renderTrendChart()
                        )}
                    </div>
                </div>

                {/* Branch contributions performance */}
                <div className="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="mb-4 border-b border-slate-800 pb-3">
                            <h4 className="text-sm font-bold text-slate-200">Branch Profit Contribution</h4>
                            <p className="text-[10px] text-slate-500">Net performance breakdown comparison grouped by physical warehouse/retail registers.</p>
                        </div>
                        
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="w-24 h-3" />
                                        <Skeleton className="w-full h-2 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : branchBreakdown.length === 0 ? (
                            <EmptyState
                                title="No Branch Records"
                                description="No transactions logged for active branches within the filtered date ranges."
                                icon={GitBranch}
                                className="py-8"
                            />
                        ) : (
                            <Table 
                                columns={branchColumns}
                                data={branchBreakdown}
                                className="border-none shadow-none bg-transparent"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Unified general ledger feed */}
            <div className="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl">
                <div className="mb-4 border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h4 className="text-sm font-bold text-slate-200">Recent General Ledger Entries</h4>
                        <p className="text-[10px] text-slate-500">Descending chronological journal records of sales, refunds, and corporate purchases.</p>
                    </div>
                    <div className="w-48 shrink-0">
                        <Select
                            id="ledger-filter"
                            value={ledgerFilter}
                            onChange={(e) => setLedgerFilter(e.target.value)}
                        >
                            <option value="all">All Journal Entries</option>
                            <option value="POS Sale">POS Sales Only</option>
                            <option value="POS Refund">POS Refunds Only</option>
                            <option value="Supplier Purchase">Supplier Purchases Only</option>
                        </Select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="w-full h-10" />
                        <Skeleton className="w-full h-10" />
                        <Skeleton className="w-full h-10" />
                    </div>
                ) : ledger.filter(e => ledgerFilter === 'all' || e.type === ledgerFilter).length === 0 ? (
                    <EmptyState
                        title="No Matching Entries"
                        description="No ledger journal entries match the selected transaction type filter."
                        icon={FileText}
                    />
                ) : (
                    <Table 
                        columns={ledgerColumns}
                        data={ledger.filter(e => ledgerFilter === 'all' || e.type === ledgerFilter)}
                    />
                )}
            </div>
        </PageWrapper>
    );
}
