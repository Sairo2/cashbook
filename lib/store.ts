import { supabase, Ledger, LendingContact, Transaction } from './supabase';

function formatSupabaseError(error: unknown): string {
    if (!error || typeof error !== 'object') {
        return String(error);
    }

    const record = error as Record<string, unknown>;
    return [record.message, record.details, record.hint, record.code]
        .filter(Boolean)
        .join(' | ') || JSON.stringify(record);
}

function getLocalLendingContacts(userId: string, ledgerId: string): LendingContact[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const stored = window.localStorage.getItem(`lending_contacts:${userId}:${ledgerId}`);
        return stored ? JSON.parse(stored) as LendingContact[] : [];
    } catch {
        return [];
    }
}

function saveLocalLendingContact(
    userId: string,
    ledgerId: string,
    personName: string,
    phoneNumber: string
): LendingContact | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const now = new Date().toISOString();
    const key = `lending_contacts:${userId}:${ledgerId}`;
    const existing = getLocalLendingContacts(userId, ledgerId);
    const contact: LendingContact = {
        id: `${ledgerId}:${personName.toLowerCase()}`,
        user_id: userId,
        ledger_id: ledgerId,
        person_name: personName,
        phone_number: phoneNumber,
        created_at: existing.find(c => c.person_name.toLowerCase() === personName.toLowerCase())?.created_at || now,
        updated_at: now,
    };

    const nextContacts = [
        contact,
        ...existing.filter(c => c.person_name.toLowerCase() !== personName.toLowerCase()),
    ];

    try {
        window.localStorage.setItem(key, JSON.stringify(nextContacts));
    } catch {
        return null;
    }

    return contact;
}

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
    // Only delete the ledger — transactions are handled by ON DELETE CASCADE
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
    const { data, error } = await supabase
        .from('ledgers')
        .update({
            ...(updates.name !== undefined && { name: updates.name }),
            ...(updates.categories !== undefined && { categories: updates.categories }),
            ...(updates.payment_modes !== undefined && { payment_modes: updates.payment_modes }),
        })
        .eq('id', id)
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
    const { data, error } = await supabase
        .from('transactions')
        .update({
            ...(updates.title !== undefined && { title: updates.title }),
            ...(updates.amount !== undefined && { amount: updates.amount }),
            ...(updates.type !== undefined && { type: updates.type }),
            ...(updates.category !== undefined && { category: updates.category }),
            ...(updates.payment_mode !== undefined && { payment_mode: updates.payment_mode }),
            ...(updates.person !== undefined && { person: updates.person }),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating transaction:', error);
        return null;
    }
    return data;
}

// ============ LENDING CONTACT OPERATIONS ============

export async function getLendingContacts(
    userId: string,
    ledgerId: string
): Promise<LendingContact[]> {
    const { data, error } = await supabase
        .from('lending_contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('ledger_id', ledgerId);

    if (error) {
        console.warn('Lending contacts unavailable, using local fallback:', formatSupabaseError(error));
        return getLocalLendingContacts(userId, ledgerId);
    }

    return data || [];
}

export async function upsertLendingContact(
    userId: string,
    ledgerId: string,
    personName: string,
    phoneNumber: string
): Promise<LendingContact | null> {
    const { data, error } = await supabase
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
        console.warn('Could not save lending contact to Supabase, using local fallback:', formatSupabaseError(error));
        return saveLocalLendingContact(userId, ledgerId, personName, phoneNumber);
    }

    return data;
}
