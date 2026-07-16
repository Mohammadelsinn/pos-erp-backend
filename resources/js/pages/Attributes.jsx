import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Settings, AlertCircle } from 'lucide-react';
import PageWrapper from '../components/PageWrapper';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { Input } from '../components/FormControls';

export default function Attributes() {
    const [attributes, setAttributes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [attrName, setAttrName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const fetchAttributes = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/settings');
            if (response.data.product_attributes) {
                setAttributes(JSON.parse(response.data.product_attributes));
            } else {
                const defaults = [
                    { id: 'capacity', name: 'Capacity', terms: [] },
                    { id: 'color', name: 'Color', terms: ['Red', 'Sage Green', 'Amber Glass'] },
                    { id: 'material', name: 'Material', terms: ['S'] },
                    { id: 'size', name: 'Size', terms: [] }
                ];
                setAttributes(defaults);
                await axios.put('/api/settings', { product_attributes: JSON.stringify(defaults) });
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

    const handleAddAttribute = async (e) => {
        e.preventDefault();
        if (!attrName.trim()) return;

        const cleanName = attrName.trim();
        const id = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        if (attributes.some(attr => attr.id === id)) {
            alert('An attribute with this name or ID already exists.');
            return;
        }

        setSubmitting(true);
        const updated = [...attributes, { id, name: cleanName, terms: [] }];
        try {
            await axios.put('/api/settings', { product_attributes: JSON.stringify(updated) });
            setAttributes(updated);
            setAttrName('');
            setModalOpen(false);
        } catch (err) {
            console.error('Failed to save attribute', err);
            alert('Failed to save attribute.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAttribute = async (id) => {
        if (!confirm('Are you sure you want to delete this attribute and all its terms? This will not affect existing variations but prevents generating new ones with this attribute.')) {
            return;
        }

        const updated = attributes.filter(attr => attr.id !== id);
        try {
            await axios.put('/api/settings', { product_attributes: JSON.stringify(updated) });
            setAttributes(updated);
        } catch (err) {
            console.error('Failed to delete attribute', err);
            alert('Failed to delete attribute.');
        }
    };

    return (
        <PageWrapper title="Attributes" subtitle="create and manage variation attributes used by products">
            <div className="mb-6 flex justify-between items-center">
                <Button
                    variant="primary"
                    icon={Plus}
                    onClick={() => setModalOpen(true)}
                    className="bg-purple-650 hover:bg-purple-700 text-white border-transparent"
                >
                    Add Attribute
                </Button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-5 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Attribute List</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-550 font-semibold">Loading attributes...</div>
                ) : attributes.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-slate-650 mb-2" />
                        <span>No attributes configured yet.</span>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800/60">
                        {attributes.map(attr => (
                            <div key={attr.id} className="p-5 flex items-center justify-between hover:bg-slate-950/20 transition-colors">
                                <div>
                                    <h4 className="font-bold text-slate-100 text-sm sm:text-base">{attr.name}</h4>
                                    <span className="text-[10px] text-slate-350 font-mono">ID: {attr.id} | Terms: {attr.terms?.length || 0}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <button
                                        onClick={() => navigate(`/terms?attributeId=${attr.id}`)}
                                        className="px-3.5 py-1.5 border border-purple-500/30 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 text-xs font-bold rounded-xl transition-all"
                                    >
                                        Configure Terms
                                    </button>
                                    <button
                                        onClick={() => handleDeleteAttribute(attr.id)}
                                        className="px-3 py-1.5 border border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-xs font-bold rounded-xl transition-all"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Add New Attribute"
            >
                <form onSubmit={handleAddAttribute} className="space-y-4">
                    <Input
                        label="Attribute Name"
                        id="attr-name"
                        value={attrName}
                        onChange={(e) => setAttrName(e.target.value)}
                        placeholder="e.g. Size, Color, Brand"
                        required
                        autoFocus
                    />
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                        <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            loading={submitting}
                            className="bg-purple-655 hover:bg-purple-700 text-white"
                        >
                            Add Attribute
                        </Button>
                    </div>
                </form>
            </Modal>
        </PageWrapper>
    );
}
