import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import { Select, Input } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
    BookOpen, Printer, Download, Calendar, RefreshCw,
    Scale, FileText, ArrowUpRight, ArrowDownRight, Search
} from 'lucide-react';

const fmt = (val) => `$${Math.abs(Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Debit-normal accounts (assets, expenses) increase with debits.
// Credit-normal accounts (liabilities, equity, revenue) increase with credits.
const isDebitNormal = (type) => type === 'asset' || type === 'expense';

function defaultMonthRange() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
        from: first.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10)
    };
}

export default function GeneralLedger() {
    const defaults = defaultMonthRange();

    const [accounts, setAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
    const [accountSearch, setAccountSearch] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');

    const [dateFrom, setDateFrom] = useState(defaults.from);
    const [dateTo, setDateTo] = useState(defaults.to);

    const [entries, setEntries] = useState([]);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [isLoadingLedger, setIsLoadingLedger] = useState(false);
    const [error, setError] = useState(null);

    // Load accounts for the sidebar picker
    useEffect(() => {
        setIsLoadingAccounts(true);
        axios.get('/api/accounting/accounts')
            .then(res => {
                const list = (res.data || []).filter(a => a.is_active);
                setAccounts(list);
                if (list.length > 0) setSelectedAccountId(String(list[0].id));
            })
            .catch(err => console.error('Failed to load chart of accounts:', err))
            .finally(() => setIsLoadingAccounts(false));
    }, []);

    const selectedAccount = accounts.find(a => String(a.id) === String(selectedAccountId));

    const fetchLedger = async () => {
        if (!selectedAccountId) return;
        setIsLoadingLedger(true);
        setError(null);
        try {
            const response = await axios.get(`/api/accounting/accounts/${selectedAccountId}/ledger`, {
                params: { date_from: dateFrom, date_to: dateTo }
            });
            setEntries(response.data.entries || []);
            setOpeningBalance(Number(response.data.opening_balance) || 0);
        } catch (err) {
            console.error('Failed to load general ledger:', err);
            setError(err.response?.data?.message || 'Failed to load ledger entries for this account.');
            setEntries([]);
            setOpeningBalance(0);
        } finally {
            setIsLoadingLedger(false);
        }
    };

    useEffect(() => {
        fetchLedger();
    }, [selectedAccountId, dateFrom, dateTo]);

    // Compute running balances client-side based on account normal side
    const rows = useMemo(() => {
        const debitNormal = isDebitNormal(selectedAccount?.type);
        let running = openingBalance;
        return entries.map(entry => {
            const debit = Number(entry.debit) || 0;
            const credit = Number(entry.credit) || 0;
            const delta = debitNormal ? (debit - credit) : (credit - debit);
            running += delta;
            return { ...entry, runningBalance: running };
        });
    }, [entries, openingBalance, selectedAccount]);

    const totalDebit = entries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
    const closingBalance = rows.length > 0 ? rows[rows.length - 1].runningBalance : openingBalance;

    const filteredAccounts = accounts.filter(a =>
        a.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
        a.code.includes(accountSearch)
    );

    const groupedAccounts = filteredAccounts.reduce((groups, acc) => {
        (groups[acc.type] = groups[acc.type] || []).push(acc);
        return groups;
    }, {});
    const typeLabels = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity', revenue: 'Revenue', expense: 'Expenses' };

    const handlePrint = () => window.print();

    const handleExportCsv = () => {
        const rowsCsv = [
            ['General Ledger'],
            [`Account: ${selectedAccount?.code || ''} - ${selectedAccount?.name || ''}`],
            [`Period: ${dateFrom} to ${dateTo}`],
            [],
            ['Opening Balance', openingBalance.toFixed(2)],
            [],
            ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'],
            ...rows.map(r => [r.date, r.reference || '', (r.description || '').replace(/,/g, ';'), Number(r.debit || 0).toFixed(2), Number(r.credit || 0).toFixed(2), r.runningBalance.toFixed(2)]),
            [],
            ['Total Debits', totalDebit.toFixed(2)],
            ['Total Credits', totalCredit.toFixed(2)],
            ['Closing Balance', closingBalance.toFixed(2)]
        ];
        const csv = rowsCsv.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `general-ledger-${selectedAccount?.code || 'account'}-${dateFrom}-to-${dateTo}.csv`;
        link.click();
    };

    return (
        <PageWrapper
            title="General Ledger"
            subtitle="Trace every posted debit and credit for a chart-of-accounts entry, with running balances."
            breadcrumbs={[{ label: 'Accounting', path: '/accounting' }, { label: 'General Ledger' }]}
            actions={
                <div className="flex items-center gap-2.5">
                    <Button variant="secondary" icon={RefreshCw} onClick={fetchLedger} disabled={isLoadingLedger || !selectedAccountId}>
                        Reload
                    </Button>
                    <Button variant="secondary" icon={Download} onClick={handleExportCsv} disabled={isLoadingLedger || rows.length === 0}>
                        Export CSV
                    </Button>
                    <Button variant="primary" icon={Printer} onClick={handlePrint} disabled={rows.length === 0}>
                        Print Ledger
                    </Button>
                </div>
            }
        >
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                    <FileText className="w-4.5 h-4.5 text-red-400 shrink-0" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Account Picker Sidebar */}
                <div className="lg:col-span-1 p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl space-y-3 lg:max-h-[720px] lg:overflow-y-auto">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={accountSearch}
                            onChange={(e) => setAccountSearch(e.target.value)}
                            placeholder="Search accounts..."
                            className="w-full bg-slate-950/40 border border-slate-800 pl-8 pr-3 py-2 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {isLoadingAccounts ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="w-full h-9" />)}
                        </div>
                    ) : filteredAccounts.length === 0 ? (
                        <p className="text-[11px] text-slate-500 text-center py-6">No matching accounts.</p>
                    ) : (
                        Object.entries(groupedAccounts).map(([type, list]) => (
                            <div key={type} className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-550 uppercase tracking-widest px-2 pt-2">{typeLabels[type] || type}</p>
                                {list.map(acc => (
                                    <button
                                        key={acc.id}
                                        onClick={() => setSelectedAccountId(String(acc.id))}
                                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 ${
                                            String(acc.id) === String(selectedAccountId)
                                                ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300'
                                                : 'border border-transparent text-slate-400 hover:bg-slate-950/40 hover:text-slate-200'
                                        }`}
                                    >
                                        <span className="truncate">{acc.name}</span>
                                        <span className="text-[9px] font-mono text-slate-550 shrink-0">{acc.code}</span>
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>

                {/* Ledger Detail */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Filter Bar */}
                    <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span>Period:</span>
                            <div className="w-36">
                                <Input type="date" id="gl-date-from" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                            </div>
                            <span>to</span>
                            <div className="w-36">
                                <Input type="date" id="gl-date-to" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {!selectedAccountId ? (
                        <EmptyState
                            title="Select an account"
                            description="Choose an account from the list to view its posted ledger transactions."
                            icon={BookOpen}
                        />
                    ) : (
                        <>
                            {/* Account Header */}
                            <div className="p-5 bg-slate-900/50 border border-slate-800/85 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Viewing Ledger For</p>
                                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-1">
                                        <span className="font-mono text-indigo-400">{selectedAccount?.code}</span>
                                        {selectedAccount?.name}
                                    </h3>
                                </div>
                                <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider self-start">
                                    {selectedAccount?.type}
                                </span>
                            </div>

                            {/* Balance Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-slate-900/50 border border-slate-800/85 p-4 rounded-2xl shadow-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opening Balance</p>
                                    <p className="text-lg font-bold text-slate-200 font-mono mt-1">{fmt(openingBalance)}</p>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800/85 p-4 rounded-2xl shadow-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Debits</p>
                                    <p className="text-lg font-bold text-slate-100 font-mono mt-1">{fmt(totalDebit)}</p>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-800/85 p-4 rounded-2xl shadow-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Credits</p>
                                    <p className="text-lg font-bold text-slate-100 font-mono mt-1">{fmt(totalCredit)}</p>
                                </div>
                                <div className="bg-slate-900/50 border border-indigo-500/30 p-4 rounded-2xl shadow-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Closing Balance</p>
                                    <p className="text-lg font-bold text-indigo-400 font-mono mt-1">{fmt(closingBalance)}</p>
                                </div>
                            </div>

                            {/* Ledger Table */}
                            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
                                <div className="p-5 border-b border-slate-800/60 flex items-center gap-2 bg-slate-900/60">
                                    <Scale className="w-5 h-5 text-indigo-400" />
                                    <h4 className="text-sm font-bold text-slate-200">Posted Transactions</h4>
                                </div>

                                {isLoadingLedger ? (
                                    <div className="p-5 space-y-3">
                                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="w-full h-9" />)}
                                    </div>
                                ) : rows.length === 0 ? (
                                    <EmptyState
                                        title="No transactions in this period"
                                        description="No journal entry lines were posted to this account within the selected date range."
                                        icon={BookOpen}
                                        className="border-none rounded-none"
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs font-semibold" style={{ minWidth: '760px' }}>
                                            <thead>
                                                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                                                    <th className="py-3.5 px-5">Date</th>
                                                    <th className="py-3.5 px-5">Reference</th>
                                                    <th className="py-3.5 px-5">Description</th>
                                                    <th className="py-3.5 px-5 text-right">Debit</th>
                                                    <th className="py-3.5 px-5 text-right">Credit</th>
                                                    <th className="py-3.5 px-5 text-right">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-850 text-slate-300">
                                                <tr className="bg-slate-950/20">
                                                    <td colSpan={5} className="py-2.5 px-5 text-slate-500 italic">Opening Balance</td>
                                                    <td className="py-2.5 px-5 text-right font-mono text-slate-300">{fmt(openingBalance)}</td>
                                                </tr>
                                                {rows.map((row, idx) => (
                                                    <tr key={row.id || idx} className="hover:bg-slate-950/20 transition-colors">
                                                        <td className="py-3.5 px-5 text-slate-350">
                                                            {new Date(row.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </td>
                                                        <td className="py-3.5 px-5 font-mono text-indigo-400">{row.reference || '—'}</td>
                                                        <td className="py-3.5 px-5 text-slate-400 max-w-xs truncate">{row.description || '—'}</td>
                                                        <td className="py-3.5 px-5 text-right font-mono text-slate-100">
                                                            {Number(row.debit) > 0 ? fmt(row.debit) : '—'}
                                                        </td>
                                                        <td className="py-3.5 px-5 text-right font-mono text-slate-100">
                                                            {Number(row.credit) > 0 ? fmt(row.credit) : '—'}
                                                        </td>
                                                        <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-200">
                                                            {fmt(row.runningBalance)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t border-slate-800 bg-slate-950/30">
                                                    <td colSpan={3} className="py-3 px-5">
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                                                            Totals / Closing Balance
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-5 text-right font-mono font-bold text-slate-100">{fmt(totalDebit)}</td>
                                                    <td className="py-3 px-5 text-right font-mono font-bold text-slate-100">{fmt(totalCredit)}</td>
                                                    <td className="py-3 px-5 text-right font-mono font-black text-indigo-400">{fmt(closingBalance)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </PageWrapper>
    );
}
