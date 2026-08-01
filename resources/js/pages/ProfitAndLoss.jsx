import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import { Select, Input } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
    FileBarChart, Printer, Download, Calendar, RefreshCw,
    TrendingUp, TrendingDown, DollarSign, Percent, Layers,
    ArrowUpRight, ArrowDownRight, Minus, Activity
} from 'lucide-react';

const emptyReport = {
    period: { from: '', to: '' },
    revenue: { gross_sales: 0, refunds: 0, net_revenue: 0 },
    cogs: 0,
    gross_profit: 0,
    operating_expenses: [],
    total_operating_expenses: 0,
    net_operating_income: 0,
    other_income: 0,
    other_expenses: 0,
    net_profit: 0
};

const fmt = (val) => `$${Math.abs(Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (part, whole) => (whole ? ((part / whole) * 100).toFixed(1) : '0.0');

function defaultMonthRange() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
        from: first.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10)
    };
}

export default function ProfitAndLoss() {
    const defaults = defaultMonthRange();
    const [report, setReport] = useState(emptyReport);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [dateFrom, setDateFrom] = useState(defaults.from);
    const [dateTo, setDateTo] = useState(defaults.to);

    const fetchReport = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/accounting/profit-loss', {
                params: {
                    branch_id: selectedBranch,
                    date_from: dateFrom,
                    date_to: dateTo
                }
            });
            setReport({ ...emptyReport, ...response.data });
        } catch (err) {
            console.error('Failed to load profit & loss report:', err);
            setError(err.response?.data?.message || 'Failed to load the Profit & Loss report. Please try again.');
            setReport(emptyReport);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        axios.get('/api/branches')
            .then(res => setBranches((res.data || []).filter(b => b.is_active)))
            .catch(err => console.error('Failed to load branches:', err));
    }, []);

    useEffect(() => {
        fetchReport();
    }, [selectedBranch, dateFrom, dateTo]);

    const handlePrint = () => window.print();

    const handleExportCsv = () => {
        const rows = [
            ['Profit & Loss Statement'],
            [`Period: ${dateFrom} to ${dateTo}`],
            [],
            ['Revenue'],
            ['Gross Sales', report.revenue.gross_sales],
            ['Refunds & Returns', -Math.abs(report.revenue.refunds)],
            ['Net Revenue', report.revenue.net_revenue],
            [],
            ['Cost of Goods Sold', -Math.abs(report.cogs)],
            ['Gross Profit', report.gross_profit],
            [],
            ['Operating Expenses'],
            ...report.operating_expenses.map(e => [e.category, -Math.abs(e.amount)]),
            ['Total Operating Expenses', -Math.abs(report.total_operating_expenses)],
            [],
            ['Net Operating Income', report.net_operating_income],
            ['Other Income', report.other_income],
            ['Other Expenses', -Math.abs(report.other_expenses)],
            [],
            ['Net Profit', report.net_profit]
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `profit-loss-${dateFrom}-to-${dateTo}.csv`;
        link.click();
    };

    const netMargin = pct(report.net_profit, report.revenue.net_revenue);
    const grossMargin = pct(report.gross_profit, report.revenue.net_revenue);
    const isProfit = Number(report.net_profit) >= 0;

    const maxExpense = Math.max(1, ...report.operating_expenses.map(e => Number(e.amount) || 0));

    return (
        <PageWrapper
            title="Profit & Loss Statement"
            subtitle="Summarize revenue, cost of goods sold, operating expenses, and net income for a selected period."
            breadcrumbs={[{ label: 'Accounting', path: '/accounting' }, { label: 'Profit & Loss' }]}
            actions={
                <div className="flex items-center gap-2.5">
                    <Button variant="secondary" icon={RefreshCw} onClick={fetchReport} disabled={isLoading}>
                        Reload
                    </Button>
                    <Button variant="secondary" icon={Download} onClick={handleExportCsv} disabled={isLoading}>
                        Export CSV
                    </Button>
                    <Button variant="primary" icon={Printer} onClick={handlePrint}>
                        Print Report
                    </Button>
                </div>
            }
        >
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                    <FileBarChart className="w-4.5 h-4.5 text-red-400 shrink-0" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* Filter Bar */}
            <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                    <div className="w-48">
                        <Select
                            id="pl-branch-select"
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
                        <span>Period:</span>
                        <div className="w-36">
                            <Input type="date" id="pl-date-from" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        </div>
                        <span>to</span>
                        <div className="w-36">
                            <Input type="date" id="pl-date-to" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-5 bg-slate-900/30 border border-slate-800/50 rounded-2xl space-y-3">
                            <Skeleton className="w-16 h-3" />
                            <Skeleton className="w-24 h-6" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 border border-slate-800/85 p-5 rounded-2xl shadow-xl">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Revenue</p>
                                <h3 className="text-xl font-bold tracking-tight text-slate-100">{fmt(report.revenue.net_revenue)}</h3>
                            </div>
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800/85 p-5 rounded-2xl shadow-xl">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gross Profit</p>
                                <h3 className="text-xl font-bold tracking-tight text-slate-100">{fmt(report.gross_profit)}</h3>
                            </div>
                            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                                <Percent className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 font-semibold">{grossMargin}% gross margin</div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800/85 p-5 rounded-2xl shadow-xl">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operating Expenses</p>
                                <h3 className="text-xl font-bold tracking-tight text-slate-100">{fmt(report.total_operating_expenses)}</h3>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <TrendingDown className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 font-semibold">{report.operating_expenses.length} categories</div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800/85 p-5 rounded-2xl shadow-xl">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Profit</p>
                                <h3 className={`text-xl font-bold tracking-tight ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {isProfit ? '+' : '-'}{fmt(report.net_profit)}
                                </h3>
                            </div>
                            <div className={`p-2.5 rounded-xl border ${isProfit ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                {isProfit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 font-semibold">{netMargin}% net margin</div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Statement */}
                <div className="lg:col-span-2 p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl">
                    <div className="mb-5 border-b border-slate-800 pb-3">
                        <h4 className="text-sm font-bold text-slate-200">Statement of Profit & Loss</h4>
                        <p className="text-[10px] text-slate-500">
                            {dateFrom && dateTo ? `For the period ${new Date(dateFrom).toLocaleDateString()} — ${new Date(dateTo).toLocaleDateString()}` : 'Select a reporting period'}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="w-full h-6" />)}
                        </div>
                    ) : (
                        <div className="text-xs">
                            {/* Revenue */}
                            <div className="py-1.5 font-bold text-slate-300 uppercase tracking-wider text-[10px]">Revenue</div>
                            <div className="flex justify-between py-1.5 pl-3 text-slate-400">
                                <span>Gross Sales</span>
                                <span className="font-mono text-slate-200">{fmt(report.revenue.gross_sales)}</span>
                            </div>
                            <div className="flex justify-between py-1.5 pl-3 text-slate-400">
                                <span>Less: Refunds &amp; Returns</span>
                                <span className="font-mono text-rose-400">({fmt(report.revenue.refunds)})</span>
                            </div>
                            <div className="flex justify-between py-2 border-t border-slate-850 font-bold text-slate-200">
                                <span>Net Revenue</span>
                                <span className="font-mono">{fmt(report.revenue.net_revenue)}</span>
                            </div>

                            {/* COGS */}
                            <div className="flex justify-between py-2 mt-3 border-t border-slate-800 text-slate-400">
                                <span>Cost of Goods Sold</span>
                                <span className="font-mono text-rose-400">({fmt(report.cogs)})</span>
                            </div>
                            <div className="flex justify-between py-2 border-t border-slate-850 font-bold text-slate-200">
                                <span>Gross Profit</span>
                                <span className="font-mono">{fmt(report.gross_profit)}</span>
                            </div>

                            {/* Operating Expenses */}
                            <div className="py-1.5 mt-4 font-bold text-slate-300 uppercase tracking-wider text-[10px] border-t border-slate-800 pt-3">
                                Operating Expenses
                            </div>
                            {report.operating_expenses.length === 0 ? (
                                <div className="py-2 pl-3 text-slate-550 italic">No operating expenses logged for this period.</div>
                            ) : (
                                report.operating_expenses.map((exp, idx) => (
                                    <div key={idx} className="flex justify-between py-1.5 pl-3 text-slate-400">
                                        <span>{exp.category}</span>
                                        <span className="font-mono text-rose-400">({fmt(exp.amount)})</span>
                                    </div>
                                ))
                            )}
                            <div className="flex justify-between py-2 border-t border-slate-850 font-bold text-slate-200">
                                <span>Total Operating Expenses</span>
                                <span className="font-mono">({fmt(report.total_operating_expenses)})</span>
                            </div>

                            {/* Net Operating Income */}
                            <div className="flex justify-between py-2 mt-3 border-t border-slate-800 font-bold text-slate-200">
                                <span>Net Operating Income</span>
                                <span className="font-mono">{fmt(report.net_operating_income)}</span>
                            </div>

                            {/* Other Income/Expense */}
                            {(Number(report.other_income) > 0 || Number(report.other_expenses) > 0) && (
                                <>
                                    <div className="flex justify-between py-1.5 pl-3 text-slate-400">
                                        <span>Other Income</span>
                                        <span className="font-mono text-emerald-400">{fmt(report.other_income)}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 pl-3 text-slate-400">
                                        <span>Other Expenses</span>
                                        <span className="font-mono text-rose-400">({fmt(report.other_expenses)})</span>
                                    </div>
                                </>
                            )}

                            {/* Net Profit */}
                            <div className={`flex justify-between items-center py-3 mt-3 rounded-xl px-3 border ${isProfit ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                                <span className="font-black text-sm text-slate-100">Net Profit</span>
                                <span className={`font-mono font-black text-base ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {isProfit ? '+' : '-'}{fmt(report.net_profit)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Expense Breakdown Chart */}
                <div className="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl">
                    <div className="mb-4 border-b border-slate-800 pb-3">
                        <h4 className="text-sm font-bold text-slate-200">Operating Expense Breakdown</h4>
                        <p className="text-[10px] text-slate-500">Relative share of total operating costs by category.</p>
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
                    ) : report.operating_expenses.length === 0 ? (
                        <EmptyState
                            title="No Expense Data"
                            description="Log expenses in the Expenses Tracker to see a category breakdown here."
                            icon={Layers}
                            className="py-8"
                        />
                    ) : (
                        <div className="space-y-4">
                            {report.operating_expenses
                                .slice()
                                .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
                                .map((exp, idx) => {
                                    const widthPct = ((Number(exp.amount) || 0) / maxExpense) * 100;
                                    return (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-semibold text-slate-350">
                                                <span>{exp.category}</span>
                                                <span className="font-mono text-slate-400">{fmt(exp.amount)}</span>
                                            </div>
                                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                                                <div
                                                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${widthPct}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        </PageWrapper>
    );
}
