import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/server/session';
import {
    getTransactionForUser,
    updateTransactionForUser,
} from '@/lib/server/db';
import {
    deleteTransactionWithLendingEffectsForUser,
    LendingDomainError,
} from '@/lib/server/lending-service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const transaction = await getTransactionForUser(userId, id);
    if (!transaction) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(transaction);
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

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.amount !== undefined) updates.amount = Number(body.amount);
    if (body.type !== undefined) updates.type = body.type;
    if (body.category !== undefined) updates.category = body.category;
    if (body.payment_mode !== undefined) updates.payment_mode = body.payment_mode;
    if (body.person !== undefined) updates.person = body.person;

    const transaction = await updateTransactionForUser(userId, id, updates);
    if (!transaction) {
        return NextResponse.json({ error: 'Failed to update transaction' }, { status: 404 });
    }
    return NextResponse.json(transaction);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    try {
        await deleteTransactionWithLendingEffectsForUser(userId, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof LendingDomainError) {
            return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
        }
        console.error('Failed to delete transaction:', error);
        return NextResponse.json(
            { error: { code: 'TRANSACTION_DELETE_FAILED', message: 'Could not delete transaction.' } },
            { status: 500 }
        );
    }
}
