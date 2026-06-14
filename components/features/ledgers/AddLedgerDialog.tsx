'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_MODES, Ledger } from '@/lib/supabase';

interface AddLedgerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string, categories: string[], paymentModes: string[]) => void;
    editLedger?: Ledger | null;
}

export function AddLedgerDialog({ isOpen, onClose, onAdd, editLedger }: AddLedgerDialogProps) {
    const [name, setName] = React.useState('');
    const [categories, setCategories] = React.useState<string[]>(DEFAULT_CATEGORIES);
    const [paymentModes, setPaymentModes] = React.useState<string[]>(DEFAULT_PAYMENT_MODES);
    const [newCategory, setNewCategory] = React.useState('');
    const [newPaymentMode, setNewPaymentMode] = React.useState('');
    const [showAddCategory, setShowAddCategory] = React.useState(false);
    const [showAddPaymentMode, setShowAddPaymentMode] = React.useState(false);

    const isEditMode = !!editLedger;

    const resetForm = () => {
        setName('');
        setCategories(DEFAULT_CATEGORIES);
        setPaymentModes(DEFAULT_PAYMENT_MODES);
        setNewCategory('');
        setNewPaymentMode('');
        setShowAddCategory(false);
        setShowAddPaymentMode(false);
    };

    // Populate form when editing
    React.useEffect(() => {
        if (editLedger) {
            setName(editLedger.name);
            setCategories(editLedger.categories || DEFAULT_CATEGORIES);
            setPaymentModes(editLedger.payment_modes || DEFAULT_PAYMENT_MODES);
        } else {
            resetForm();
        }
    }, [editLedger, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim(), categories, paymentModes);
        resetForm();
    };

    const toggleCategory = (category: string) => {
        if (categories.includes(category)) {
            setCategories(prev => prev.filter(c => c !== category));
        } else {
            setCategories(prev => [...prev, category]);
        }
    };

    const togglePaymentMode = (mode: string) => {
        if (paymentModes.includes(mode)) {
            setPaymentModes(prev => prev.filter(m => m !== mode));
        } else {
            setPaymentModes(prev => [...prev, mode]);
        }
    };

    const addNewCategory = () => {
        const trimmed = newCategory.trim();
        if (trimmed) {
            const lowerCategories = categories.map(c => c.toLowerCase());
            if (!lowerCategories.includes(trimmed.toLowerCase())) {
                setCategories(prev => [...prev, trimmed]);
            }
            setNewCategory('');
            setShowAddCategory(false);
        }
    };

    const addNewPaymentMode = () => {
        const trimmed = newPaymentMode.trim();
        if (trimmed) {
            const lowerModes = paymentModes.map(m => m.toLowerCase());
            if (!lowerModes.includes(trimmed.toLowerCase())) {
                setPaymentModes(prev => [...prev, trimmed]);
            }
            setNewPaymentMode('');
            setShowAddPaymentMode(false);
        }
    };

    // Get all unique categories including custom ones from edit mode
    const allCategories = React.useMemo(() => {
        const customCategories = categories.filter(c => !DEFAULT_CATEGORIES.includes(c));
        return [...DEFAULT_CATEGORIES, ...customCategories];
    }, [categories]);

    // Get all unique payment modes including custom ones from edit mode
    const allPaymentModes = React.useMemo(() => {
        const customModes = paymentModes.filter(m => !DEFAULT_PAYMENT_MODES.includes(m));
        return [...DEFAULT_PAYMENT_MODES, ...customModes];
    }, [paymentModes]);

    return (
        <Dialog open={isOpen} onOpenChange={() => { onClose(); resetForm(); }}>
            <DialogContent className="max-w-[92vw] sm:max-w-md max-h-[85vh] overflow-y-auto surface-card-elevated border-border rounded-2xl p-5">
                <DialogHeader className="pb-3 border-b border-border">
                    <DialogTitle className="text-base font-black tracking-tight text-foreground uppercase">
                        {isEditMode ? 'Edit Ledger Details' : 'Create New Ledger'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="ledger-name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ledger Name</Label>
                        <Input
                            id="ledger-name"
                            placeholder="e.g., Personal, Business, Shared Room"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="text-xs h-11 surface-card border border-border focus-visible:ring-1 focus-visible:ring-primary/45 rounded-xl placeholder:text-muted-foreground/60 font-medium"
                        />
                    </div>

                    {/* Categories Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Categories</Label>
                            <span className="text-[9px] font-semibold text-muted-foreground/80">Configure transactions tags</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5 p-3 rounded-xl border border-border bg-black/[0.01]">
                            {allCategories.map((category) => (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => toggleCategory(category)}
                                    className={`pill text-[10px] font-bold ${categories.includes(category) ? 'selected' : ''}`}
                                >
                                    {category}
                                    {!DEFAULT_CATEGORIES.includes(category) && categories.includes(category) && (
                                        <X className="h-3 w-3 ml-1 text-primary-foreground/75" />
                                    )}
                                </button>
                            ))}
                            {showAddCategory ? (
                                <div className="flex gap-1.5 items-center">
                                    <Input
                                        placeholder="Category..."
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className="h-7 w-24 text-[10px] font-bold bg-background/50 border-border rounded-lg p-1.5 focus-visible:ring-0"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewCategory())}
                                        autoFocus
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        onClick={addNewCategory}
                                        className="h-7 w-7 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowAddCategory(true)}
                                    className="pill add-new text-[10px]"
                                >
                                    <Plus className="h-3 w-3" />
                                    Add Custom
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Payment Modes Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Payment Methods</Label>
                            <span className="text-[9px] font-semibold text-muted-foreground/80">Configure tracking sources</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5 p-3 rounded-xl border border-border bg-black/[0.01]">
                            {allPaymentModes.map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => togglePaymentMode(mode)}
                                    className={`pill text-[10px] font-bold ${paymentModes.includes(mode) ? 'selected' : ''}`}
                                >
                                    {mode}
                                    {!DEFAULT_PAYMENT_MODES.includes(mode) && paymentModes.includes(mode) && (
                                        <X className="h-3 w-3 ml-1 text-primary-foreground/75" />
                                    )}
                                </button>
                            ))}
                            {showAddPaymentMode ? (
                                <div className="flex gap-1.5 items-center">
                                    <Input
                                        placeholder="Mode..."
                                        value={newPaymentMode}
                                        onChange={(e) => setNewPaymentMode(e.target.value)}
                                        className="h-7 w-24 text-[10px] font-bold bg-background/50 border-border rounded-lg p-1.5 focus-visible:ring-0"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewPaymentMode())}
                                        autoFocus
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        onClick={addNewPaymentMode}
                                        className="h-7 w-7 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowAddPaymentMode(true)}
                                    className="pill add-new text-[10px]"
                                >
                                    <Plus className="h-3 w-3" />
                                    Add Custom
                                </button>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="submit"
                            className="w-full h-11 text-xs font-bold uppercase tracking-wider cash-in-gradient hover:opacity-95 active:scale-98 transition-all rounded-xl shadow-md shadow-primary/10"
                            disabled={!name.trim()}
                        >
                            {isEditMode ? 'Update Ledger Config' : 'Create Ledger'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
