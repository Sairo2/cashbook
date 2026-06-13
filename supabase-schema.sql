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
-- TELEGRAM + LENDINGS TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    telegram_chat_id TEXT NOT NULL,
    telegram_username TEXT,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_links_user_id ON telegram_links(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_links_chat_id ON telegram_links(telegram_chat_id);

CREATE TABLE IF NOT EXISTS telegram_link_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_link_codes_code ON telegram_link_codes(code);
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_user_id ON telegram_link_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expires_at ON telegram_link_codes(expires_at);

CREATE TABLE IF NOT EXISTS lendings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    borrower_name TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'settled')),
    original_amount DECIMAL(12,2) NOT NULL,
    remaining_amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lendings_transaction_id ON lendings(transaction_id);
CREATE INDEX IF NOT EXISTS idx_lendings_status ON lendings(status);

CREATE TABLE IF NOT EXISTS lending_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, ledger_id, person_name)
);

CREATE INDEX IF NOT EXISTS idx_lending_contacts_user_ledger ON lending_contacts(user_id, ledger_id);

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
ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lendings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lending_contacts ENABLE ROW LEVEL SECURITY;

-- IMPORTANT:
-- These owner-scoped policies assume Supabase can identify the current user via
-- auth.uid() (Supabase Auth/JWT) or that writes happen through a trusted server
-- role. This app currently uses Better Auth, so direct browser access with only
-- the anon key will not satisfy these policies until Supabase receives a
-- user-scoped JWT or data access is moved behind authenticated server routes.

-- Policies for ledgers (users can only see their own ledgers)
DROP POLICY IF EXISTS "Users can view own ledgers" ON ledgers;
CREATE POLICY "Users can view own ledgers" ON ledgers
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own ledgers" ON ledgers;
CREATE POLICY "Users can insert own ledgers" ON ledgers
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own ledgers" ON ledgers;
CREATE POLICY "Users can update own ledgers" ON ledgers
    FOR UPDATE USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own ledgers" ON ledgers;
CREATE POLICY "Users can delete own ledgers" ON ledgers
    FOR DELETE USING (user_id = auth.uid()::text);

-- Policies for transactions
DROP POLICY IF EXISTS "Users can view transactions" ON transactions;
CREATE POLICY "Users can view transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ledgers
            WHERE ledgers.id = transactions.ledger_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;
CREATE POLICY "Users can insert transactions" ON transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ledgers
            WHERE ledgers.id = transactions.ledger_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can update transactions" ON transactions;
CREATE POLICY "Users can update transactions" ON transactions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM ledgers
            WHERE ledgers.id = transactions.ledger_id
            AND ledgers.user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ledgers
            WHERE ledgers.id = transactions.ledger_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can delete transactions" ON transactions;
CREATE POLICY "Users can delete transactions" ON transactions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM ledgers
            WHERE ledgers.id = transactions.ledger_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

-- Policies for Telegram and lending tables
DROP POLICY IF EXISTS "Users can view telegram links" ON telegram_links;
CREATE POLICY "Users can view telegram links" ON telegram_links
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert telegram links" ON telegram_links;
CREATE POLICY "Users can insert telegram links" ON telegram_links
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update telegram links" ON telegram_links;
CREATE POLICY "Users can update telegram links" ON telegram_links
    FOR UPDATE USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete telegram links" ON telegram_links;
CREATE POLICY "Users can delete telegram links" ON telegram_links
    FOR DELETE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view telegram link codes" ON telegram_link_codes;
CREATE POLICY "Users can view telegram link codes" ON telegram_link_codes
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert telegram link codes" ON telegram_link_codes;
CREATE POLICY "Users can insert telegram link codes" ON telegram_link_codes
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update telegram link codes" ON telegram_link_codes;
CREATE POLICY "Users can update telegram link codes" ON telegram_link_codes
    FOR UPDATE USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete telegram link codes" ON telegram_link_codes;
CREATE POLICY "Users can delete telegram link codes" ON telegram_link_codes
    FOR DELETE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view lendings" ON lendings;
CREATE POLICY "Users can view lendings" ON lendings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transactions
            JOIN ledgers ON ledgers.id = transactions.ledger_id
            WHERE transactions.id = lendings.transaction_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can insert lendings" ON lendings;
CREATE POLICY "Users can insert lendings" ON lendings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM transactions
            JOIN ledgers ON ledgers.id = transactions.ledger_id
            WHERE transactions.id = lendings.transaction_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can update lendings" ON lendings;
CREATE POLICY "Users can update lendings" ON lendings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM transactions
            JOIN ledgers ON ledgers.id = transactions.ledger_id
            WHERE transactions.id = lendings.transaction_id
            AND ledgers.user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM transactions
            JOIN ledgers ON ledgers.id = transactions.ledger_id
            WHERE transactions.id = lendings.transaction_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can delete lendings" ON lendings;
CREATE POLICY "Users can delete lendings" ON lendings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM transactions
            JOIN ledgers ON ledgers.id = transactions.ledger_id
            WHERE transactions.id = lendings.transaction_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can view lending contacts" ON lending_contacts;
CREATE POLICY "Users can view lending contacts" ON lending_contacts
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert lending contacts" ON lending_contacts;
CREATE POLICY "Users can insert lending contacts" ON lending_contacts
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update lending contacts" ON lending_contacts;
CREATE POLICY "Users can update lending contacts" ON lending_contacts
    FOR UPDATE USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete lending contacts" ON lending_contacts;
CREATE POLICY "Users can delete lending contacts" ON lending_contacts
    FOR DELETE USING (user_id = auth.uid()::text);

-- ============================================
-- DONE!
-- ============================================
-- Your database is ready. Tables created:
-- 1. ledgers - Stores ledger books
-- 2. transactions - Stores cash in/out entries
-- 3. user - Stores authenticated users (Better Auth)
-- 4. session - Stores user sessions (Better Auth)
-- 5. account - Stores OAuth accounts (Better Auth)
-- 6. telegram_links - Stores linked Telegram accounts
-- 7. telegram_link_codes - Stores short-lived linking codes
-- 8. lendings - Stores extra lending metadata
-- 9. lending_contacts - Stores saved phone numbers for lending reminders
