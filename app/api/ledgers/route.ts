import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/server/session';
import { getLedgersForUser, createLedgerForUser } from '@/lib/server/db';

export async function GET() {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ledgers = await getLedgersForUser(userId);
    return NextResponse.json(ledgers);
}

export async function POST(request: NextRequest) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.name !== 'string') {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const ledger = await createLedgerForUser(
        userId,
        body.name,
        Array.isArray(body.categories) ? body.categories : [],
        Array.isArray(body.payment_modes) ? body.payment_modes : []
    );

    if (!ledger) {
        return NextResponse.json({ error: 'Failed to create ledger' }, { status: 500 });
    }
    return NextResponse.json(ledger);
}
