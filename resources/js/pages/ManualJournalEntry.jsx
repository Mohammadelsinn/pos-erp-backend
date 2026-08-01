import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import { Input, Textarea, Select } from '../components/FormControls';
import {
    Plus, Trash2, AlertCircle, CheckCircle2, Scale,
    BookOpen, Save, RotateCcw
} from 'lucide-react';

// Creates a blank journal entry line
let lineIdCounter = 0;
const createBlankLine = () => ({
    _id: `line-${++lineIdCounter}`,
    account_id: '',
    description: '',
    debit: '',
    credit: ''
});

export default function ManualJournalEntry() {
    const navigate = useNavigate();

    // Header fields
    const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
    const [reference, setReference] = useState('');
    const [memo, setMemo] = useState('');

    // Line items
    const [lines, setLines] = useState([createBlankLine(), createBlankLine()]);

    // Accounts for dropdown
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);

    // Submission state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        axios.get('/api/accounting/accounts')
            .then(res => {
                const data = (res.data || []).filter(a => a.is_active);
                setAccounts(data);
            })
            .catch(err => {
                console.error('Failed to load chart of accounts:', err);
            })
            .finally(() => setLoadingAccounts(false));
    }, []);

    const accountOptions = [
        { value: '', label: 'Select account...' },
        ...accounts.map(a => ({ value: a.id, label: `${a.code} - ${a.name}` }))
    ];

    // Line mutation helpers
    const updateLine = (id, field, value) => {
        setLines(prev => prev.map(line => {
            if (line._id !== id) return line;
            const updated = { ...line, [field]: value };
            // Entering a debit clears credit on the same line, and vice versa
            if (field === 'debit' && value !== '') updated.credit = '';
            if (field === 'credit' && value !== '') updated.debit = '';
            return updated;
        }));
    };

    const addLine = () => {
        setLines(prev => [...prev, createBlankLine()]);
    };

    const removeLine = (id) => {
        setLines(prev => prev.length <= 2 ? prev : prev.filter(line => line._id !== id));
    };

    const resetForm = () => {
        setEntryDate(new Date().toISOString().slice(0, 10));
        setReference('');
        setMemo('');
        setLines([createBlankLine(), createBlankLine()]);
        setError(null);
        setSuccess(false);
        setFieldErrors({});
    };

    // Totals
    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    const difference = Number((totalDebit - totalCredit).toFixed(2));
    const isBalanced = difference === 0 && totalDebit > 0;

    const validate = () => {
        const errors = {};
        if (!entryDate) errors.entryDate = 'Entry date is required.';

        const lineErrors = {};
        lines.forEach(line => {
            const hasAccount = !!line.account_id;
            const debitVal = Number(line.debit) || 0;
            const creditVal = Number(line.credit) || 0;
            const hasAmount = debitVal > 0 || creditVal > 0;

            if (hasAccount || hasAmount) {
                if (!hasAccount) lineErrors[line._id] = { ...lineErrors[line._id], account: 'Account required.' };
                if (!hasAmount) lineErrors[line._id] = { ...lineErrors[line._id], amount: 'Enter a debit or credit.' };
                if (debitVal > 0 && creditVal > 0) lineErrors[line._id] = { ...lineErrors[line._id], amount: 'Cannot have both debit and credit.' };
            }
        });

        const filledLines = lines.filter(l => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0));
        if (filledLines.length < 2) {
            errors.lines = 'At least two complete lines (one debit, one credit) are required.';
        }

        if (!isBalanced) {
            errors.balance = 'Total debits must equal total credits before posting.';
        }

        if (Object.keys(lineErrors).length > 0) {
            errors.lineErrors = lineErrors;
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        const errors = validate();
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        const payload = {
            entry_date: entryDate,
            reference: reference || null,
            description: memo || null,
            items: lines
                .filter(l => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0))
                .map(l => {
                    const debitVal = Number(l.debit) || 0;
                    return {
                        account_id: l.account_id,
                        type: debitVal > 0 ? 'debit' : 'credit',
                        amount: debitVal > 0 ? debitVal : (Number(l.credit) || 0),
                        memo: l.description || null
                    };
                })
        };

        setSubmitting(true);
        try {
            await axios.post('/api/accounting/journal-entries', payload);
            setSuccess(true);
            resetForm();
        } catch (err) {
            console.error('Failed to post journal entry:', err);
            setError(err.response?.data?.message || 'Could not post journal entry. Please review the form and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageWrapper
            title="Manual Journal Entry"
            subtitle="Record a balanced double-entry transaction directly into the general ledger."
            breadcrumbs={[
                { label: 'Accounting', path: '/accounting' },
                { label: 'Manual Journal Entry' }
            ]}
            actions={
                <Button
                    variant="secondary"
                    icon={BookOpen}
                    onClick={() => navigate('/accounting')}
                >
                    Back to Ledger
                </Button>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                        <span className="font-bold">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                        <span className="font-bold">Journal entry posted successfully.</span>
                    </div>
                )}

                {/* Entry Header */}
                <div className="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl space-y-4">
                    <h4 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3">Entry Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Entry Date"
                            type="date"
                            id="je-date"
                            value={entryDate}
                            onChange={(e) => setEntryDate(e.target.value)}
                            error={fieldErrors.entryDate}
                        />
                        <Input
                            label="Reference Number (Optional)"
                            id="je-reference"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="e.g. JE-2026-001"
                        />
                        <div className="md:col-span-1">
                            <Textarea
                                label="Memo (Optional)"
                                id="je-memo"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                placeholder="Brief note describing this entry..."
                                rows="1"
                            />
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                            <h4 className="text-sm font-bold text-slate-200">Journal Lines</h4>
                            <p className="text-[10px] text-slate-500">Each line must reference an account with either a debit or a credit amount.</p>
                        </div>
                        <Button variant="secondary" size="sm" icon={Plus} type="button" onClick={addLine}>
                            Add Line
                        </Button>
                    </div>

                    {fieldErrors.lines && (
                        <p className="text-[10px] font-semibold text-red-400">{fieldErrors.lines}</p>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                        <table className="w-full text-left border-collapse text-xs" style={{ minWidth: '760px' }}>
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider w-[30%]">Account</th>
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider w-[30%]">Description</th>
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider w-[16%]">Debit</th>
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider w-[16%]">Credit</th>
                                    <th className="py-3 px-3 font-bold uppercase tracking-wider w-[8%] text-center">Remove</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                                {lines.map((line, idx) => {
                                    const lineErr = fieldErrors.lineErrors?.[line._id];
                                    return (
                                        <tr key={line._id} className="hover:bg-slate-950/20 transition-colors align-top">
                                            <td className="py-3 px-3">
                                                <Select
                                                    id={`je-account-${line._id}`}
                                                    options={accountOptions}
                                                    value={line.account_id}
                                                    onChange={(e) => updateLine(line._id, 'account_id', e.target.value)}
                                                    error={lineErr?.account}
                                                    disabled={loadingAccounts}
                                                />
                                            </td>
                                            <td className="py-3 px-3">
                                                <Input
                                                    id={`je-desc-${line._id}`}
                                                    value={line.description}
                                                    onChange={(e) => updateLine(line._id, 'description', e.target.value)}
                                                    placeholder="Line memo..."
                                                />
                                            </td>
                                            <td className="py-3 px-3">
                                                <Input
                                                    id={`je-debit-${line._id}`}
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={line.debit}
                                                    onChange={(e) => updateLine(line._id, 'debit', e.target.value)}
                                                    placeholder="0.00"
                                                    error={lineErr?.amount && !line.credit ? lineErr.amount : undefined}
                                                />
                                            </td>
                                            <td className="py-3 px-3">
                                                <Input
                                                    id={`je-credit-${line._id}`}
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={line.credit}
                                                    onChange={(e) => updateLine(line._id, 'credit', e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <Button
                                                    variant="secondary"
                                                    size="xs"
                                                    icon={Trash2}
                                                    type="button"
                                                    onClick={() => removeLine(line._id)}
                                                    disabled={lines.length <= 2}
                                                    className="hover:bg-rose-500/15 hover:text-rose-400 border-slate-800"
                                                    title={lines.length <= 2 ? 'A journal entry needs at least two lines' : 'Remove line'}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Balance Summary */}
                <div className={`p-5 rounded-2xl border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    isBalanced
                        ? 'bg-emerald-500/5 border-emerald-500/25'
                        : 'bg-slate-900/50 border-slate-800/80'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${isBalanced ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800/60 border-slate-700/60 text-slate-400'}`}>
                            <Scale className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-200">
                                {isBalanced ? 'Entry is balanced' : 'Entry is not balanced'}
                            </p>
                            {fieldErrors.balance && !isBalanced && (
                                <p className="text-[10px] text-red-400 font-semibold">{fieldErrors.balance}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Debits</p>
                            <p className="font-mono font-black text-slate-100">
                                ${totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Credits</p>
                            <p className="font-mono font-black text-slate-100">
                                ${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Difference</p>
                            <p className={`font-mono font-black ${difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" type="button" icon={RotateCcw} onClick={resetForm}>
                        Reset Form
                    </Button>
                    <Button variant="primary" type="submit" icon={Save} disabled={submitting}>
                        {submitting ? 'Posting Entry...' : 'Post Journal Entry'}
                    </Button>
                </div>
            </form>
        </PageWrapper>
    );
}
