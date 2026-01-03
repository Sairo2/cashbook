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
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_MODES } from '@/lib/supabase';

interface AddLedgerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string, categories: string[], paymentModes: string[]) => void;
}

export function AddLedgerDialog({ isOpen, onClose, onAdd }: AddLedgerDialogProps) {
    const [name, setName] = React.useState('');
    const [categories, setCategories] = React.useState<string[]>(DEFAULT_CATEGORIES);
    const [paymentModes, setPaymentModes] = React.useState<string[]>(DEFAULT_PAYMENT_MODES);
    const [newCategory, setNewCategory] = React.useState('');
    const [newPaymentMode, setNewPaymentMode] = React.useState('');
    const [showAddCategory, setShowAddCategory] = React.useState(false);
    const [showAddPaymentMode, setShowAddPaymentMode] = React.useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim(), categories, paymentModes);
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setCategories(DEFAULT_CATEGORIES);
        setPaymentModes(DEFAULT_PAYMENT_MODES);
        setNewCategory('');
        setNewPaymentMode('');
        setShowAddCategory(false);
        setShowAddPaymentMode(false);
    };

    const toggleCategory = (category: string) => {
        if (categories.includes(category)) {
            setCategories(categories.filter(c => c !== category));
        } else {
            setCategories([...categories, category]);
        }
    };

    const togglePaymentMode = (mode: string) => {
        if (paymentModes.includes(mode)) {
            setPaymentModes(paymentModes.filter(m => m !== mode));
        } else {
            setPaymentModes([...paymentModes, mode]);
        }
    };

    const addNewCategory = () => {
        if (newCategory.trim() && !categories.includes(newCategory.trim())) {
            setCategories([...categories, newCategory.trim()]);
            setNewCategory('');
            setShowAddCategory(false);
        }
    };

    const addNewPaymentMode = () => {
        if (newPaymentMode.trim() && !paymentModes.includes(newPaymentMode.trim())) {
            setPaymentModes([...paymentModes, newPaymentMode.trim()]);
            setNewPaymentMode('');
            setShowAddPaymentMode(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { onClose(); resetForm(); }}>
            <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">Create New Ledger</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="ledger-name">Ledger Name</Label>
                        <Input
                            id="ledger-name"
                            placeholder="e.g. Personal, Business, Family"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="text-lg h-12"
                        />
                    </div>

                    {/* Categories Section */}
                    <div className="space-y-3">
                        <Label>Categories</Label>
                        <p className="text-xs text-muted-foreground -mt-1">
                            Select the categories for this ledger
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {DEFAULT_CATEGORIES.map((category) => (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => toggleCategory(category)}
                                    className={`pill ${categories.includes(category) ? 'selected' : ''}`}
                                >
                                    {category}
                                </button>
                            ))}
                            {categories
                                .filter(c => !DEFAULT_CATEGORIES.includes(c))
                                .map((category) => (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() => toggleCategory(category)}
                                        className="pill selected"
                                    >
                                        {category}
                                        <X className="h-3 w-3 ml-1" />
                                    </button>
                                ))}
                            {showAddCategory ? (
                                <div className="flex gap-2 items-center">
                                    <Input
                                        placeholder="New category"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className="h-8 w-32 text-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewCategory())}
                                        autoFocus
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={addNewCategory}
                                        className="h-8 px-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowAddCategory(true)}
                                    className="pill add-new"
                                >
                                    <Plus className="h-3 w-3" />
                                    Add New
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Payment Modes Section */}
                    <div className="space-y-3">
                        <Label>Payment Modes</Label>
                        <p className="text-xs text-muted-foreground -mt-1">
                            Select the payment modes for this ledger
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {DEFAULT_PAYMENT_MODES.map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => togglePaymentMode(mode)}
                                    className={`pill ${paymentModes.includes(mode) ? 'selected' : ''}`}
                                >
                                    {mode}
                                </button>
                            ))}
                            {paymentModes
                                .filter(m => !DEFAULT_PAYMENT_MODES.includes(m))
                                .map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => togglePaymentMode(mode)}
                                        className="pill selected"
                                    >
                                        {mode}
                                        <X className="h-3 w-3 ml-1" />
                                    </button>
                                ))}
                            {showAddPaymentMode ? (
                                <div className="flex gap-2 items-center">
                                    <Input
                                        placeholder="New mode"
                                        value={newPaymentMode}
                                        onChange={(e) => setNewPaymentMode(e.target.value)}
                                        className="h-8 w-32 text-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewPaymentMode())}
                                        autoFocus
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={addNewPaymentMode}
                                        className="h-8 px-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowAddPaymentMode(true)}
                                    className="pill add-new"
                                >
                                    <Plus className="h-3 w-3" />
                                    Add New
                                </button>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-semibold cash-in-gradient hover:opacity-90"
                            disabled={!name.trim()}
                        >
                            Create Ledger
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
