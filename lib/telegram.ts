import { Ledger } from './supabase';
import {
    supabaseAdmin,
    getLedgersForUser,
    createLedgerForUser,
    createTransactionForUser,
} from './server/db';

// Telegram runs server-side only; use the service-role client and the
// ownership-enforcing data layer (all calls are scoped to the linked user).
const supabase = supabaseAdmin;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const LENDINGS_LEDGER_NAME = 'LENDINGS';

// Default categories for LENDINGS ledger
const LENDINGS_CATEGORIES = ['Lending', 'Repayment'];
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
    const code = Math.floor(100000 + Math.random() * 900000).toString();

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

export type LendingIntent = 'lent' | 'repaid' | 'received' | 'borrowed';

export interface ParsedLending {
    amount: number;
    personName: string;
    dueDate?: Date;
    intent: LendingIntent;
    rawDueText?: string;
}

/**
 * Parse a lending message from Telegram
 * Supported formats:
 * - "gave john 500 tomorrow" → Lent (they owe you)
 * - "gave john 500" → Lent (they owe you)
 * - "lent john 500" → Lent (they owe you)
 * - "got john 500" → Received repayment (they owed you)
 * - "received john 500" → Received repayment
 * - "borrowed john 500" → Borrowed (you owe them)
 * - "repaid john 500" → Repaid your debt
 */
export function parseLendingMessage(message: string): ParsedLending | null {
    const text = message.trim().toLowerCase();
    const parts = text.split(/\s+/);

    if (parts.length < 3) {
        return null;
    }

    const keyword = parts[0];
    let intent: LendingIntent;

    // Determine intent from keyword
    switch (keyword) {
        case 'gave':
        case 'lent':
        case 'give':
        case 'lend':
            intent = 'lent';
            break;
        case 'got':
        case 'received':
        case 'get':
            intent = 'received';
            break;
        case 'borrowed':
        case 'borrow':
            intent = 'borrowed';
            break;
        case 'repaid':
        case 'repay':
        case 'paid':
            intent = 'repaid';
            break;
        default: {
            // Legacy format: "500 john tomorrow" → treat as lent
            const amount = parseAmount(parts[0]);
            if (amount) {
                const personName = capitalizeFirst(parts[1]);
                let dueDate: Date | undefined;
                let rawDueText: string | undefined;

                if (parts.length > 2) {
                    rawDueText = parts.slice(2).join(' ');
                    dueDate = parseDueDate(rawDueText);
                }

                return {
                    amount,
                    personName,
                    dueDate,
                    intent: 'lent',
                    rawDueText,
                };
            }
            return null;
        }
    }

    // Format: keyword person amount [due_date]
    // e.g., "gave john 500 tomorrow"
    const personName = capitalizeFirst(parts[1]);
    const amount = parseAmount(parts[2]);

    if (!amount) return null;

    // Remaining parts are the due date (optional)
    let dueDate: Date | undefined;
    let rawDueText: string | undefined;

    if (parts.length > 3) {
        rawDueText = parts.slice(3).join(' ');
        dueDate = parseDueDate(rawDueText);
    }

    return {
        amount,
        personName,
        dueDate,
        intent,
        rawDueText,
    };
}

/**
 * Parse amount from string (handles various formats)
 * Supports: 500, 10k, 10K, 1.5k, ₹500, Rs500, Rs.500, 10,000
 */
function parseAmount(amountStr: string): number | null {
    // Remove currency words/symbols and grouping commas, while preserving decimals.
    const cleaned = amountStr
        .replace(/₹/g, '')
        .replace(/,/g, '')
        .replace(/\$/g, '')
        .replace(/^rs\.?/i, '')
        .trim();

    // Handle 'k' suffix for thousands (10k = 10000, 1.5k = 1500)
    const kMatch = cleaned.match(/^([\d.]+)k$/i);
    if (kMatch) {
        const num = parseFloat(kMatch[1]);
        if (!isNaN(num) && num > 0) {
            return num * 1000;
        }
    }

    // Handle 'L' or 'lac' suffix for lakhs (1L = 100000)
    const lacMatch = cleaned.match(/^([\d.]+)(l|lac|lakh)$/i);
    if (lacMatch) {
        const num = parseFloat(lacMatch[1]);
        if (!isNaN(num) && num > 0) {
            return num * 100000;
        }
    }

    const amount = parseFloat(cleaned);

    if (isNaN(amount) || amount <= 0) return null;
    return amount;
}

/**
 * Parse due date from natural language
 */
function parseDueDate(dateStr: string): Date | undefined {
    const today = new Date();
    const str = dateStr.toLowerCase().trim();

    // Handle relative dates
    if (str === 'today') {
        return today;
    }
    if (str === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    }
    if (str === 'next week') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek;
    }
    if (str === 'next month') {
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
    }

    // Handle "in X days"
    const inDaysMatch = str.match(/^in\s+(\d+)\s+days?$/);
    if (inDaysMatch) {
        const days = parseInt(inDaysMatch[1]);
        const date = new Date(today);
        date.setDate(date.getDate() + days);
        return date;
    }

    // Handle "Xjan", "X jan", "jan X", "15 january", etc.
    const months: { [key: string]: number } = {
        'jan': 0, 'january': 0,
        'feb': 1, 'february': 1,
        'mar': 2, 'march': 2,
        'apr': 3, 'april': 3,
        'may': 4,
        'jun': 5, 'june': 5,
        'jul': 6, 'july': 6,
        'aug': 7, 'august': 7,
        'sep': 8, 'september': 8,
        'oct': 9, 'october': 9,
        'nov': 10, 'november': 10,
        'dec': 11, 'december': 11,
    };

    // Try "15jan" or "15 jan" format
    const dayMonthMatch = str.match(/^(\d{1,2})\s*([a-z]+)$/);
    if (dayMonthMatch) {
        const day = parseInt(dayMonthMatch[1]);
        const monthName = dayMonthMatch[2];
        if (months[monthName] !== undefined) {
            const date = new Date(today.getFullYear(), months[monthName], day);
            // If the date is in the past, assume next year
            if (date < today) {
                date.setFullYear(date.getFullYear() + 1);
            }
            return date;
        }
    }

    // Try "jan 15" format
    const monthDayMatch = str.match(/^([a-z]+)\s+(\d{1,2})$/);
    if (monthDayMatch) {
        const monthName = monthDayMatch[1];
        const day = parseInt(monthDayMatch[2]);
        if (months[monthName] !== undefined) {
            const date = new Date(today.getFullYear(), months[monthName], day);
            if (date < today) {
                date.setFullYear(date.getFullYear() + 1);
            }
            return date;
        }
    }

    return undefined;
}

function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function applyRepaymentToLendingRecords(
    personName: string,
    amount: number,
    ledgerId: string
): Promise<void> {
    // Scope lending records to THIS user's LENDINGS ledger. Without this, a
    // repayment for "John" would match and mutate lending rows belonging to
    // every other user who also has a borrower named "John".
    const { data: ledgerTransactions, error: ledgerTransactionsError } = await supabase
        .from('transactions')
        .select('id')
        .eq('ledger_id', ledgerId);

    if (ledgerTransactionsError) {
        console.error('Error fetching ledger transactions for repayment:', ledgerTransactionsError);
        return;
    }

    const transactionIds = (ledgerTransactions || []).map(transaction => transaction.id);
    if (transactionIds.length === 0) {
        return;
    }

    const { data: pendingLendings, error } = await supabase
        .from('lendings')
        .select('id, remaining_amount')
        .eq('borrower_name', personName)
        .neq('status', 'settled')
        .in('transaction_id', transactionIds)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching pending lending records:', error);
        return;
    }

    let remainingPayment = amount;

    for (const lending of pendingLendings || []) {
        if (remainingPayment <= 0) break;

        const currentRemaining = Number(lending.remaining_amount);
        const nextRemaining = Math.max(0, currentRemaining - remainingPayment);
        remainingPayment = Math.max(0, remainingPayment - currentRemaining);

        const { error: updateError } = await supabase
            .from('lendings')
            .update({
                remaining_amount: nextRemaining,
                status: nextRemaining === 0 ? 'settled' : 'partial',
            })
            .eq('id', lending.id);

        if (updateError) {
            console.error('Error updating lending record:', updateError);
            return;
        }
    }
}

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

        // Determine transaction details based on intent
        const intentConfig = {
            lent: {
                type: 'cash_out' as const,
                titlePrefix: 'Lent to',
                category: 'Lending',
                emoji: '💸',
                verb: 'Lent',
            },
            repaid: {
                type: 'cash_out' as const,
                titlePrefix: 'Repaid to',
                category: 'Repayment',
                emoji: '✅',
                verb: 'Repaid',
            },
            received: {
                type: 'cash_in' as const,
                titlePrefix: 'Received from',
                category: 'Repayment',
                emoji: '💰',
                verb: 'Received from',
            },
            borrowed: {
                type: 'cash_in' as const,
                titlePrefix: 'Borrowed from',
                category: 'Borrowing',
                emoji: '🔄',
                verb: 'Borrowed from',
            },
        };

        const config = intentConfig[parsed.intent];

        // Create the transaction
        const transaction = await createTransactionForUser(userId, {
            title: `${config.titlePrefix} ${parsed.personName}`,
            amount: parsed.amount,
            type: config.type,
            category: config.category,
            payment_mode: 'Cash',
            person: parsed.personName,
            ledger_id: ledger.id,
        });

        if (!transaction) {
            return { success: false, message: 'Failed to create transaction.' };
        }

        // Create lending record for tracking (for lent and borrowed)
        if (parsed.intent === 'lent' || parsed.intent === 'borrowed') {
            const { error } = await supabase
                .from('lendings')
                .insert([{
                    transaction_id: transaction.id,
                    borrower_name: parsed.personName,
                    due_date: parsed.dueDate?.toISOString(),
                    status: 'pending',
                    original_amount: parsed.amount,
                    remaining_amount: parsed.amount,
                    notes: parsed.rawDueText,
                }]);

            if (error) {
                console.error('Error creating lending record:', error);
            }
        }

        if (parsed.intent === 'received' || parsed.intent === 'repaid') {
            await applyRepaymentToLendingRecords(parsed.personName, parsed.amount, ledger.id);
        }

        // Format success message
        const amountStr = `₹${parsed.amount.toLocaleString('en-IN')}`;
        const personName = escapeTelegramHtml(parsed.personName);
        let successMsg = `${config.emoji} Recorded: ${config.verb} ${amountStr} ${parsed.intent === 'lent' || parsed.intent === 'repaid' ? 'to' : 'from'} ${personName}`;

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
