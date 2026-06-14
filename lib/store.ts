import { Ledger, LendingContact, Transaction } from './supabase';

// This is the CLIENT-side data layer. It never talks to Supabase directly —
// all access goes through authenticated API routes under /app/api, which verify
// the session server-side and enforce per-user ownership (see lib/server/db.ts).
// The client is never trusted to supply its own user id.

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T | null> {
    try {
        const response = await fetch(input, {
            ...init,
            headers: {
                ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
                ...init?.headers,
            },
        });
        if (!response.ok) {
            return null;
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error(`Request to ${input} failed:`, error);
        return null;
    }
}

// ============ LOCAL CONTACT FALLBACK ============
// Lending contacts gracefully degrade to localStorage if the API is unavailable.

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

export async function getLedgers(_userId: string): Promise<Ledger[]> {
    return (await fetchJson<Ledger[]>('/api/ledgers')) || [];
}

export async function createLedger(
    name: string,
    categories: string[],
    paymentModes: string[],
    _userId: string
): Promise<Ledger | null> {
    return fetchJson<Ledger>('/api/ledgers', {
        method: 'POST',
        body: JSON.stringify({ name, categories, payment_modes: paymentModes }),
    });
}

export async function deleteLedger(id: string): Promise<boolean> {
    const result = await fetchJson<{ success: boolean }>(`/api/ledgers/${id}`, {
        method: 'DELETE',
    });
    return !!result?.success;
}

export async function updateLedger(id: string, updates: Partial<Ledger>): Promise<Ledger | null> {
    return fetchJson<Ledger>(`/api/ledgers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
            name: updates.name,
            categories: updates.categories,
            payment_modes: updates.payment_modes,
        }),
    });
}

export async function getLedgerById(id: string): Promise<Ledger | null> {
    return fetchJson<Ledger>(`/api/ledgers/${id}`);
}

// ============ TRANSACTION OPERATIONS ============

export async function getTransactionsByLedger(ledgerId: string): Promise<Transaction[]> {
    return (await fetchJson<Transaction[]>(`/api/transactions?ledgerId=${encodeURIComponent(ledgerId)}`)) || [];
}

export async function createTransaction(
    data: Omit<Transaction, 'id' | 'created_at'>
): Promise<Transaction | null> {
    return fetchJson<Transaction>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function deleteTransaction(id: string): Promise<boolean> {
    const result = await fetchJson<{ success: boolean }>(`/api/transactions/${id}`, {
        method: 'DELETE',
    });
    return !!result?.success;
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
    return fetchJson<Transaction>(`/api/transactions/${id}`);
}

export async function updateTransaction(
    id: string,
    updates: Partial<Transaction>
): Promise<Transaction | null> {
    return fetchJson<Transaction>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
}

// ============ LENDING CONTACT OPERATIONS ============

export async function getLendingContacts(
    userId: string,
    ledgerId: string
): Promise<LendingContact[]> {
    const contacts = await fetchJson<LendingContact[]>(
        `/api/contacts?ledgerId=${encodeURIComponent(ledgerId)}`
    );

    if (contacts === null) {
        return getLocalLendingContacts(userId, ledgerId);
    }
    return contacts;
}

export async function upsertLendingContact(
    userId: string,
    ledgerId: string,
    personName: string,
    phoneNumber: string
): Promise<LendingContact | null> {
    const contact = await fetchJson<LendingContact>('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ ledgerId, personName, phoneNumber }),
    });

    if (contact === null) {
        return saveLocalLendingContact(userId, ledgerId, personName, phoneNumber);
    }
    return contact;
}
