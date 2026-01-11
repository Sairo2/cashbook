'use client';

import * as React from 'react';
import {
    User,
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
    ledger,
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
            setPerson(transaction.person || '');
            setNote(transaction.title || '');

            // Determine intent from transaction
            const category = transaction.category?.toLowerCase() || '';
            if (transaction.type === 'cash_out') {
                setIntent(category.includes('repay') ? 'repaid' : 'lent');
            } else {
                setIntent(category.includes('borrow') ? 'borrowed' : 'received');
            }
        }
    }, [transaction]);

    const isGave = intent === 'lent' || intent === 'repaid';

    const intentLabels = {
        lent: { title: 'Lent Money', subtitle: 'They will owe you', color: 'emerald' },
        repaid: { title: 'Repaid Debt', subtitle: 'You owed them', color: 'rose' },
        received: { title: 'Received Payment', subtitle: 'They owed you', color: 'emerald' },
        borrowed: { title: 'Borrowed Money', subtitle: 'You will owe them', color: 'rose' },
    };

    const currentIntent = intentLabels[intent];
    const isEmerald = currentIntent.color === 'emerald';

    const handleSubmit = async () => {
        if (!transaction) return;

        const amountNum = parseFloat(amount);
        if (!amountNum || amountNum <= 0) return;

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

    const isValid = parseFloat(amount) > 0 && (showNewPerson ? newPerson.trim() : person);

    if (!transaction) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl p-0 gap-0">
                    <DialogHeader className={`p-4 pb-3 border-b border-border ${isEmerald ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                        }`}>
                        <DialogTitle className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isEmerald ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                                }`}>
                                {isGave ? (
                                    <ArrowUpRight className={`h-4 w-4 ${isEmerald ? 'text-emerald-500' : 'text-rose-500'}`} />
                                ) : (
                                    <ArrowDownLeft className={`h-4 w-4 ${isEmerald ? 'text-emerald-500' : 'text-rose-500'}`} />
                                )}
                            </div>
                            <div>
                                <span className="text-base">Edit Transaction</span>
                                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                                    {currentIntent.subtitle}
                                </p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-4 space-y-4">
                        {/* Intent Toggle */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Transaction Type</Label>
                            <div className="grid grid-cols-4 gap-1 rounded-lg bg-accent/30 p-1">
                                {(['lent', 'received', 'repaid', 'borrowed'] as LendingIntent[]).map((i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setIntent(i)}
                                        className={`py-2 px-2 rounded-md text-xs font-medium transition-all ${intent === i
                                                ? intentLabels[i].color === 'emerald'
                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                    : 'bg-rose-500 text-white shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {i.charAt(0).toUpperCase() + i.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <Label>Amount *</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-8 text-xl font-semibold h-12"
                                />
                            </div>
                        </div>

                        {/* Person Selection */}
                        <div className="space-y-2">
                            <Label>Person *</Label>

                            {existingPeople.length > 0 && !showNewPerson && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {existingPeople.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPerson(p)}
                                            className={`px-3 py-1.5 rounded-full text-sm transition-all ${person === p
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-accent/50 text-foreground hover:bg-accent'
                                                }`}
                                        >
                                            {person === p && <Check className="inline h-3 w-3 mr-1" />}
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNewPerson(true);
                                            setPerson('');
                                        }}
                                        className="px-3 py-1.5 rounded-full text-sm bg-transparent border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary transition-all"
                                    >
                                        <Plus className="inline h-3 w-3 mr-1" />
                                        New
                                    </button>
                                </div>
                            )}

                            {(showNewPerson || existingPeople.length === 0) && (
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Enter person's name"
                                        value={newPerson}
                                        onChange={(e) => setNewPerson(e.target.value)}
                                    />
                                    {existingPeople.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowNewPerson(false);
                                                setNewPerson('');
                                            }}
                                            className="text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            ← Select existing person
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Note */}
                        <div className="space-y-2">
                            <Label>Note <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <Input
                                placeholder="What's this for?"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 pt-0 flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!isValid || isSaving}
                            className={`flex-1 ${isEmerald
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                    : 'bg-rose-500 hover:bg-rose-600 text-white'
                                }`}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this transaction? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2">
                        <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
