import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import { Input } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
    ListChecks, Printer, Download, Calendar, RefreshCw,
    Scale, AlertCircle, CheckCircle2, Folder, Search
} from 'lucide-react';

const fmt = (val) => `$${Math.abs(Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Debit-normal accounts (assets, expenses) show positive balances in the Debit column.
// Credit-normal accounts (liabilities, equity, revenue) show positive balances in the Credit column.
const isDebitNormal = (type) => type === 'asset' || type === 'expense';

const TYPE_LABELS = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity', revenue: 'Revenue', expense: 'Expenses' };
const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];

export default function TrialBalance() {
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTrialBalance = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/accounting/trial-balance', {
                params: { date_to: asOfDate }
            });
            setAccounts(response.data.accounts || []);
        } catch (err) {
            console.error('Failed to load trial balance:', err);
            setError(err.response?.data?.message || 'Failed to load the trial balance report. Please try again.');
            setAccounts([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTrialBalance();
    }, [asOfDate]);

    // Derive debit/credit columns from each account's raw balance + normal side
    const rows = useMemo(() => {
        return accounts.map(acc => {
            const balance = Number(acc.balance) || 0;
            const debitNormal = isDebitNormal(acc.type);
            let debit = 0;
            let credit = 0;
            if (debitNormal) {
                if (balance >= 0) debit = balance; else credit = Math.abs(balance);
            } else {
                if (balance >= 0) credit = balance; else debit = Math.abs(balance);
            }
            return { ...acc, debit, credit };
        });
    }, [accounts]);

    const filteredRows = rows.filter(row => {
        const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.code.includes(searchQuery);
        const matchesType = typeFilter === 'all' || row.type === typeFilter;
        return matchesSearch && matchesType && (row.debit !== 0 || row.credit !== 0);
    });

    const groupedRows = TYPE_ORDER.map(type => ({
        type,
        rows: filteredRows.filter(r => r.type === type)
    })).filter(g => g.rows.length > 0);

    const totalDebit = filteredRows.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = filteredRows.reduce((sum, r) => sum + r.credit, 0);
    const difference = Number((totalDebit - totalCredit).toFixed(2));
    const isBalanced = difference === 0 && filteredRows.length > 0;

    const handlePrint = () => window.print();

    const handleExportCsv = () => {
        const csvRows = [
            ['Trial Balance'],
            [`As of ${asOfDate}`],
            [],
            ['Code', 'Account', 'Type', 'Debit', 'Credit'],
            ...filteredRows.map(r => [r.code, r.name, r.type, r.debit.toFixed(2), r.credit.toFixed(2)]),
            [],
            ['Totals', '', '', totalDebit.toFixed(2), totalCredit.toFixed(2)]
        ];
        const csv = csvRows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `trial-balance-${asOfDate}.csv`;
        link.click();
    };

    return (
        <PageWrapper
            title="Trial Balance"
            subtitle="Verify that total posted debits equal total posted credits across the chart of accounts."
            breadcrumbs={[{ label: 'Accounting', path: '/accounting' }, { label: 'Trial Balance' }]}
            actions={
                <div className="flex items-center gap-2.5">
                    <Button variant="secondary" icon={RefreshCw} onClick={fetchTrialBalance} disabled={isLoading}>
                        Reload
                    </Button>
                    <Button variant="secondary" icon={Download} onClick={handleExportCsv} disabled={isLoading || filteredRows.length === 0}>
                        Export CSV
                    </Button>
                    <Button variant="primary" icon={Printer} onClick={handlePrint} disabled={filteredRows.length === 0}>
                        Print Report
                    </Button>
                </div>
            }
        >
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* Filter Bar */}
            <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                    <div className="relative w-64">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search accounts by code or name..."
                            className="w-full bg-slate-950/40 border border-slate-800 pl-9 pr-3 py-2.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>As of:</span>
                        <div className="w-36">
                            <Input type="date" id="tb-as-of-date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Type Tabs */}
            <div className="flex border-b border-slate-800 pb-px gap-1 overflow-x-auto">
                {['all', ...TYPE_ORDER].map(type => {
                    const isActive = typeFilter === type;
                    const count = type === 'all' ? filteredRowsCountForAll(rows) : rows.filter(r => r.type === type && (r.debit !== 0 || r.credit !== 0)).length;
                    return (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={`px-4 py-3 text-xs font-extrabold uppercase border-b-2 tracking-wider shrink-0 transition-all flex items-center gap-2 ${isActive ? 'border-indigo-500 text-indigo-400 bg-slate-900/40' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-650'}`} />
                            <span>{type === 'all' ? 'All Accounts' : TYPE_LABELS[type]}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/80 text-[9px] text-slate-400 font-bold">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Balance Status Banner */}
            {!isLoading && filteredRows.length > 0 && (
                <div className={`p-5 rounded-2xl border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    isBalanced ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-rose-500/5 border-rose-500/25'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${isBalanced ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                            {isBalanced ? <CheckCircle2 className="w-4.5 h-4.5" /> : <Scale className="w-4.5 h-4.5" />}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-200">
                                {isBalanced ? 'Ledger is balanced' : 'Ledger is out of balance'}
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {isBalanced ? 'Total debits equal total credits for the selected accounts.' : 'Total debits and credits do not match — review recent journal entries.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Debits</p>
                            <p className="font-mono font-black text-slate-100">{fmt(totalDebit)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Credits</p>
                            <p className="font-mono font-black text-slate-100">{fmt(totalCredit)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Difference</p>
                            <p className={`font-mono font-black ${isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(difference)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Trial Balance Table */}
            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="w-full h-11" />
                    <Skeleton className="w-full h-11" />
                    <Skeleton className="w-full h-11" />
                    <Skeleton className="w-full h-11" />
                </div>
            ) : filteredRows.length === 0 ? (
                <EmptyState
                    title="No account balances found"
                    description="No posted account balances match the selected filters for this date."
                    icon={ListChecks}
                />
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 shadow-xl backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs font-semibold" style={{ minWidth: '700px' }}>
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Code</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Account Name</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">Debit</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">Credit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850 text-slate-300">
                                {groupedRows.map(group => (
                                    <React.Fragment key={group.type}>
                                        <tr className="bg-slate-950/30">
                                            <td colSpan={4} className="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                {TYPE_LABELS[group.type]}
                                            </td>
                                        </tr>
                                        {group.rows.map(row => (
                                            <tr key={row.id} className="hover:bg-slate-950/20 transition-colors">
                                                <td className="py-3.5 px-4 font-mono text-slate-100 font-bold">{row.code}</td>
                                                <td className="py-3.5 px-4 text-slate-200">{row.name}</td>
                                                <td className="py-3.5 px-4 text-right font-mono text-slate-100">
                                                    {row.debit > 0 ? fmt(row.debit) : '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono text-slate-100">
                                                    {row.credit > 0 ? fmt(row.credit) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-800 bg-slate-950/40">
                                    <td colSpan={2} className="py-3.5 px-4 font-black text-slate-200 uppercase tracking-wider text-[11px]">
                                        Totals
                                    </td>
                                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-100">{fmt(totalDebit)}</td>
                                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-100">{fmt(totalCredit)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </PageWrapper>
    );
}

function filteredRowsCountForAll(rows) {
    return rows.filter(r => r.debit !== 0 || r.credit !== 0).length;
}
