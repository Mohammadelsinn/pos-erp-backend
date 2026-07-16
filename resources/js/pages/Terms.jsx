import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, X, ArrowLeft, AlertCircle } from 'lucide-react';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import { Input, Select } from '../components/FormControls';

export default function Terms() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const defaultAttrId = searchParams.get('attributeId') || '';

    const [attributes, setAttributes] = useState([]);
    const [selectedAttrId, setSelectedAttrId] = useState(defaultAttrId);
    const [newTerm, setNewTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchAttributes = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/settings');
            let attrs = [];
            if (response.data.product_attributes) {
                attrs = JSON.parse(response.data.product_attributes);
            } else {
                attrs = [
                    { id: 'capacity', name: 'Capacity', terms: [] },
                    { id: 'color', name: 'Color', terms: ['Red', 'Sage Green', 'Amber Glass'] },
                    { id: 'material', name: 'Material', terms: ['S'] },
                    { id: 'size', name: 'Size', terms: [] }
                ];
                await axios.put('/api/settings', { product_attributes: JSON.stringify(attrs) });
            }
            setAttributes(attrs);
            
            // Set default selected attribute if none specified or not found
            if (!selectedAttrId && attrs.length > 0) {
                setSelectedAttrId(attrs[0].id);
            } else if (selectedAttrId && !attrs.some(a => a.id === selectedAttrId)) {
                setSelectedAttrId(attrs[0]?.id || '');
            }
        } catch (err) {
            console.error('Failed to load attributes', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttributes();
    }, []);

    // Sync state when query parameter changes
    useEffect(() => {
        const paramId = searchParams.get('attributeId');
        if (paramId) {
            setSelectedAttrId(paramId);
        }
    }, [searchParams]);

    const activeAttribute = attributes.find(a => a.id === selectedAttrId);

    const handleAddTerm = async (e) => {
        e.preventDefault();
        if (!newTerm.trim() || !selectedAttrId) return;

        const termName = newTerm.trim();
        if (activeAttribute.terms.some(t => t.toLowerCase() === termName.toLowerCase())) {
            alert('This term already exists for this attribute.');
            return;
        }

        setSubmitting(true);
        const updated = attributes.map(attr => {
            if (attr.id === selectedAttrId) {
                return {
                    ...attr,
                    terms: [...attr.terms, termName]
                };
            }
            return attr;
        });

        try {
            await axios.put('/api/settings', { product_attributes: JSON.stringify(updated) });
            setAttributes(updated);
            setNewTerm('');
        } catch (err) {
            console.error('Failed to add term', err);
            alert('Failed to save term.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTerm = async (termToDelete) => {
        if (!confirm(`Are you sure you want to remove "${termToDelete}"? This will not remove it from existing variations, but it won't be selectable for new ones.`)) {
            return;
        }

        const updated = attributes.map(attr => {
            if (attr.id === selectedAttrId) {
                return {
                    ...attr,
                    terms: attr.terms.filter(t => t !== termToDelete)
                };
            }
            return attr;
        });

        try {
            await axios.put('/api/settings', { product_attributes: JSON.stringify(updated) });
            setAttributes(updated);
        } catch (err) {
            console.error('Failed to delete term', err);
            alert('Failed to delete term.');
        }
    };

    const attributeOptions = attributes.map(a => ({
        value: a.id,
        label: a.name
    }));

    return (
        <PageWrapper title="Attribute Terms" subtitle="configure and manage specific values for product attributes">
            <div className="mb-6">
                <button
                    onClick={() => navigate('/attributes')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-450 hover:text-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Attributes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Select Attribute Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 h-fit">
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider border-b border-slate-800 pb-2.5">
                        Select Attribute
                    </h3>
                    {loading ? (
                        <div className="text-xs text-slate-550 italic">Loading attributes...</div>
                    ) : attributes.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">No attributes configured. Please add one first.</div>
                    ) : (
                        <Select
                            label="Attribute"
                            id="attribute-select"
                            value={selectedAttrId}
                            onChange={(e) => setSelectedAttrId(e.target.value)}
                            options={attributeOptions}
                        />
                    )}
                </div>

                {/* Terms Panel */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                                {activeAttribute ? `${activeAttribute.name} Terms` : 'Configure Terms'}
                            </h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                Add or remove specific options/tags.
                            </p>
                        </div>
                    </div>

                    {!selectedAttrId ? (
                        <div className="text-center py-12 text-slate-500 italic">
                            Select an attribute on the left to configure terms.
                        </div>
                    ) : loading ? (
                        <div className="text-center py-12 text-slate-550 font-semibold">
                            Loading terms...
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Add Term Form */}
                            <form onSubmit={handleAddTerm} className="flex gap-3 items-end bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                                <div className="flex-1">
                                    <Input
                                        label={`Add Term to ${activeAttribute?.name}`}
                                        id="new-term"
                                        value={newTerm}
                                        onChange={(e) => setNewTerm(e.target.value)}
                                        placeholder="e.g. RED, 16GB, Large"
                                        required
                                    />
                                </div>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    loading={submitting}
                                    icon={Plus}
                                    className="bg-purple-650 hover:bg-purple-700 text-white shrink-0 h-10 px-4"
                                >
                                    Add
                                </Button>
                            </form>

                            {/* Terms Tags list */}
                            <div className="space-y-3">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Configured Terms ({activeAttribute?.terms?.length || 0})
                                </label>
                                <div className="flex flex-wrap gap-2.5 min-h-[50px] p-4 bg-slate-950/20 border border-slate-850 rounded-xl">
                                    {activeAttribute?.terms && activeAttribute.terms.length > 0 ? (
                                        activeAttribute.terms.map(term => {
                                            // Optional: Render color dot for Color attribute
                                            const isColorAttr = activeAttribute.id === 'color';
                                            let colorDotStyle = null;
                                            if (isColorAttr) {
                                                const colors = {
                                                    red: '#ef4444',
                                                    'sage green': '#8fbc8f',
                                                    'amber glass': '#b5651d',
                                                    blue: '#3b82f6',
                                                    green: '#10b981',
                                                    yellow: '#f59e0b',
                                                    black: '#000000',
                                                    white: '#ffffff',
                                                    gray: '#6b7280',
                                                    pink: '#ec4899',
                                                    purple: '#a855f7',
                                                    orange: '#f97316'
                                                };
                                                const hex = colors[term.toLowerCase()] || '#6b7280';
                                                colorDotStyle = { backgroundColor: hex };
                                            }

                                            return (
                                                <span
                                                    key={term}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold animate-fade-in"
                                                >
                                                    {colorDotStyle && (
                                                        <span className="w-2.5 h-2.5 rounded-full border border-purple-500/20" style={colorDotStyle}></span>
                                                    )}
                                                    <span>{term}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteTerm(term)}
                                                        className="hover:text-rose-400 transition-colors ml-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs text-slate-650 italic flex items-center gap-1.5 pt-1.5">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>No terms configured for this attribute yet. Add one above!</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageWrapper>
    );
}
