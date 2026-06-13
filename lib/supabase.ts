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
