import { createClient } from '@supabase/supabase-js';
import { Ledger, Transaction } from './supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============ LEDGER OPERATIONS ============

export async function getLedgers(userId: string): Promise<Ledger[]> {
    const { data, error } = await supabase
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

export async function createLedger(
    name: string,
    categories: string[],
    paymentModes: string[],
    userId: string
): Promise<Ledger | null> {
    const { data, error } = await supabase
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

export async function deleteLedger(id: string): Promise<boolean> {
    // First delete all transactions in this ledger
    const { error: txnError } = await supabase
        .from('transactions')
        .delete()
        .eq('ledger_id', id);

    if (txnError) {
        console.error('Error deleting transactions:', txnError);
        return false;
    }

    const { error } = await supabase
        .from('ledgers')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting ledger:', error);
        return false;
    }
    return true;
}

export async function updateLedger(id: string, updates: Partial<Ledger>): Promise<Ledger | null> {
    // First get the existing ledger
    const existing = await getLedgerById(id);
    if (!existing) {
        console.error('Ledger not found');
        return null;
    }

    // Use upsert to update (works around some CORS/RLS issues)
    const { data, error } = await supabase
        .from('ledgers')
        .upsert({
            id: existing.id,
            user_id: existing.user_id,
            created_at: existing.created_at,
            name: updates.name ?? existing.name,
            categories: updates.categories ?? existing.categories,
            payment_modes: updates.payment_modes ?? existing.payment_modes,
        })
        .select()
        .single();

    if (error) {
        console.error('Error updating ledger:', error);
        return null;
    }
    return data;
}

export async function getLedgerById(id: string): Promise<Ledger | null> {
    const { data, error } = await supabase
        .from('ledgers')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching ledger:', error);
        return null;
    }
    return data;
}

// ============ TRANSACTION OPERATIONS ============

export async function getTransactionsByLedger(ledgerId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('ledger_id', ledgerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
    return data || [];
}

export async function createTransaction(
    data: Omit<Transaction, 'id' | 'created_at'>
): Promise<Transaction | null> {
    const { data: newTransaction, error } = await supabase
        .from('transactions')
        .insert([data])
        .select()
        .single();

    if (error) {
        console.error('Error creating transaction:', error);
        return null;
    }
    return newTransaction;
}

export async function deleteTransaction(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting transaction:', error);
        return false;
    }
    return true;
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching transaction:', error);
        return null;
    }
    return data;
}

export async function updateTransaction(
    id: string,
    updates: Partial<Transaction>
): Promise<Transaction | null> {
    // First get the existing transaction
    const existing = await getTransactionById(id);
    if (!existing) {
        console.error('Transaction not found');
        return null;
    }

    // Use upsert to update (works around some CORS/RLS issues)
    const { data, error } = await supabase
        .from('transactions')
        .upsert({
            id: existing.id,
            ledger_id: existing.ledger_id,
            created_at: existing.created_at,
            title: updates.title ?? existing.title,
            amount: updates.amount ?? existing.amount,
            type: updates.type ?? existing.type,
            category: updates.category ?? existing.category,
            payment_mode: updates.payment_mode ?? existing.payment_mode,
            person: updates.person ?? existing.person,
        })
        .select()
        .single();

    if (error) {
        console.error('Error updating transaction:', error);
        return null;
    }
    return data;
}
