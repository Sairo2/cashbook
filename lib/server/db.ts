// Server-only data layer.
//
// All database access for user data goes through here. It uses the Supabase
// SERVICE ROLE key (which bypasses RLS) and therefore MUST enforce ownership
// itself: every function takes a trusted `userId` (resolved from the verified
// session by the caller) and scopes/validates every query against it.
//
// This file must never be imported from client code — the service role key
// would leak. The guard below makes accidental client bundling fail loudly.

import { createClient } from '@supabase/supabase-js';
import { Ledger, LendingContact, Transaction } from '../supabase';

if (typeof window !== 'undefined') {
    throw new Error('lib/server/db.ts must not be imported from the browser');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer the new Supabase secret key (sb_secret_...). Fall back to the legacy
// service_role key so existing deployments keep working. Both bypass RLS and
// must stay server-side only.
const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!secretKey) {
    console.error('SUPABASE_SECRET_KEY is not set — server data access will fail');
}

export const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    secretKey || 'placeholder',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Postgres numeric/decimal can arrive as a string over the wire. Coerce amount
// to a real number so downstream arithmetic never string-concatenates.
function normalizeTransaction<T extends { amount: unknown } | null>(transaction: T): T {
    if (!transaction) {
        return transaction;
    }
    return { ...transaction, amount: Number(transaction.amount) };
}

// ============ OWNERSHIP HELPERS ============

async function userOwnsLedger(userId: string, ledgerId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from('ledgers')
        .select('id')
        .eq('id', ledgerId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error verifying ledger ownership:', error);
        return false;
    }
    return !!data;
}

async function getTransactionLedgerId(transactionId: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('ledger_id')
        .eq('id', transactionId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching transaction ledger:', error);
        return null;
    }
    return data?.ledger_id ?? null;
}

async function userOwnsTransaction(userId: string, transactionId: string): Promise<boolean> {
    const ledgerId = await getTransactionLedgerId(transactionId);
    if (!ledgerId) return false;
    return userOwnsLedger(userId, ledgerId);
}

// ============ LEDGER OPERATIONS ============

export async function getLedgersForUser(userId: string): Promise<Ledger[]> {
    const { data, error } = await supabaseAdmin
        .from('ledgers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching ledgers:', error);
        return [];
    }
    return data || [];
}

export async function getLedgerForUser(userId: string, ledgerId: string): Promise<Ledger | null> {
    const { data, error } = await supabaseAdmin
        .from('ledgers')
        .select('*')
        .eq('id', ledgerId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching ledger:', error);
        return null;
    }
    return data;
}

export async function createLedgerForUser(
    userId: string,
    name: string,
    categories: string[],
    paymentModes: string[]
): Promise<Ledger | null> {
    const { data, error } = await supabaseAdmin
        .from('ledgers')
        .insert([{
            name,
            categories,
            payment_modes: paymentModes,
            user_id: userId,
        }])
        .select()
        .single();

    if (error) {
        console.error('Error creating ledger:', error);
        return null;
    }
    return data;
}

export async function updateLedgerForUser(
    userId: string,
    ledgerId: string,
    updates: Partial<Ledger>
): Promise<Ledger | null> {
    const { data, error } = await supabaseAdmin
        .from('ledgers')
        .update({
            ...(updates.name !== undefined && { name: updates.name }),
            ...(updates.categories !== undefined && { categories: updates.categories }),
            ...(updates.payment_modes !== undefined && { payment_modes: updates.payment_modes }),
        })
        .eq('id', ledgerId)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('Error updating ledger:', error);
        return null;
    }
    return data;
}

export async function deleteLedgerForUser(userId: string, ledgerId: string): Promise<boolean> {
    // Transactions are removed via ON DELETE CASCADE.
    const { error } = await supabaseAdmin
        .from('ledgers')
        .delete()
        .eq('id', ledgerId)
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting ledger:', error);
        return false;
    }
    return true;
}

// ============ TRANSACTION OPERATIONS ============

export async function getTransactionsForUser(
    userId: string,
    ledgerId: string
): Promise<Transaction[]> {
    if (!(await userOwnsLedger(userId, ledgerId))) {
        return [];
    }

    const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('ledger_id', ledgerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
    return (data || []).map(normalizeTransaction);
}

export async function getTransactionForUser(
    userId: string,
    transactionId: string
): Promise<Transaction | null> {
    if (!(await userOwnsTransaction(userId, transactionId))) {
        return null;
    }

    const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching transaction:', error);
        return null;
    }
    return normalizeTransaction(data);
}

export async function createTransactionForUser(
    userId: string,
    data: Omit<Transaction, 'id' | 'created_at'>
): Promise<Transaction | null> {
    if (!(await userOwnsLedger(userId, data.ledger_id))) {
        return null;
    }

    const { data: newTransaction, error } = await supabaseAdmin
        .from('transactions')
        .insert([data])
        .select()
        .single();

    if (error) {
        console.error('Error creating transaction:', error);
        return null;
    }
    return normalizeTransaction(newTransaction);
}

export async function updateTransactionForUser(
    userId: string,
    transactionId: string,
    updates: Partial<Transaction>
): Promise<Transaction | null> {
    if (!(await userOwnsTransaction(userId, transactionId))) {
        return null;
    }

    const { data, error } = await supabaseAdmin
        .from('transactions')
        .update({
            ...(updates.title !== undefined && { title: updates.title }),
            ...(updates.amount !== undefined && { amount: updates.amount }),
            ...(updates.type !== undefined && { type: updates.type }),
            ...(updates.category !== undefined && { category: updates.category }),
            ...(updates.payment_mode !== undefined && { payment_mode: updates.payment_mode }),
            ...(updates.person !== undefined && { person: updates.person }),
        })
        .eq('id', transactionId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('Error updating transaction:', error);
        return null;
    }
    return normalizeTransaction(data);
}

export async function deleteTransactionForUser(
    userId: string,
    transactionId: string
): Promise<boolean> {
    if (!(await userOwnsTransaction(userId, transactionId))) {
        return false;
    }

    const { error } = await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('id', transactionId);

    if (error) {
        console.error('Error deleting transaction:', error);
        return false;
    }
    return true;
}

// ============ LENDING CONTACT OPERATIONS ============

export async function getLendingContactsForUser(
    userId: string,
    ledgerId: string
): Promise<LendingContact[]> {
    if (!(await userOwnsLedger(userId, ledgerId))) {
        return [];
    }

    const { data, error } = await supabaseAdmin
        .from('lending_contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('ledger_id', ledgerId);

    if (error) {
        console.error('Error fetching lending contacts:', error);
        return [];
    }
    return data || [];
}

export async function upsertLendingContactForUser(
    userId: string,
    ledgerId: string,
    personName: string,
    phoneNumber: string
): Promise<LendingContact | null> {
    if (!(await userOwnsLedger(userId, ledgerId))) {
        return null;
    }

    const { data, error } = await supabaseAdmin
        .from('lending_contacts')
        .upsert({
            user_id: userId,
            ledger_id: ledgerId,
            person_name: personName,
            phone_number: phoneNumber,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,ledger_id,person_name',
        })
        .select()
        .single();

    if (error) {
        console.error('Error upserting lending contact:', error);
        return null;
    }
    return data;
}
