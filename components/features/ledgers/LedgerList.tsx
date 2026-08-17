'use client';

import * as React from 'react';
import { ArrowUpRight, Book, Plus, ChevronRight } from 'lucide-react';
import { Ledger } from '@/lib/supabase';
import { getLedgers, createLedger } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { AddLedgerDialog } from '@/components/features/ledgers/AddLedgerDialog';
import { TelegramLinkCard } from '@/components/features/lendings/TelegramLinkCard';

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
    const activeBookCount = regularLedgers.length + (telegramLedger ? 1 : 0);

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
        <div className="min-h-screen pb-36 page-enter">
            <section className="mx-auto w-full max-w-[430px] px-6 pb-7 pt-8">
                <p className="text-sm font-normal text-muted-foreground">Good evening</p>

                <div className="mt-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                        Active books
                    </p>
                    <div className="mt-3 flex items-end gap-2">
                        <span className="font-sans text-[3.35rem] font-light leading-none tracking-[-0.035em] text-foreground tabular-nums">
                            {activeBookCount}
                        </span>
                        <span className="pb-2 text-sm font-medium text-muted-foreground">
                            {activeBookCount === 1 ? 'book' : 'books'}
                        </span>
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-[13px] text-muted-foreground">
                        <span>{regularLedgers.length} ledger{regularLedgers.length === 1 ? '' : 's'}</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-muted-foreground/75">Updated just now</span>
                    </div>
                </div>
            </section>

            <div className="mx-auto h-px max-w-[430px] bg-gradient-to-r from-transparent via-border to-transparent" />

            <section className="mx-auto w-full max-w-[430px] space-y-8 px-6 pt-7">
                {telegramLedger && (
                    <button
                        type="button"
                        className="group w-full rounded-[1.15rem] border border-primary/20 bg-card px-[18px] py-[17px] text-left shadow-[0_1px_0_rgba(255,255,255,0.82)_inset,0_12px_26px_rgba(41,35,26,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/25 hover:shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_16px_32px_rgba(41,35,26,0.09)] active:translate-y-0"
                        onClick={() => onSelectLedger(telegramLedger)}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3.5">
                                <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-accent/55 text-primary">
                                    <ArrowUpRight className="h-5 w-5 stroke-[1.7]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                                        Lending tracker
                                    </p>
                                    <h3 className="mt-1 truncate text-[15px] font-medium tracking-[-0.005em] text-foreground">
                                        Telegram Lendings
                                    </h3>
                                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                                        Synced entries from Telegram
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 text-primary">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                                    Open
                                </span>
                                <ChevronRight className="h-[15px] w-[15px] text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                            </div>
                        </div>
                    </button>
                )}

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                            Ledgers
                        </h2>
                        <button
                            type="button"
                            onClick={() => setIsDialogOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-opacity hover:opacity-70"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New
                        </button>
                    </div>

                    {regularLedgers.length === 0 ? (
                        <div className="surface-card rounded-[1.15rem] px-5 py-14 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/10 bg-accent">
                                <Book className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="text-lg font-extrabold tracking-tight mb-1">Start with one ledger</h3>
                            <p className="text-muted-foreground text-xs leading-5 max-w-[280px] mx-auto mb-6">
                                Create a separate ledger for expenses, income, projects, or shared books.
                            </p>
                            <Button
                                onClick={() => setIsDialogOpen(true)}
                                variant="outline"
                                className="rounded-xl border-primary/20 bg-card/80 px-5 py-2.5 font-bold text-primary transition-all hover:bg-accent/70 active:scale-95"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Your First Ledger
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/80">
                            {regularLedgers.map((ledger, index) => {
                                const initial = ledger.name.trim().charAt(0).toUpperCase() || 'L';

                                return (
                                    <button
                                        type="button"
                                        key={ledger.id}
                                        className="group flex w-full items-center gap-3.5 rounded-[0.65rem] px-1.5 py-[15px] text-left transition-colors duration-200 hover:bg-muted/45 active:bg-muted/60 animate-slide-up"
                                        style={{ animationDelay: `${index * 25}ms` }}
                                        onClick={() => onSelectLedger(ledger)}
                                    >
                                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-card text-[15px] font-medium tracking-[0.02em] text-primary">
                                                {initial}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="truncate text-[15px] font-medium leading-tight tracking-[-0.005em] text-foreground">
                                                    {ledger.name}
                                                </h3>
                                                <p className="mt-1.5 truncate text-[10px] font-medium uppercase tracking-[0.13em] text-muted-foreground/80">
                                                    {`${ledger.categories?.length || 0} categories · ${ledger.payment_modes?.length || 0} modes`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3">
                                            <span className="hidden text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70 min-[380px]:inline">
                                                Open
                                            </span>
                                            <ChevronRight className="h-[15px] w-[15px] text-muted-foreground/45 transition-transform group-hover:translate-x-0.5" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Telegram Link Section */}
                <div className="pb-4 pt-1">
                    <TelegramLinkCard onLinked={loadLedgers} />
                </div>
            </section>

            {/* Floating Add Button */}
            {(regularLedgers.length > 0 || telegramLedger) && (
                <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] bg-gradient-to-t from-background via-background/90 to-transparent px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
                    <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="h-[52px] w-full rounded-[15px] border border-primary/20 bg-accent text-sm font-semibold text-primary shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_14px_30px_rgba(31,122,98,0.14)] transition-all hover:brightness-[1.03] active:scale-[0.98]"
                    >
                        <Plus className="mr-1.5 h-4 w-4 stroke-[2]" />
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
