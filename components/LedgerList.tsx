'use client';

import * as React from 'react';
import { Book, Plus, ChevronRight, Wallet, Send } from 'lucide-react';
import { Ledger, DEFAULT_CATEGORIES, DEFAULT_PAYMENT_MODES } from '@/lib/supabase';
import { getLedgers, createLedger } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddLedgerDialog } from './AddLedgerDialog';
import { TelegramLinkCard } from './TelegramLinkCard';

const LENDINGS_LEDGER_NAME = 'LENDINGS';

interface LedgerListProps {
    onSelectLedger: (ledger: Ledger) => void;
    userId: string;
}

export function LedgerList({ onSelectLedger, userId }: LedgerListProps) {
    const [ledgers, setLedgers] = React.useState<Ledger[]>([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        loadLedgers();
    }, [userId]);

    const loadLedgers = async () => {
        setLoading(true);
        const storedLedgers = await getLedgers(userId);
        setLedgers(storedLedgers);
        setLoading(false);
    };

    const handleAddLedger = async (name: string, categories: string[], paymentModes: string[]) => {
        const newLedger = await createLedger(name, categories, paymentModes, userId);
        if (newLedger) {
            setLedgers([newLedger, ...ledgers]);
        }
        setIsDialogOpen(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground text-sm">Loading ledgers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <div className="px-4 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-primary/20">
                        <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">
                        My Ledgers
                    </h1>
                </div>
                <p className="text-muted-foreground text-sm">
                    Manage your expense ledgers
                </p>
            </div>

            {/* Ledger Grid */}
            <div className="px-4 space-y-3">
                {ledgers.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="bg-accent/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Book className="h-10 w-10 opacity-30" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">No Ledgers Yet</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            Create your first ledger to start tracking expenses
                        </p>
                        <Button
                            onClick={() => setIsDialogOpen(true)}
                            className="cash-in-gradient hover:opacity-90"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Create Ledger
                        </Button>
                    </div>
                ) : (
                    <>
                        {ledgers.map((ledger, index) => {
                            const isLendingsLedger = ledger.name === LENDINGS_LEDGER_NAME;

                            return (
                                <Card
                                    key={ledger.id}
                                    className={`cursor-pointer transition-all active:scale-[0.98] animate-slide-up border ${isLendingsLedger
                                        ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                                        : 'border-border hover:bg-accent/50'
                                        }`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    onClick={() => onSelectLedger(ledger)}
                                >
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isLendingsLedger
                                                ? 'bg-emerald-500/20'
                                                : 'bg-primary/10'
                                                }`}>
                                                {isLendingsLedger ? (
                                                    <Send className="h-5 w-5 text-emerald-500" />
                                                ) : (
                                                    <Book className="h-5 w-5 text-primary" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{ledger.name}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {isLendingsLedger
                                                        ? 'Telegram-linked lending tracker'
                                                        : `${ledger.categories?.length || 0} categories · ${ledger.payment_modes?.length || 0} modes`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {/* Telegram Link Section */}
                        <div className="pt-6 pb-4">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-px flex-1 bg-border" />
                                <span className="text-xs text-muted-foreground uppercase tracking-wide">Quick Add via Telegram</span>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <TelegramLinkCard />
                        </div>
                    </>
                )}
            </div>

            {/* Floating Add Button */}
            {ledgers.length > 0 && (
                <div className="fixed bottom-6 right-4 left-4 max-w-[448px] mx-auto">
                    <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="w-full h-14 text-lg font-semibold cash-in-gradient hover:opacity-90 shadow-lg shadow-primary/20"
                    >
                        <Plus className="mr-2 h-6 w-6" />
                        Add Ledger
                    </Button>
                </div>
            )}

            <AddLedgerDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onAdd={handleAddLedger}
            />
        </div>
    );
}
