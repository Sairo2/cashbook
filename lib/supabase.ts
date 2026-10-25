import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type TransactionType = 'cash_in' | 'cash_out';

export interface Ledger {
    id: string;
    name: string;
    categories: string[];
    payment_modes: string[];
    created_at: string;
    user_id: string;
}

export interface Transaction {
    id: string;
    created_at: string;
    title: string;
    amount: number;
    type: TransactionType;
    category: string;
    payment_mode?: string;
    person?: string;
    ledger_id: string;
    // Present on a repayment that was created by settling a specific lending record.
    settles_transaction_id?: string;
}

export interface LendingContact {
    id: string;
    user_id: string;
    ledger_id: string;
    person_name: string;
    phone_number: string;
    created_at: string;
    updated_at: string;
}

export type LendingIntent = 'lent' | 'repaid' | 'received' | 'borrowed';
export type LendingKind = 'receivable' | 'payable';

export interface LendingRecord {
    id: string;
    transaction_id: string;
    borrower_name: string;
    due_date?: string;
    status: 'pending' | 'partial' | 'settled';
    original_amount: number;
    remaining_amount: number;
    notes?: string;
    kind: LendingKind;
    created_at: string;
}

export interface LendingEntryInput {
    ledger_id: string;
    intent: LendingIntent;
    amount: number;
    person: string;
    title?: string;
    payment_mode?: string;
    due_date?: string;
    target_transaction_id?: string;
}

export interface LendingEntryResult {
    transaction: Transaction;
    lending?: LendingRecord;
    allocations: Array<{
        lending_id: string;
        transaction_id: string;
        amount: number;
    }>;
    unallocated_amount: number;
}

// Default categories and payment modes for new ledgers
export const DEFAULT_CATEGORIES = [
    'Food',
    'Shopping',
    'Salary',
    'Rent',
    'Bills',
    'Transport',
    'Entertainment',
    'Health',
    'Education',
    'Other'
];

export const DEFAULT_PAYMENT_MODES = [
    'Cash',
    'UPI',
    'Credit Card',
    'Debit Card'
];
