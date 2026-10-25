import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {
    getLinkedUser,
    verifyAndLinkAccount,
    parseLendingMessage,
    createLendingFromMessage,
    sendTelegramMessage,
    getHelpMessage,
    claimTelegramUpdate,
    completeTelegramUpdate,
    releaseTelegramUpdate,
} from '@/lib/telegram';

// Telegram webhook payload types
interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
}

interface TelegramMessage {
    message_id: number;
    from: TelegramUser;
    chat: {
        id: number;
        type: string;
    };
    date: number;
    text?: string;
}

interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
}

export async function POST(request: NextRequest) {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const suppliedSecret = request.headers.get('x-telegram-bot-api-secret-token');
    if (!expectedSecret) {
        console.error('TELEGRAM_WEBHOOK_SECRET is not configured');
        return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
    }
    const suppliedBuffer = Buffer.from(suppliedSecret || '');
    const expectedBuffer = Buffer.from(expectedSecret);
    if (
        suppliedBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let claimedUpdateId: number | null = null;
    try {
        const update: TelegramUpdate = await request.json();
        if (!Number.isSafeInteger(update.update_id)) {
            return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
        }
        if (!(await claimTelegramUpdate(update.update_id))) {
            return NextResponse.json({ ok: true, duplicate: true });
        }
        claimedUpdateId = update.update_id;

        // Only handle text messages
        if (!update.message?.text) {
            await completeTelegramUpdate(update.update_id);
            return NextResponse.json({ ok: true });
        }

        const { message } = update;
        const chatId = message.chat.id.toString();
        const text = message.text!.trim(); // Safe: we checked above
        const username = message.from.username;

        // Handle /start command (with optional link code)
        if (text.startsWith('/start')) {
            const parts = text.split(' ');

            if (parts.length > 1) {
                // User sent /start <code> - attempt to link account
                const code = parts[1];
                const result = await verifyAndLinkAccount(code, chatId, username);
                await sendTelegramMessage(chatId, result.message);
            } else {
                // Just /start - check if already linked
                const linkedUser = await getLinkedUser(chatId);
                if (linkedUser) {
                    await sendTelegramMessage(chatId,
                        '👋 Welcome back! You can start recording your lendings.\n\n' + getHelpMessage()
                    );
                } else {
                    await sendTelegramMessage(chatId,
                        '👋 Welcome to CashBook LENDINGS Bot!\n\n' +
                        'To get started, you need to link your account:\n' +
                        '1. Open CashBook app\n' +
                        '2. Go to Settings → Link Telegram\n' +
                        '3. Copy the code and send it here\n\n' +
                        'Example: <code>/start 123456</code>'
                    );
                }
            }
            await completeTelegramUpdate(update.update_id);
            return NextResponse.json({ ok: true });
        }

        // Handle /help command
        if (text === '/help') {
            await sendTelegramMessage(chatId, getHelpMessage());
            await completeTelegramUpdate(update.update_id);
            return NextResponse.json({ ok: true });
        }

        // Handle /status command
        if (text === '/status') {
            const linkedUser = await getLinkedUser(chatId);
            if (linkedUser) {
                await sendTelegramMessage(chatId,
                    '✅ Your account is linked!\n\n' +
                    'You can send lending entries directly.'
                );
            } else {
                await sendTelegramMessage(chatId,
                    '❌ Your account is not linked.\n\n' +
                    'Open CashBook app → Settings → Link Telegram'
                );
            }
            await completeTelegramUpdate(update.update_id);
            return NextResponse.json({ ok: true });
        }

        // Check if user is linked
        const linkedUser = await getLinkedUser(chatId);
        if (!linkedUser) {
            await sendTelegramMessage(chatId,
                '⚠️ Please link your account first!\n\n' +
                'Open CashBook app → Settings → Link Telegram'
            );
            await completeTelegramUpdate(update.update_id);
            return NextResponse.json({ ok: true });
        }

        // Try to parse as a lending message
        const parsed = parseLendingMessage(text);
        if (!parsed) {
            await sendTelegramMessage(chatId,
                '❓ Could not understand the message.\n\n' +
                '<b>Format:</b> <code>amount name due_date</code>\n' +
                '<b>Example:</b> <code>500 john tomorrow</code>\n\n' +
                'Send /help for more info.'
            );
            await completeTelegramUpdate(update.update_id);
            return NextResponse.json({ ok: true });
        }

        // Create the lending entry
        const result = await createLendingFromMessage(parsed, linkedUser.user_id);
        await sendTelegramMessage(chatId, result.message);

        await completeTelegramUpdate(update.update_id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Telegram webhook error:', error);
        if (claimedUpdateId !== null) await releaseTelegramUpdate(claimedUpdateId);
        return NextResponse.json({ error: 'Temporary webhook failure' }, { status: 500 });
    }
}

// Telegram sends a GET request to verify the webhook
export async function GET() {
    return NextResponse.json({ status: 'Telegram webhook active' });
}
