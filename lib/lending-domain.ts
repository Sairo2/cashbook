import type { LendingIntent, LendingKind, TransactionType } from './supabase';

export interface ParsedLending {
    amount: number;
    personName: string;
    dueDate?: Date;
    intent: LendingIntent;
    rawDueText?: string;
}

export const LENDING_INTENT_CONFIG: Record<LendingIntent, {
    type: TransactionType;
    category: 'Lending' | 'Repayment' | 'Borrowing';
    kind: LendingKind;
    titlePrefix: string;
}> = {
    lent: { type: 'cash_out', category: 'Lending', kind: 'receivable', titlePrefix: 'Lent to' },
    received: { type: 'cash_in', category: 'Repayment', kind: 'receivable', titlePrefix: 'Received from' },
    borrowed: { type: 'cash_in', category: 'Borrowing', kind: 'payable', titlePrefix: 'Borrowed from' },
    repaid: { type: 'cash_out', category: 'Repayment', kind: 'payable', titlePrefix: 'Repaid to' },
};

export function normalizePersonName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}

export function planRepaymentAllocations(
    records: Array<{ id: string; remaining_amount: number }>,
    paymentAmount: number
): {
    allocations: Array<{ lending_id: string; amount: number; remaining_amount: number }>;
    unallocated_amount: number;
} {
    let unallocated = paymentAmount;
    const allocations = [];
    for (const record of records) {
        if (unallocated <= 0) break;
        const applied = Math.min(unallocated, Number(record.remaining_amount));
        if (applied <= 0) continue;
        allocations.push({
            lending_id: record.id,
            amount: applied,
            remaining_amount: Number(record.remaining_amount) - applied,
        });
        unallocated -= applied;
    }
    return { allocations, unallocated_amount: unallocated };
}

export function parseLendingMessage(message: string): ParsedLending | null {
    const parts = message.trim().split(/\s+/);
    if (parts.length < 2) return null;

    const keyword = parts[0].toLowerCase();
    const intentByKeyword: Record<string, LendingIntent> = {
        gave: 'lent', lent: 'lent', give: 'lent', lend: 'lent',
        got: 'received', received: 'received', get: 'received',
        borrowed: 'borrowed', borrow: 'borrowed',
        repaid: 'repaid', repay: 'repaid', paid: 'repaid',
    };

    const explicitIntent = intentByKeyword[keyword];
    if (explicitIntent) {
        if (parts.length < 3) return null;
        return buildParsedLending(explicitIntent, parts[1], parts[2], parts.slice(3));
    }

    // Legacy shorthand: "500 john tomorrow" means money lent to John.
    return buildParsedLending('lent', parts[1], parts[0], parts.slice(2));
}

function buildParsedLending(
    intent: LendingIntent,
    rawPerson: string,
    rawAmount: string,
    dueParts: string[]
): ParsedLending | null {
    const amount = parseAmount(rawAmount);
    const personName = normalizePersonName(rawPerson);
    if (!amount || !personName) return null;

    const rawDueText = dueParts.length > 0 ? dueParts.join(' ') : undefined;
    return {
        intent,
        amount,
        personName: personName.charAt(0).toUpperCase() + personName.slice(1).toLowerCase(),
        dueDate: rawDueText ? parseDueDate(rawDueText) : undefined,
        rawDueText,
    };
}

export function parseAmount(amountText: string): number | null {
    const cleaned = amountText
        .replace(/₹/g, '')
        .replace(/,/g, '')
        .replace(/\$/g, '')
        .replace(/^rs\.?/i, '')
        .trim();
    const scaled = cleaned.match(/^([0-9]+(?:\.[0-9]+)?)(k|l|lac|lakh)$/i);
    const multiplier = scaled?.[2].toLowerCase() === 'k' ? 1_000 : scaled ? 100_000 : 1;
    const numericText = scaled?.[1] ?? cleaned;

    if (!/^\d+(?:\.\d+)?$/.test(numericText)) return null;
    const amount = Number(numericText) * multiplier;
    return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function parseDueDate(dateText: string, today = new Date()): Date | undefined {
    const text = dateText.toLowerCase().trim();
    const result = new Date(today);

    if (text === 'today') return result;
    if (text === 'tomorrow') {
        result.setDate(result.getDate() + 1);
        return result;
    }
    if (text === 'next week') {
        result.setDate(result.getDate() + 7);
        return result;
    }
    if (text === 'next month') {
        result.setMonth(result.getMonth() + 1);
        return result;
    }

    const inDays = text.match(/^in\s+(\d+)\s+days?$/);
    if (inDays) {
        result.setDate(result.getDate() + Number(inDays[1]));
        return result;
    }

    const months: Record<string, number> = {
        jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
        apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
        aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
        nov: 10, november: 10, dec: 11, december: 11,
    };
    const dayMonth = text.match(/^(\d{1,2})\s*([a-z]+)$/);
    const monthDay = text.match(/^([a-z]+)\s+(\d{1,2})$/);
    const day = Number(dayMonth?.[1] ?? monthDay?.[2]);
    const monthName = dayMonth?.[2] ?? monthDay?.[1];
    const month = monthName ? months[monthName] : undefined;
    if (month === undefined || day < 1 || day > 31) return undefined;

    const parsed = new Date(today.getFullYear(), month, day);
    if (parsed.getMonth() !== month || parsed.getDate() !== day) return undefined;
    if (parsed < today) parsed.setFullYear(parsed.getFullYear() + 1);
    return parsed;
}
