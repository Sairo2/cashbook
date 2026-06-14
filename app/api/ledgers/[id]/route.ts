import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/server/session';
import {
    getLedgerForUser,
    updateLedgerForUser,
    deleteLedgerForUser,
} from '@/lib/server/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ledger = await getLedgerForUser(userId, id);
    if (!ledger) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(ledger);
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const ledger = await updateLedgerForUser(userId, id, {
        name: body.name,
        categories: body.categories,
        payment_modes: body.payment_modes,
    });

    if (!ledger) {
        return NextResponse.json({ error: 'Failed to update ledger' }, { status: 404 });
    }
    return NextResponse.json(ledger);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const success = await deleteLedgerForUser(userId, id);
    if (!success) {
        return NextResponse.json({ error: 'Failed to delete ledger' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}
