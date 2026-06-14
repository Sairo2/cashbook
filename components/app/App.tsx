'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Ledger } from '@/lib/supabase';
import { LedgerList } from '@/components/features/ledgers/LedgerList';
import { LoginPage } from '@/components/features/auth/LoginPage';
import { useSession, signOut } from '@/lib/auth-client';
import { AppHeader } from '@/components/app/AppHeader';
import { AppLoading } from '@/components/app/AppLoading';

const LENDINGS_LEDGER_NAME = 'LENDINGS';

export function App() {
    const router = useRouter();
    const { data: session, isPending } = useSession();

    const handleSignOut = React.useCallback(async () => {
        await signOut();
    }, []);

    const handleSelectLedger = React.useCallback((ledger: Ledger) => {
        if (ledger.name === LENDINGS_LEDGER_NAME) {
            router.push('/lendings');
            return;
        }

        router.push(`/ledgers/${ledger.id}`);
    }, [router]);

    if (isPending) {
        return <AppLoading />;
    }

    if (!session) {
        return <LoginPage />;
    }

    return (
        <div className="relative mx-auto min-h-dvh w-full max-w-[480px] animate-fade-in">
            <AppHeader onSignOut={handleSignOut} />
            <div className="pt-[60px]">
                <LedgerList
                    onSelectLedger={handleSelectLedger}
                    userId={session.user.id}
                />
            </div>
        </div>
    );
}
