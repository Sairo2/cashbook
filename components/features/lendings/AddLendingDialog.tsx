'use client';

import * as React from 'react';
import {
    Plus,
    Check,
    ArrowUpRight,
    ArrowDownLeft,
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
import { Transaction, Ledger } from '@/lib/supabase';

type MoneyDirection = 'gave' | 'got';
type LendingIntent = 'lent' | 'repaid' | 'received' | 'borrowed';

interface AddLendingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    direction: MoneyDirection;
    ledger: Ledger;
    onAdd: (data: Omit<Transaction, 'id' | 'created_at'>) => void;
    existingPeople?: string[];
}

export function AddLendingDialog({
    isOpen,
    onClose,
    direction,
    ledger,
    onAdd,
    existingPeople = [],
}: AddLendingDialogProps) {
    const [amount, setAmount] = React.useState('');
    const [person, setPerson] = React.useState('');
    const [newPerson, setNewPerson] = React.useState('');
    const [note, setNote] = React.useState('');
    const [showNewPerson, setShowNewPerson] = React.useState(false);

    // Intent: For "gave" → lent or repaid, For "got" → received or borrowed
    const [intent, setIntent] = React.useState<LendingIntent>(
        direction === 'gave' ? 'lent' : 'received'
    );

    // Reset intent when direction changes
    React.useEffect(() => {
        setIntent(direction === 'gave' ? 'lent' : 'received');
    }, [direction]);

    const isGave = direction === 'gave';

    const intentLabels = {
        lent: { title: 'Lent Money', subtitle: 'They owe you now', color: 'emerald' },
        repaid: { title: 'Repaid Debt', subtitle: 'You owed them', color: 'rose' },
        received: { title: 'Received Payment', subtitle: 'They owed you', color: 'emerald' },
        borrowed: { title: 'Borrowed Money', subtitle: 'You owe them now', color: 'rose' },
    };

    const currentIntent = intentLabels[intent];
    const isEmerald = currentIntent.color === 'emerald';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseFloat(amount);
        const amountNum = isNaN(parsed) ? 0 : parsed;
        if (amountNum <= 0) return;

        const personName = showNewPerson ? newPerson.trim() : person;
        if (!personName) return;

        const transactionType = isGave ? 'cash_out' : 'cash_in';

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

        onAdd({
            ledger_id: ledger.id,
            type: transactionType,
            amount: amountNum,
            title: note.trim() || titleMap[intent],
            category: categoryMap[intent],
            payment_mode: 'Cash',
            person: personName,
        });

        handleClose();
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

    return (
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
                            <span className="text-sm font-bold tracking-tight text-foreground uppercase">{currentIntent.title}</span>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {currentIntent.subtitle}
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Intent Toggle */}
                    <div className="flex bg-black/[0.02] border border-border rounded-xl p-0.5">
                        {isGave ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIntent('lent')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        intent === 'lent'
                                            ? 'bg-primary/15 text-primary border border-primary/15'
                                            : 'text-muted-foreground hover:text-foreground border border-transparent'
                                    }`}
                                >
                                    Lent (Owed to You)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIntent('repaid')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        intent === 'repaid'
                                            ? 'bg-destructive/15 text-destructive border border-destructive/15'
                                            : 'text-muted-foreground hover:text-foreground border border-transparent'
                                    }`}
                                >
                                    Repaid (You Owed)
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIntent('received')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        intent === 'received'
                                            ? 'bg-primary/15 text-primary border border-primary/15'
                                            : 'text-muted-foreground hover:text-foreground border border-transparent'
                                    }`}
                                >
                                    Received (Repaid to You)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIntent('borrowed')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        intent === 'borrowed'
                                            ? 'bg-destructive/15 text-destructive border border-destructive/15'
                                            : 'text-muted-foreground hover:text-foreground border border-transparent'
                                    }`}
                                >
                                    Borrowed (You Owe)
                                </button>
                            </>
                        )}
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
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    {/* Person Selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Person *</Label>
                            <span className="text-[9px] font-semibold text-muted-foreground/80">Select account target</span>
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
                                    Add New Person
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
                                        ← Select from existing contacts
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
                    <div className="pt-2 flex gap-3">
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
                            disabled={!isValid}
                            className={`flex-1 h-11 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md active:scale-98 transition-all ${
                                isEmerald
                                    ? 'cash-in-gradient hover:opacity-95 shadow-primary/10'
                                    : 'cash-out-gradient hover:opacity-95 shadow-destructive/10'
                            }`}
                        >
                            Record Lending
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
