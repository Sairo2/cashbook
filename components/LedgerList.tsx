'use client';

import * as React from 'react';
import { Book, Plus, ChevronRight, Wallet, Send } from 'lucide-react';
import { Ledger } from '@/lib/supabase';
import { getLedgers, createLedger } from '@/lib/store';
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

    const loadLedgers = React.useCallback(async () => {
        setLoading(true);
        const storedLedgers = await getLedgers(userId);
        setLedgers(storedLedgers);
        setLoading(false);
    }, [userId]);

    React.useEffect(() => {
        loadLedgers();
    }, [loadLedgers]);

    const handleAddLedger = async (name: string, categories: string[], paymentModes: string[]) => {
        const newLedger = await createLedger(name, categories, paymentModes, userId);
        if (newLedger) {
            setLedgers(prev => [newLedger, ...prev]);
        }
        setIsDialogOpen(false);
    };

    const telegramLedger = ledgers.find(ledger => ledger.name === LENDINGS_LEDGER_NAME);
    const regularLedgers = ledgers.filter(ledger => ledger.name !== LENDINGS_LEDGER_NAME);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
                <div className="relative flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/15 border-t-primary"></div>
                </div>
                <p className="text-muted-foreground text-sm mt-4 font-medium">Opening your books...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-32 page-enter">
            <header className="px-4 pt-8 pb-6 flex items-end justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-primary">
                        <Wallet className="h-3.5 w-3.5" />
                        <span>{regularLedgers.length} ledger{regularLedgers.length === 1 ? '' : 's'}</span>
                    </div>
                    <h1 className="font-display text-[2.25rem] leading-none text-foreground">
                        My Ledgers
                    </h1>
                </div>
                <Button
                    onClick={() => setIsDialogOpen(true)}
                    size="icon"
                    className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90 active:scale-95 transition-transform shadow-lg shadow-black/10"
                    aria-label="Create new ledger"
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </header>

            <section className="space-y-6">
                {telegramLedger && (
                    <div className="space-y-2.5">
                        <div className="mx-4 overflow-hidden rounded-[1.45rem] border border-primary/20 bg-card shadow-[0_1px_0_rgba(255,255,255,0.86)_inset,0_12px_28px_rgba(41,35,26,0.055)]">
                            <div
                                className="group flex min-h-[84px] cursor-pointer items-center justify-between gap-3.5 px-4 py-3 transition-colors hover:bg-accent/45 active:bg-accent/65 animate-slide-up"
                                onClick={() => onSelectLedger(telegramLedger)}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="shrink-0 flex h-6 w-6 items-center justify-center text-primary">
                                        <Send className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-0.5 min-w-0">
                                        <h3 className="font-extrabold text-sm leading-tight tracking-tight">Telegram Lendings</h3>
                                        <p className="text-xs text-muted-foreground truncate">
                                            Lending tracker
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/55 transition-transform group-hover:translate-x-0.5" />
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="px-4">
                        <h2 className="text-sm font-extrabold text-foreground">Ledgers</h2>
                    </div>

                    {regularLedgers.length === 0 ? (
                        <div className="mx-4 text-center py-14 px-5 surface-card rounded-[1.35rem]">
                            <div className="bg-accent border border-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Book className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="text-lg font-extrabold tracking-tight mb-1">Start with one ledger</h3>
                            <p className="text-muted-foreground text-xs leading-5 max-w-[280px] mx-auto mb-6">
                                Create a separate ledger for expenses, income, projects, or shared books.
                            </p>
                            <Button
                                onClick={() => setIsDialogOpen(true)}
                                className="bg-foreground text-background hover:bg-foreground/90 active:scale-95 transition-all px-5 py-2.5 rounded-full font-bold"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Your First Ledger
                            </Button>
                        </div>
                    ) : (
                        <div className="mx-4 overflow-hidden rounded-[1.45rem] border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.86)_inset,0_12px_28px_rgba(41,35,26,0.055)]">
                            {regularLedgers.map((ledger, index) => {
                                const isLast = index === regularLedgers.length - 1;

                                return (
                                    <div
                                        key={ledger.id}
                                        className={`group flex min-h-[84px] cursor-pointer items-center justify-between gap-3.5 px-4 py-3 transition-colors hover:bg-muted/35 active:bg-muted/55 animate-slide-up ${
                                            isLast ? '' : 'border-b border-border'
                                        }`}
                                        style={{ animationDelay: `${index * 25}ms` }}
                                        onClick={() => onSelectLedger(ledger)}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="shrink-0 flex h-6 w-6 items-center justify-center text-muted-foreground">
                                                <Book className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-0.5 min-w-0">
                                                <h3 className="font-extrabold text-sm leading-tight tracking-tight">{ledger.name}</h3>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {`${ledger.categories?.length || 0} categories · ${ledger.payment_modes?.length || 0} modes`}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/55 transition-transform group-hover:translate-x-0.5" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Telegram Link Section */}
                <div className="px-4 pt-2 pb-4">
                    <TelegramLinkCard onLinked={loadLedgers} />
                </div>
            </section>

            {/* Floating Add Button */}
            {(regularLedgers.length > 0 || telegramLedger) && (
                <div className="fixed bottom-6 right-4 left-4 max-w-[448px] mx-auto z-40">
                    <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="w-full h-12 text-sm font-bold bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] transition-all shadow-xl shadow-black/10 rounded-full"
                    >
                        <Plus className="mr-1.5 h-5 w-5" />
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
