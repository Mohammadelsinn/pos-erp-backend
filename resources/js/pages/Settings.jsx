import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import { Select } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import { Globe, Settings as SettingsIcon, Calendar, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

export default function Settings() {
    const [settings, setSettings] = useState({
        currency: '',
        timezone: '',
        date_format: ''
    });
    const [config, setConfig] = useState({
        currencies: [],
        timezones: [],
        date_formats: []
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [settingsRes, configRes] = await Promise.all([
                axios.get('/api/settings'),
                axios.get('/api/config')
            ]);

            setSettings({
                currency: settingsRes.data.currency || 'USD',
                timezone: settingsRes.data.timezone || 'UTC',
                date_format: settingsRes.data.date_format || 'Y-m-d'
            });

            setConfig({
                currencies: configRes.data.currencies || [],
                timezones: configRes.data.timezones || [],
                date_formats: configRes.data.date_formats || []
            });
        } catch (err) {
            console.error('Failed to load settings/config.', err);
            setError(err.response?.data?.message || 'Failed to load system settings. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e) => {
        const { id, value } = e.target;
        const key = id.replace('form-', '').replace('-', '_');
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccessMessage('');

        try {
            const response = await axios.put('/api/settings', settings);
            setSettings({
                currency: response.data.currency || 'USD',
                timezone: response.data.timezone || 'UTC',
                date_format: response.data.date_format || 'Y-m-d'
            });
            setSuccessMessage('System configurations updated successfully.');
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err) {
            console.error('Failed to update settings.', err);
            setError(err.response?.data?.message || 'Failed to update settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate current live date preview based on format
    const getFormattedDatePreview = () => {
        const selectedFormat = config.date_formats.find(f => f.format === settings.date_format);
        return selectedFormat ? selectedFormat.example : new Date().toLocaleDateString();
    };

    // Find selected currency object
    const selectedCurrency = config.currencies.find(c => c.code === settings.currency) || { symbol: '$', name: 'US Dollar' };

    return (
        <PageWrapper
            title="System & Localization Settings"
            subtitle="Configure regional preferences, terminal currency outputs, and core formats."
            breadcrumbs={[{ label: "Overview", path: "/dashboard" }, { label: "System Settings" }]}
        >
            {isLoading ? (
                <div className="max-w-3xl backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                    <Skeleton variant="text" className="w-1/4 h-6" />
                    <div className="space-y-4">
                        <Skeleton variant="text" />
                        <Skeleton variant="text" className="w-11/12" />
                        <Skeleton variant="text" className="w-10/12" />
                    </div>
                </div>
            ) : (
                <div className="max-w-3xl grid grid-cols-1 gap-6 items-start">
                    
                    {/* Settings Form Card */}
                    <div className="backdrop-blur-xl bg-slate-900/45 border border-slate-800/80 rounded-2xl p-6 lg:p-8 shadow-xl space-y-6">
                        <div className="border-b border-slate-800/85 pb-4">
                            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                                <Globe className="w-4 h-4 text-indigo-400" />
                                Localization & System Preferences
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-normal">
                                Manage the primary regional settings. These preferences modify layout times, display currency codes, and format register output dates.
                            </p>
                        </div>

                        {successMessage && (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs flex items-center gap-2.5 animate-fadeIn">
                                <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                                <span className="font-semibold">{successMessage}</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5 animate-shake">
                                <AlertCircle className="w-4.5 h-4.5 text-red-400" />
                                <span className="font-semibold">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* Currency Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                                <div className="md:col-span-2">
                                    <Select
                                        label="System Base Currency"
                                        id="form-currency"
                                        value={settings.currency}
                                        onChange={handleChange}
                                        options={config.currencies.map(c => ({ value: c.code, label: `${c.code} - ${c.name} (${c.symbol})` }))}
                                        icon={DollarSign}
                                        helperText="Selected currency applies to point of sale cash register tallies, invoices, and accounting logs."
                                    />
                                </div>
                                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col items-center justify-center text-center h-[90px] md:mt-6 select-none">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Output</span>
                                    <span className="text-2xl font-black text-indigo-400 mt-1">{selectedCurrency.symbol}</span>
                                </div>
                            </div>

                            {/* Timezone Selection */}
                            <Select
                                label="Primary System Timezone"
                                id="form-timezone"
                                value={settings.timezone}
                                onChange={handleChange}
                                options={config.timezones.map(tz => ({ value: tz, label: tz }))}
                                icon={Globe}
                                helperText="Timezone settings dictate terminal clock-ins, invoice time stamps, and log tracking schedules."
                            />

                            {/* Date Format Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                                <div className="md:col-span-2">
                                    <Select
                                        label="System Date Display Format"
                                        id="form-date-format"
                                        value={settings.date_format}
                                        onChange={handleChange}
                                        options={config.date_formats.map(f => ({ value: f.format, label: f.format }))}
                                        icon={Calendar}
                                        helperText="Configures dates on the dashboard widgets, register displays, and printed orders."
                                    />
                                </div>
                                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col items-center justify-center text-center h-[90px] md:mt-6 select-none">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Format Preview</span>
                                    <span className="text-xs font-bold text-slate-350 mt-2 truncate max-w-[200px]">{getFormattedDatePreview()}</span>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <Button
                                    variant="primary"
                                    size="md"
                                    type="submit"
                                    loading={isSaving}
                                    className="px-6"
                                >
                                    Save Configurations
                                </Button>
                            </div>
                        </form>
                    </div>

                </div>
            )}
        </PageWrapper>
    );
}
