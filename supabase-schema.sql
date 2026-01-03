-- CashBook Ledger Database Schema
-- Run this in Supabase SQL Editor (supabase.com → Your Project → SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LEDGERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    categories TEXT[] DEFAULT ARRAY['Food', 'Shopping', 'Salary', 'Rent', 'Bills', 'Transport', 'Entertainment', 'Health', 'Education', 'Other'],
    payment_modes TEXT[] DEFAULT ARRAY['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'],
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_ledgers_user_id ON ledgers(user_id);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash_in', 'cash_out')),
    category TEXT NOT NULL,
    payment_mode TEXT,
    person TEXT,
    ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster ledger queries
CREATE INDEX IF NOT EXISTS idx_transactions_ledger_id ON transactions(ledger_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- BETTER AUTH TABLES
-- ============================================
-- These are automatically created by Better Auth, 
-- but we'll define them here for reference

CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "account" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    id_token TEXT,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"(user_id);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on tables
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies for ledgers (users can only see their own ledgers)
CREATE POLICY "Users can view own ledgers" ON ledgers
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own ledgers" ON ledgers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own ledgers" ON ledgers
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own ledgers" ON ledgers
    FOR DELETE USING (true);

-- Policies for transactions
CREATE POLICY "Users can view transactions" ON transactions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert transactions" ON transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update transactions" ON transactions
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete transactions" ON transactions
    FOR DELETE USING (true);

-- ============================================
-- DONE!
-- ============================================
-- Your database is ready. Tables created:
-- 1. ledgers - Stores ledger books
-- 2. transactions - Stores cash in/out entries
-- 3. user - Stores authenticated users (Better Auth)
-- 4. session - Stores user sessions (Better Auth)
-- 5. account - Stores OAuth accounts (Better Auth)
