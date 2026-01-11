import { NextRequest, NextResponse } from 'next/server';
import {
    getLinkedUser,
    verifyAndLinkAccount,
    parseLendingMessage,
    createLendingFromMessage,
    sendTelegramMessage,
    getHelpMessage,
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
    try {
        const update: TelegramUpdate = await request.json();

        // Only handle text messages
        if (!update.message?.text) {
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
            return NextResponse.json({ ok: true });
        }

        // Handle /help command
        if (text === '/help') {
            await sendTelegramMessage(chatId, getHelpMessage());
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
            return NextResponse.json({ ok: true });
        }

        // Check if user is linked
        const linkedUser = await getLinkedUser(chatId);
        if (!linkedUser) {
            await sendTelegramMessage(chatId,
                '⚠️ Please link your account first!\n\n' +
                'Open CashBook app → Settings → Link Telegram'
            );
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
            return NextResponse.json({ ok: true });
        }

        // Create the lending entry
        const result = await createLendingFromMessage(parsed, linkedUser.user_id);
        await sendTelegramMessage(chatId, result.message);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Telegram webhook error:', error);
        return NextResponse.json({ ok: true }); // Always return 200 to Telegram
    }
}

// Telegram sends a GET request to verify the webhook
export async function GET() {
    return NextResponse.json({ status: 'Telegram webhook active' });
}
