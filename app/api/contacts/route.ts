import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/server/session';
import {
    getLendingContactsForUser,
    upsertLendingContactForUser,
} from '@/lib/server/db';

export async function GET(request: NextRequest) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ledgerId = request.nextUrl.searchParams.get('ledgerId');
    if (!ledgerId) {
        return NextResponse.json({ error: 'ledgerId is required' }, { status: 400 });
    }

    const contacts = await getLendingContactsForUser(userId, ledgerId);
    return NextResponse.json(contacts);
}

export async function POST(request: NextRequest) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (
        !body ||
        typeof body.ledgerId !== 'string' ||
        typeof body.personName !== 'string' ||
        typeof body.phoneNumber !== 'string'
    ) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const contact = await upsertLendingContactForUser(
        userId,
        body.ledgerId,
        body.personName,
        body.phoneNumber
    );

    if (!contact) {
        return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
    }
    return NextResponse.json(contact);
}
