'use client';

import * as React from 'react';
import { Ledger } from '@/lib/supabase';
import { LedgerList } from './LedgerList';
import { LedgerDashboard } from './LedgerDashboard';
import { LendingsDashboard } from './LendingsDashboard';
import { LoginPage } from './LoginPage';
import { useSession, signOut } from '@/lib/auth-client';
import { LogOut, Wallet } from 'lucide-react';
import { Button } from './ui/button';

const LENDINGS_LEDGER_NAME = 'LENDINGS';

export function App() {
    const { data: session, isPending } = useSession();
    const [selectedLedger, setSelectedLedger] = React.useState<Ledger | null>(null);

    // --- All handlers defined BEFORE any conditional returns ---

    const handleSignOut = React.useCallback(async () => {
        await signOut();
    }, []);

    const handleLedgerUpdated = React.useCallback((updatedLedger: Ledger) => {
        setSelectedLedger(updatedLedger);
    }, []);

    const handleLedgerDeleted = React.useCallback(() => {
        if (window.history.state?.view === 'ledger') {
            window.history.replaceState(null, '');
        }
        setSelectedLedger(null);
    }, []);

    const handleSelectLedger = React.useCallback((ledger: Ledger) => {
        setSelectedLedger(ledger);
        window.history.pushState({ view: 'ledger', ledgerId: ledger.id }, '');
    }, []);

    const handleBack = React.useCallback(() => {
        if (window.history.state?.view === 'ledger') {
            window.history.back();
            return;
        }
        setSelectedLedger(null);
    }, []);

    // --- Browser History API for back navigation ---
    React.useEffect(() => {
        const handlePopState = () => {
            setSelectedLedger(null);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Show loading while checking session
    if (isPending) {
        return (
            <div className="min-h-screen min-h-dvh flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-12 h-12 mx-auto mb-5">
                        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">Loading CashBook...</p>
                </div>
            </div>
        );
    }

    // Show login if not authenticated
    if (!session) {
        return <LoginPage />;
    }

    // Show appropriate dashboard based on ledger type
    if (selectedLedger) {
        const isLendingsLedger = selectedLedger.name === LENDINGS_LEDGER_NAME;

        if (isLendingsLedger) {
            return (
                <div className="page-enter mx-auto min-h-dvh w-full max-w-[480px]">
                    <LendingsDashboard
                        ledger={selectedLedger}
                        onBack={handleBack}
                        userId={session.user.id}
                        onLedgerUpdated={handleLedgerUpdated}
                        onLedgerDeleted={handleLedgerDeleted}
                    />
                </div>
            );
        }

        return (
            <div className="page-enter mx-auto min-h-dvh w-full max-w-[480px]">
                <LedgerDashboard
                    ledger={selectedLedger}
                    onBack={handleBack}
                    userId={session.user.id}
                    onLedgerUpdated={handleLedgerUpdated}
                    onLedgerDeleted={handleLedgerDeleted}
                />
            </div>
        );
    }

    return (
        <div className="relative mx-auto min-h-dvh w-full max-w-[480px] animate-fade-in">
            {/* App Header */}
            <header className="fixed top-0 left-0 right-0 z-30 bg-background/82 backdrop-blur-xl border-b border-border/70">
                <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold truncate max-w-[170px]">
                                CashBook
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        className="text-muted-foreground hover:text-foreground hover:bg-card rounded-xl h-9 w-9 p-0"
                        aria-label="Sign out"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Add padding for fixed header */}
            <div className="pt-[60px]">
                <LedgerList
                    onSelectLedger={handleSelectLedger}
                    userId={session.user.id}
                />
            </div>
        </div>
    );
}
