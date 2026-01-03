'use client';

import * as React from 'react';
import { Ledger } from '@/lib/supabase';
import { LedgerList } from './LedgerList';
import { LedgerDashboard } from './LedgerDashboard';
import { LoginPage } from './LoginPage';
import { useSession, signOut } from '@/lib/auth-client';
import { LogOut, User } from 'lucide-react';
import { Button } from './ui/button';

export function App() {
    const { data: session, isPending } = useSession();
    const [selectedLedger, setSelectedLedger] = React.useState<Ledger | null>(null);

    // Show loading while checking session
    if (isPending) {
        return (
            <div className="min-h-screen min-h-dvh flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    // Show login if not authenticated
    if (!session) {
        return <LoginPage />;
    }

    // User is authenticated
    const handleSignOut = async () => {
        await signOut();
    };

    if (selectedLedger) {
        return (
            <LedgerDashboard
                ledger={selectedLedger}
                onBack={() => setSelectedLedger(null)}
                userId={session.user.id}
            />
        );
    }

    return (
        <div className="relative">
            {/* User Header */}
            <div className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/30">
                <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {session.user.image ? (
                            <img
                                src={session.user.image}
                                alt={session.user.name || 'User'}
                                className="w-8 h-8 rounded-full"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                            </div>
                        )}
                        <div className="text-sm">
                            <p className="font-medium truncate max-w-[150px]">
                                {session.user.name || 'User'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out
                    </Button>
                </div>
            </div>

            {/* Add padding for fixed header */}
            <div className="pt-16">
                <LedgerList
                    onSelectLedger={setSelectedLedger}
                    userId={session.user.id}
                />
            </div>
        </div>
    );
}
