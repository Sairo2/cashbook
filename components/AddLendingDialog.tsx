'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
    User,
    Calendar,
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
        lent: { title: 'Lent Money', subtitle: 'They will owe you', color: 'emerald' },
        repaid: { title: 'Repaid Debt', subtitle: 'You owed them', color: 'rose' },
        received: { title: 'Received Payment', subtitle: 'They owed you', color: 'emerald' },
        borrowed: { title: 'Borrowed Money', subtitle: 'You will owe them', color: 'rose' },
    };

    const currentIntent = intentLabels[intent];
    const isEmerald = currentIntent.color === 'emerald';

    const handleSubmit = () => {
        const amountNum = parseFloat(amount);
        if (!amountNum || amountNum <= 0) return;

        const personName = showNewPerson ? newPerson.trim() : person;
        if (!personName) return;

        // Determine transaction type based on intent
        // Lent/Repaid = money going out (cash_out)
        // Received/Borrowed = money coming in (cash_in)
        const transactionType = isGave ? 'cash_out' : 'cash_in';

        // For balance calculation:
        // Lent (cash_out) → they owe me more (+)
        // Repaid (cash_out) → I owe them less, so record as cash_out to them
        // Received (cash_in) → they owe me less
        // Borrowed (cash_in) → I owe them more

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

        // Reset form
        setAmount('');
        setPerson('');
        setNewPerson('');
        setNote('');
        setShowNewPerson(false);
        onClose();
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

    return (
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
                            <span className="text-base">{currentIntent.title}</span>
                            <p className="text-xs font-normal text-muted-foreground mt-0.5">
                                {currentIntent.subtitle}
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="p-4 space-y-4">
                    {/* Intent Toggle */}
                    <div className="flex rounded-lg bg-accent/30 p-1">
                        {isGave ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIntent('lent')}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${intent === 'lent'
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Lent
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIntent('repaid')}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${intent === 'repaid'
                                            ? 'bg-rose-500 text-white shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Repaid
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIntent('received')}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${intent === 'received'
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Received
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIntent('borrowed')}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${intent === 'borrowed'
                                            ? 'bg-rose-500 text-white shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Borrowed
                                </button>
                            </>
                        )}
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
                                autoFocus
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
                        onClick={handleClose}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid}
                        className={`flex-1 ${isEmerald
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : 'bg-rose-500 hover:bg-rose-600 text-white'
                            }`}
                    >
                        Record
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
