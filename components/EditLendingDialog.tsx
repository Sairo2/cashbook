'use client';

import * as React from 'react';
import {
    Plus,
    Check,
    ArrowUpRight,
    ArrowDownLeft,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Transaction, Ledger } from '@/lib/supabase';
import { updateTransaction, deleteTransaction } from '@/lib/store';

type LendingIntent = 'lent' | 'repaid' | 'received' | 'borrowed';

interface EditLendingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    ledger: Ledger;
    onTransactionUpdated: (transaction: Transaction) => void;
    onTransactionDeleted: (transactionId: string) => void;
    existingPeople?: string[];
}

export function EditLendingDialog({
    isOpen,
    onClose,
    transaction,
    onTransactionUpdated,
    onTransactionDeleted,
    existingPeople = [],
}: EditLendingDialogProps) {
    const [amount, setAmount] = React.useState('');
    const [person, setPerson] = React.useState('');
    const [newPerson, setNewPerson] = React.useState('');
    const [note, setNote] = React.useState('');
    const [showNewPerson, setShowNewPerson] = React.useState(false);
    const [intent, setIntent] = React.useState<LendingIntent>('lent');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    // Initialize form when transaction changes
    React.useEffect(() => {
        if (transaction) {
            setAmount(transaction.amount.toString());
            setNote(transaction.title || '');

            // Fix Medium Bug #15: Check if transaction.person is in existingPeople.
            // If it is NOT, we must automatically show the custom text field and prefill it.
            const tPerson = transaction.person || '';
            const exists = existingPeople.some(p => p.toLowerCase() === tPerson.toLowerCase());

            if (exists) {
                setPerson(tPerson);
                setShowNewPerson(false);
                setNewPerson('');
            } else {
                setPerson('');
                setShowNewPerson(true);
                setNewPerson(tPerson);
            }

            // Determine intent from transaction type and category
            const category = transaction.category?.toLowerCase() || '';
            if (transaction.type === 'cash_out') {
                setIntent(category.includes('repay') ? 'repaid' : 'lent');
            } else {
                setIntent(category.includes('borrow') ? 'borrowed' : 'received');
            }
        }
    }, [transaction, existingPeople]);

    const isGave = intent === 'lent' || intent === 'repaid';

    const intentLabels = {
        lent: { title: 'Lent Money', subtitle: 'They owe you now', color: 'emerald' },
        repaid: { title: 'Repaid Debt', subtitle: 'You owed them', color: 'rose' },
        received: { title: 'Received Payment', subtitle: 'They owed you', color: 'emerald' },
        borrowed: { title: 'Borrowed Money', subtitle: 'You owe them now', color: 'rose' },
    };

    const currentIntent = intentLabels[intent];
    const isEmerald = currentIntent.color === 'emerald';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transaction) return;

        const parsed = parseFloat(amount);
        const amountNum = isNaN(parsed) ? 0 : parsed;
        if (amountNum <= 0) return;

        const personName = showNewPerson ? newPerson.trim() : person;
        if (!personName) return;

        setIsSaving(true);

        const transactionType = (intent === 'lent' || intent === 'repaid') ? 'cash_out' : 'cash_in';

        const titleMap = {
            lent: `Lent to ${personName}`,
            repaid: `Repaid to ${personName}`,
            received: `Received from ${personName}`,
            borrowed: `Borrowed from ${personName}`,
        };

        const categoryMap = {
            lent: 'Lending',
            repaid: 'Repayment',
            received: 'Repayment',
            borrowed: 'Borrowing',
        };

        const updated = await updateTransaction(transaction.id, {
            type: transactionType,
            amount: amountNum,
            title: note.trim() || titleMap[intent],
            category: categoryMap[intent],
            person: personName,
        });

        if (updated) {
            onTransactionUpdated(updated);
            handleClose();
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!transaction) return;

        setIsDeleting(true);
        const success = await deleteTransaction(transaction.id);
        if (success) {
            onTransactionDeleted(transaction.id);
            setIsDeleteDialogOpen(false);
            handleClose();
        }
        setIsDeleting(false);
    };

    const handleClose = () => {
        setAmount('');
        setPerson('');
        setNewPerson('');
        setNote('');
        setShowNewPerson(false);
        onClose();
    };

    const parsedAmount = parseFloat(amount);
    const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && (showNewPerson ? newPerson.trim() : person);

    if (!transaction) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-[92vw] sm:max-w-md max-h-[85vh] overflow-y-auto surface-card-elevated border-border rounded-2xl p-5 gap-0">
                    <DialogHeader className={`p-4 rounded-xl border mb-5 ${
                        isEmerald 
                            ? 'bg-primary/[0.05] border-primary/20' 
                            : 'bg-destructive/[0.05] border-destructive/20'
                    }`}>
                        <DialogTitle className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg border ${
                                isEmerald 
                                    ? 'bg-primary/10 border-primary/20 text-primary' 
                                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                            }`}>
                                {isGave ? (
                                    <ArrowUpRight className="h-4 w-4" />
                                ) : (
                                    <ArrowDownLeft className="h-4 w-4" />
                                )}
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-sm font-bold tracking-tight text-foreground uppercase">Edit Debt Record</span>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {currentIntent.subtitle}
                                </p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Intent Toggle */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Transaction Category</Label>
                            <div className="grid grid-cols-4 gap-0.5 bg-black/[0.02] border border-border rounded-xl p-0.5">
                                {(['lent', 'received', 'repaid', 'borrowed'] as LendingIntent[]).map((i) => {
                                    const active = intent === i;
                                    const emeraldType = intentLabels[i].color === 'emerald';
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setIntent(i)}
                                            className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                active
                                                    ? emeraldType
                                                        ? 'bg-primary/15 text-primary border border-primary/10 shadow-sm'
                                                        : 'bg-destructive/15 text-destructive border border-destructive/10 shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                                            }`}
                                        >
                                            {i}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount *</Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-8 text-base font-black h-11 surface-card border border-border focus-visible:ring-1 focus-visible:ring-primary/45 rounded-xl"
                                    required
                                />
                            </div>
                        </div>

                        {/* Person Selection */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Person *</Label>
                                <span className="text-[9px] font-semibold text-muted-foreground/80">Account contact</span>
                            </div>

                            {existingPeople.length > 0 && !showNewPerson && (
                                <div className="flex flex-wrap gap-2.5 p-3 rounded-xl border border-border bg-black/[0.01]">
                                    {existingPeople.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPerson(p)}
                                            className={`pill text-[10px] font-bold ${person === p ? 'selected' : ''}`}
                                        >
                                            {person === p && <Check className="h-3 w-3 mr-1" />}
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNewPerson(true);
                                            setPerson('');
                                        }}
                                        className="pill add-new text-[10px]"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Custom
                                    </button>
                                </div>
                            )}

                            {(showNewPerson || existingPeople.length === 0) && (
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Enter person's name"
                                        value={newPerson}
                                        onChange={(e) => setNewPerson(e.target.value)}
                                        className="text-xs h-11 surface-card border border-border focus-visible:ring-1 focus-visible:ring-primary/45 rounded-xl font-medium"
                                        required
                                    />
                                    {existingPeople.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowNewPerson(false);
                                                setNewPerson('');
                                            }}
                                            className="text-[9px] font-bold text-primary hover:underline"
                                        >
                                            ← Select from contacts
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Note */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Note <span className="text-muted-foreground/60 text-[9px] font-semibold">(optional)</span></Label>
                            <Input
                                placeholder="Add brief details/description..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="text-xs h-11 surface-card border border-border focus-visible:ring-1 focus-visible:ring-primary/45 rounded-xl font-medium"
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="h-11 px-3 text-destructive border-destructive/20 hover:bg-destructive/10 rounded-xl"
                                aria-label="Delete transaction"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                className="flex-1 h-11 text-xs font-bold uppercase tracking-wider rounded-xl bg-muted border-border hover:bg-accent"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!isValid || isSaving}
                                className={`flex-[1.5] h-11 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md active:scale-98 transition-all ${
                                    isEmerald
                                        ? 'cash-in-gradient hover:opacity-95 shadow-primary/10'
                                        : 'cash-out-gradient hover:opacity-95 shadow-destructive/10'
                                }`}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl surface-card-elevated border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold">Delete Transaction</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Are you sure you want to permanently delete this lending transaction? This will update the contact&apos;s outstanding balance, and this action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 sm:gap-0 mt-3">
                        <AlertDialogCancel className="flex-1 mt-0 text-xs py-2 rounded-xl bg-muted border-border hover:bg-accent">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs py-2 rounded-xl shadow-md active:scale-98"
                        >
                            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
