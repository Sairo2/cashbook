import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
    generateLinkCode,
    getTelegramLinkStatus,
    unlinkTelegramAccount,
} from '@/lib/telegram';

/**
 * GET /api/telegram/link
 * Get Telegram link status for the current user
 */
export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const linkStatus = await getTelegramLinkStatus(session.user.id);

        return NextResponse.json({
            linked: !!linkStatus,
            telegram_username: linkStatus?.telegram_username,
            linked_at: linkStatus?.linked_at,
        });
    } catch (error) {
        console.error('Error getting Telegram link status:', error);
        return NextResponse.json(
            { error: 'Failed to get link status' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/telegram/link
 * Generate a new link code for the current user
 */
export async function POST() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if already linked
        const existingLink = await getTelegramLinkStatus(session.user.id);
        if (existingLink) {
            return NextResponse.json(
                { error: 'Telegram account already linked' },
                { status: 400 }
            );
        }

        const code = await generateLinkCode(session.user.id);

        if (!code) {
            return NextResponse.json(
                { error: 'Failed to generate link code' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            code,
            expires_in: 600, // 10 minutes in seconds
        });
    } catch (error) {
        console.error('Error generating link code:', error);
        return NextResponse.json(
            { error: 'Failed to generate link code' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/telegram/link
 * Unlink Telegram account for the current user
 */
export async function DELETE() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const success = await unlinkTelegramAccount(session.user.id);

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to unlink account' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error unlinking Telegram account:', error);
        return NextResponse.json(
            { error: 'Failed to unlink account' },
            { status: 500 }
        );
    }
}
