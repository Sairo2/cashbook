import { NextRequest, NextResponse } from 'next/server';
import { LendingEntryInput, LendingIntent } from '@/lib/supabase';
import { getSessionUserId } from '@/lib/server/session';
import {
    createLendingEntryForUser,
    getLendingRecordsForUser,
    LendingDomainError,
} from '@/lib/server/lending-service';

function errorResponse(status: number, code: string, message: string) {
    return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: NextRequest) {
    const userId = await getSessionUserId();
    if (!userId) return errorResponse(401, 'UNAUTHORIZED', 'Please sign in again.');

    const ledgerId = request.nextUrl.searchParams.get('ledgerId');
    if (!ledgerId) return errorResponse(400, 'LEDGER_ID_REQUIRED', 'ledgerId is required.');

    try {
        const records = await getLendingRecordsForUser(userId, ledgerId);
        return NextResponse.json({ data: records });
    } catch (error) {
        console.error('Failed to load lending records:', error);
        return errorResponse(500, 'LENDING_RECORDS_UNAVAILABLE', 'Could not load lending records.');
    }
}

export async function POST(request: NextRequest) {
    const userId = await getSessionUserId();
    if (!userId) return errorResponse(401, 'UNAUTHORIZED', 'Please sign in again.');

    const body = await request.json().catch(() => null);
    const validIntents: LendingIntent[] = ['lent', 'received', 'borrowed', 'repaid'];
    const amount = Number(body?.amount);
    if (
        !body ||
        typeof body.ledger_id !== 'string' ||
        typeof body.person !== 'string' ||
        !validIntents.includes(body.intent) ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        (body.due_date !== undefined && Number.isNaN(Date.parse(body.due_date)))
    ) {
        return errorResponse(400, 'INVALID_LENDING_ENTRY', 'Person, intent, and a positive amount are required.');
    }

    const input: LendingEntryInput = {
        ledger_id: body.ledger_id,
        intent: body.intent,
        amount,
        person: body.person,
        title: typeof body.title === 'string' ? body.title : undefined,
        payment_mode: typeof body.payment_mode === 'string' ? body.payment_mode : undefined,
        due_date: typeof body.due_date === 'string' ? body.due_date : undefined,
        target_transaction_id: typeof body.target_transaction_id === 'string'
            ? body.target_transaction_id
            : undefined,
    };

    try {
        const result = await createLendingEntryForUser(userId, input);
        return NextResponse.json({ data: result }, { status: 201 });
    } catch (error) {
        if (error instanceof LendingDomainError) {
            return errorResponse(error.status, error.code, error.message);
        }
        console.error('Failed to create lending entry:', error);
        return errorResponse(500, 'LENDING_ENTRY_FAILED', 'Could not record this lending entry.');
    }
}
