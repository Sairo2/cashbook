import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/server/session';
import { getTransactionsForUser, createTransactionForUser } from '@/lib/server/db';
import { TransactionType } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ledgerId = request.nextUrl.searchParams.get('ledgerId');
    if (!ledgerId) {
        return NextResponse.json({ error: 'ledgerId is required' }, { status: 400 });
    }

    const transactions = await getTransactionsForUser(userId, ledgerId);
    return NextResponse.json(transactions);
}

export async function POST(request: NextRequest) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const amount = Number(body?.amount);
    if (
        !body ||
        typeof body.ledger_id !== 'string' ||
        typeof body.title !== 'string' ||
        (body.type !== 'cash_in' && body.type !== 'cash_out') ||
        typeof body.category !== 'string' ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const transaction = await createTransactionForUser(userId, {
        ledger_id: body.ledger_id,
        title: body.title,
        amount,
        type: body.type as TransactionType,
        category: body.category,
        payment_mode: typeof body.payment_mode === 'string' ? body.payment_mode : undefined,
        person: typeof body.person === 'string' ? body.person : undefined,
    });

    if (!transaction) {
        return NextResponse.json({ error: 'Failed to create transaction' }, { status: 403 });
    }
    return NextResponse.json(transaction);
}
