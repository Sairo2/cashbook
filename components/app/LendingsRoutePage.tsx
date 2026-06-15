'use client';

import * as React from 'react';
import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Ledger } from '@/lib/supabase';
import { getLedgers } from '@/lib/store';
import { useSession } from '@/lib/auth-client';
import { AppLoading } from '@/components/app/AppLoading';
import { DashboardFrame } from '@/components/app/DashboardFrame';
import { RouteState } from '@/components/app/RouteState';
import { LoginPage } from '@/components/features/auth/LoginPage';
import { LendingsDashboard } from '@/components/features/lendings/LendingsDashboard';
import { TelegramLinkCard } from '@/components/features/lendings/TelegramLinkCard';

const LENDINGS_LEDGER_NAME = 'LENDINGS';

export function LendingsRoutePage() {
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const [ledger, setLedger] = React.useState<Ledger | null>(null);
    const [loading, setLoading] = React.useState(true);
    const userId = session?.user?.id;

    const loadLendingsLedger = React.useCallback(async () => {
        if (!userId) {
            return;
        }

        setLoading(true);
        const ledgers = await getLedgers(userId);
        setLedger(ledgers.find((item) => item.name === LENDINGS_LEDGER_NAME) || null);
        setLoading(false);
    }, [userId]);

    React.useEffect(() => {
        loadLendingsLedger();
    }, [loadLendingsLedger]);

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
            <DashboardFrame>
                <RouteState
                    title="Telegram lendings"
                    description="Link Telegram to restore or create your lending book."
                    actionLabel="Back to ledgers"
                    onAction={() => router.push('/')}
                >
                    {/* <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-accent/70 text-primary">
                        <Send className="h-5 w-5" />
                    </div> */}
                    <div className="mb-6">
                        <TelegramLinkCard onLinked={loadLendingsLedger} />
                    </div>
                </RouteState>
            </DashboardFrame>
        );
    }

    return (
        <DashboardFrame>
            <LendingsDashboard
                ledger={ledger}
                onBack={() => router.push('/')}
                userId={session.user.id}
                onLedgerUpdated={setLedger}
                onLedgerDeleted={() => router.push('/')}
            />
        </DashboardFrame>
    );
}
