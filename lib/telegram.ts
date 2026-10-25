import { Ledger } from './supabase';
import { randomInt } from 'crypto';
import {
    supabaseAdmin,
    getLedgersForUser,
    createLedgerForUser,
} from './server/db';
import {
    LENDING_INTENT_CONFIG,
    ParsedLending,
} from './lending-domain';
import { createLendingEntryForUser } from './server/lending-service';

export { parseLendingMessage } from './lending-domain';

// Telegram runs server-side only; use the service-role client and the
// ownership-enforcing data layer (all calls are scoped to the linked user).
const supabase = supabaseAdmin;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const LENDINGS_LEDGER_NAME = 'LENDINGS';

// Default categories for LENDINGS ledger
const LENDINGS_CATEGORIES = ['Lending', 'Repayment', 'Borrowing'];
const LENDINGS_PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer'];

function escapeTelegramHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============ TELEGRAM LINK OPERATIONS ============

export interface TelegramLink {
    id: string;
    user_id: string;
    telegram_chat_id: string;
    telegram_username?: string;
    linked_at: string;
}

export interface TelegramLinkCode {
    id: string;
    user_id: string;
    code: string;
    expires_at: string;
    created_at: string;
}

export interface Lending {
    id: string;
    transaction_id: string;
    borrower_name: string;
    due_date?: string;
    status: 'pending' | 'partial' | 'settled';
    original_amount: number;
    remaining_amount: number;
    notes?: string;
    created_at: string;
}

async function restoreLendingsLedger(oldUserId: string, newUserId: string): Promise<'none' | 'moved' | 'merged' | null> {
    if (oldUserId === newUserId) {
        return 'none';
    }

    const { data: oldLedgers, error: findNamedLedgerError } = await supabase
        .from('ledgers')
        .select('id, name')
        .eq('user_id', oldUserId)
        .eq('name', LENDINGS_LEDGER_NAME);

    if (findNamedLedgerError) {
        console.error('Error finding named old LENDINGS ledger:', findNamedLedgerError);
        return null;
    }

    const oldLedger = oldLedgers?.[0];
    if (!oldLedger) {
        return 'none';
    }

    const { data: targetLedgers, error: targetLedgerError } = await supabase
        .from('ledgers')
        .select('id')
        .eq('user_id', newUserId)
        .eq('name', LENDINGS_LEDGER_NAME);

    if (targetLedgerError) {
        console.error('Error finding target LENDINGS ledger:', targetLedgerError);
        return null;
    }

    const targetLedger = targetLedgers?.[0];

    if (!targetLedger) {
        const { error: moveLedgerError } = await supabase
            .from('ledgers')
            .update({ user_id: newUserId })
            .eq('id', oldLedger.id);

        if (moveLedgerError) {
            console.error('Error moving LENDINGS ledger to re-linked user:', moveLedgerError);
            return null;
        }

        return 'moved';
    }

    if (targetLedger.id === oldLedger.id) {
        return 'none';
    }

    const { data: oldTransactions, error: oldTransactionsError } = await supabase
        .from('transactions')
        .select('id')
        .eq('ledger_id', oldLedger.id);

    if (oldTransactionsError) {
        console.error('Error finding old LENDINGS transactions:', oldTransactionsError);
        return null;
    }

    const movedTransactionIds = (oldTransactions || []).map(transaction => transaction.id);

    const { error: moveTransactionsError } = await supabase
        .from('transactions')
        .update({ ledger_id: targetLedger.id })
        .eq('ledger_id', oldLedger.id);

    if (moveTransactionsError) {
        console.error('Error merging LENDINGS transactions:', moveTransactionsError);
        return null;
    }

    const { error: deleteOldLedgerError } = await supabase
        .from('ledgers')
        .delete()
        .eq('id', oldLedger.id);

    if (deleteOldLedgerError) {
        console.error('Error deleting duplicate old LENDINGS ledger:', deleteOldLedgerError);
        if (movedTransactionIds.length > 0) {
            const { error: rollbackError } = await supabase
                .from('transactions')
                .update({ ledger_id: oldLedger.id })
                .in('id', movedTransactionIds);

            if (rollbackError) {
                console.error('Error rolling back LENDINGS merge:', rollbackError);
            }
        }

        return null;
    }

    return 'merged';
}

/**
 * Generate a 6-digit link code for account linking
 */
export async function generateLinkCode(userId: string): Promise<string | null> {
    // Delete any existing codes for this user
    await supabase
        .from('telegram_link_codes')
        .delete()
        .eq('user_id', userId);

    // Generate a random 6-digit code
    const code = randomInt(100000, 1000000).toString();

    // Code expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabase
        .from('telegram_link_codes')
        .insert([{
            user_id: userId,
            code,
            expires_at: expiresAt,
        }]);

    if (error) {
        console.error('Error generating link code:', error);
        return null;
    }

    return code;
}

/**
 * Verify a link code and link the Telegram account
 */
export async function verifyAndLinkAccount(
    code: string,
    telegramChatId: string,
    telegramUsername?: string
): Promise<{ success: boolean; message: string }> {
    // Find the code
    const { data: codeData, error: codeError } = await supabase
        .from('telegram_link_codes')
        .select('*')
        .eq('code', code)
        .single();

    if (codeError || !codeData) {
        return { success: false, message: 'Invalid code. Please generate a new one from the app.' };
    }

    // Check if code is expired
    if (new Date(codeData.expires_at) < new Date()) {
        // Delete expired code
        await supabase.from('telegram_link_codes').delete().eq('id', codeData.id);
        return { success: false, message: 'Code expired. Please generate a new one from the app.' };
    }

    const targetUserId = codeData.user_id;

    // Check if this Telegram account is already linked. If it is, treat this as
    // account recovery/reconnect because the request came from that Telegram chat.
    const { data: existingLink, error: existingLinkError } = await supabase
        .from('telegram_links')
        .select('*')
        .eq('telegram_chat_id', telegramChatId)
        .maybeSingle();

    if (existingLinkError) {
        console.error('Error checking existing Telegram link:', existingLinkError);
        return { success: false, message: 'Failed to check Telegram link. Please try again.' };
    }

    if (existingLink) {
        const oldUserId = existingLink.user_id;

        const lendingsRestoreResult = await restoreLendingsLedger(oldUserId, targetUserId);
        if (lendingsRestoreResult === null) {
            return { success: false, message: 'Telegram is linked, but your old LENDINGS ledger could not be restored. Please try again.' };
        }

        const { error: relinkError } = await supabase
            .from('telegram_links')
            .update({
                user_id: targetUserId,
                telegram_username: telegramUsername ?? existingLink.telegram_username,
                linked_at: new Date().toISOString(),
            })
            .eq('id', existingLink.id);

        if (relinkError) {
            console.error('Error re-linking Telegram account:', relinkError);
            return { success: false, message: 'Failed to re-link account. Please try again.' };
        }

        await supabase.from('telegram_link_codes').delete().eq('id', codeData.id);
        await getOrCreateLendingsLedger(targetUserId);

        if (oldUserId === targetUserId) {
            return { success: true, message: '✅ Telegram is already linked to this account. Your LENDINGS ledger is ready.' };
        }

        const restoreMessage = lendingsRestoreResult === 'merged'
            ? 'Merged your old Telegram lendings into the current LENDINGS ledger.'
            : lendingsRestoreResult === 'moved'
                ? 'Restored your old Telegram LENDINGS ledger.'
                : 'Your LENDINGS ledger is ready.';

        return {
            success: true,
            message: `✅ Telegram re-linked successfully! ${restoreMessage}`,
        };
    }

    // Create the link
    const { error: linkError } = await supabase
        .from('telegram_links')
        .insert([{
            user_id: targetUserId,
            telegram_chat_id: telegramChatId,
            telegram_username: telegramUsername,
        }]);

    if (linkError) {
        console.error('Error linking account:', linkError);
        return { success: false, message: 'Failed to link account. Please try again.' };
    }

    // Delete the used code
    await supabase.from('telegram_link_codes').delete().eq('id', codeData.id);

    // Create LENDINGS ledger for the user if it doesn't exist
    await getOrCreateLendingsLedger(targetUserId);

    return { success: true, message: '✅ Account linked successfully! You can now send lending entries.' };
}

/**
 * Get linked user by Telegram chat ID
 */
export async function getLinkedUser(telegramChatId: string): Promise<TelegramLink | null> {
    const { data, error } = await supabase
        .from('telegram_links')
        .select('*')
        .eq('telegram_chat_id', telegramChatId)
        .maybeSingle();

    if (error || !data) return null;
    return data;
}

/**
 * Get Telegram link status for a user
 */
export async function getTelegramLinkStatus(userId: string): Promise<TelegramLink | null> {
    const { data, error } = await supabase
        .from('telegram_links')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !data) return null;
    return data;
}

/**
 * Unlink Telegram account
 */
export async function unlinkTelegramAccount(userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('telegram_links')
        .delete()
        .eq('user_id', userId);

    return !error;
}

export async function claimTelegramUpdate(updateId: number): Promise<boolean> {
    const { error } = await supabase
        .from('telegram_updates')
        .insert({ update_id: updateId, status: 'processing' });

    if (!error) return true;
    if (error.code === '23505') return false;
    throw error;
}

export async function completeTelegramUpdate(updateId: number): Promise<void> {
    const { error } = await supabase
        .from('telegram_updates')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('update_id', updateId);
    if (error) throw error;
}

export async function releaseTelegramUpdate(updateId: number): Promise<void> {
    const { error } = await supabase
        .from('telegram_updates')
        .delete()
        .eq('update_id', updateId)
        .eq('status', 'processing');
    if (error) console.error('Failed to release Telegram update:', error);
}

// ============ LENDINGS LEDGER OPERATIONS ============

/**
 * Get or create the LENDINGS ledger for a user
 */
export async function getOrCreateLendingsLedger(userId: string): Promise<Ledger | null> {
    const ledgers = await getLedgersForUser(userId);
    const existingLedger = ledgers.find(l => l.name === LENDINGS_LEDGER_NAME);

    if (existingLedger) {
        return existingLedger;
    }

    // Create new LENDINGS ledger
    const newLedger = await createLedgerForUser(
        userId,
        LENDINGS_LEDGER_NAME,
        LENDINGS_CATEGORIES,
        LENDINGS_PAYMENT_MODES
    );

    return newLedger;
}

// ============ MESSAGE PARSING ============

// ============ LENDING CREATION ============

/**
 * Create a lending transaction from parsed message
 */
export async function createLendingFromMessage(
    parsed: ParsedLending,
    userId: string
): Promise<{ success: boolean; message: string }> {
    try {
        // Get or create LENDINGS ledger
        const ledger = await getOrCreateLendingsLedger(userId);
        if (!ledger) {
            return { success: false, message: 'Failed to access LENDINGS ledger.' };
        }

        const config = LENDING_INTENT_CONFIG[parsed.intent];
        await createLendingEntryForUser(userId, {
            intent: parsed.intent,
            amount: parsed.amount,
            title: `${config.titlePrefix} ${parsed.personName}`,
            payment_mode: 'Cash',
            person: parsed.personName,
            ledger_id: ledger.id,
            due_date: parsed.dueDate?.toISOString(),
        });

        // Format success message
        const amountStr = `₹${parsed.amount.toLocaleString('en-IN')}`;
        const personName = escapeTelegramHtml(parsed.personName);
        const presentation = {
            lent: { emoji: '💸', verb: 'Lent', preposition: 'to' },
            repaid: { emoji: '✅', verb: 'Repaid', preposition: 'to' },
            received: { emoji: '💰', verb: 'Received', preposition: 'from' },
            borrowed: { emoji: '🔄', verb: 'Borrowed', preposition: 'from' },
        }[parsed.intent];
        let successMsg = `${presentation.emoji} Recorded: ${presentation.verb} ${amountStr} ${presentation.preposition} ${personName}`;

        if ((parsed.intent === 'lent' || parsed.intent === 'borrowed') && parsed.dueDate) {
            const dueDateStr = parsed.dueDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: parsed.dueDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
            });
            successMsg += `\n📅 Due: ${dueDateStr}`;
        }

        return { success: true, message: successMsg };
    } catch (error) {
        console.error('Error creating lending:', error);
        return { success: false, message: 'An error occurred. Please try again.' };
    }
}

// ============ TELEGRAM API ============

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('TELEGRAM_BOT_TOKEN not configured');
        return false;
    }

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    parse_mode: 'HTML',
                }),
            }
        );

        return response.ok;
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        return false;
    }
}

/**
 * Get help message for bot
 */
export function getHelpMessage(): string {
    return `📒 <b>CashBook LENDINGS Bot</b>

<b>💸 When you GIVE money:</b>
<code>gave john 500 tomorrow</code>
<code>lent mary 1000 15jan</code>

<b>💰 When you GET money back:</b>
<code>got john 500</code>
<code>received mary 1000</code>

<b>🔄 When you BORROW money:</b>
<code>borrowed john 2000</code>

<b>✅ When you REPAY your debt:</b>
<code>repaid john 500</code>

<b>Commands:</b>
/help - Show this message
/status - Check your linked account

<i>All entries are saved to your LENDINGS ledger.</i>`;
}
