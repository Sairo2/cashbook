'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Ledger } from '@/lib/supabase';
import { getLedgerById } from '@/lib/store';
import { useSession } from '@/lib/auth-client';
import { AppLoading } from '@/components/app/AppLoading';
import { DashboardFrame } from '@/components/app/DashboardFrame';
import { RouteState } from '@/components/app/RouteState';
import { LoginPage } from '@/components/features/auth/LoginPage';
import { LedgerDashboard } from '@/components/features/ledgers/LedgerDashboard';

const LENDINGS_LEDGER_NAME = 'LENDINGS';

export function LedgerRoutePage() {
    const router = useRouter();
    const params = useParams<{ ledgerId: string }>();
    const { data: session, isPending } = useSession();
    const [ledger, setLedger] = React.useState<Ledger | null>(null);
    const [loading, setLoading] = React.useState(true);

    const ledgerId = Array.isArray(params.ledgerId) ? params.ledgerId[0] : params.ledgerId;

    React.useEffect(() => {
        if (!session?.user?.id || !ledgerId) {
            return;
        }

        let cancelled = false;

        async function loadLedger() {
            setLoading(true);
            const storedLedger = await getLedgerById(ledgerId);

            if (cancelled) {
                return;
            }

            if (storedLedger?.name === LENDINGS_LEDGER_NAME) {
                router.replace('/lendings');
                return;
            }

            setLedger(storedLedger);
            setLoading(false);
        }

        loadLedger();

        return () => {
            cancelled = true;
        };
    }, [ledgerId, router, session?.user?.id]);

    if (isPending) {
        return <AppLoading />;
    }

    if (!session) {
        return <LoginPage />;
    }

    if (loading) {
        return <AppLoading />;
    }

    if (!ledger) {
        return (
            <RouteState
                title="Ledger not found"
                description="This ledger may have been deleted or is not available for your account."
                actionLabel="Back to ledgers"
                onAction={() => router.push('/')}
            />
        );
    }

    return (
        <DashboardFrame>
            <LedgerDashboard
                ledger={ledger}
                onBack={() => router.push('/')}
                userId={session.user.id}
                onLedgerUpdated={setLedger}
                onLedgerDeleted={() => router.push('/')}
            />
        </DashboardFrame>
    );
}
