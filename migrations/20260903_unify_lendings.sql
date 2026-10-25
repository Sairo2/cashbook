-- Make web and Telegram lending entries share one lifecycle.

ALTER TABLE lendings
    ADD COLUMN IF NOT EXISTS kind TEXT;

UPDATE lendings AS lending
SET kind = CASE
    WHEN transaction.category = 'Borrowing' THEN 'payable'
    ELSE 'receivable'
END
FROM transactions AS transaction
WHERE transaction.id = lending.transaction_id
  AND lending.kind IS NULL;

ALTER TABLE lendings
    ALTER COLUMN kind SET DEFAULT 'receivable',
    ALTER COLUMN kind SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lendings_kind_check'
    ) THEN
        ALTER TABLE lendings
            ADD CONSTRAINT lendings_kind_check
            CHECK (kind IN ('receivable', 'payable'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lendings_transaction_unique
    ON lendings(transaction_id);

CREATE INDEX IF NOT EXISTS idx_lendings_person_status
    ON lendings(lower(borrower_name), kind, status);

CREATE TABLE IF NOT EXISTS lending_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lending_id UUID NOT NULL REFERENCES lendings(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (lending_id, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_lending_payments_lending_id
    ON lending_payments(lending_id);
CREATE INDEX IF NOT EXISTS idx_lending_payments_transaction_id
    ON lending_payments(transaction_id);

CREATE TABLE IF NOT EXISTS telegram_updates (
    update_id BIGINT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'processed')),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE lending_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_updates ENABLE ROW LEVEL SECURITY;

UPDATE ledgers
SET categories = array_append(categories, 'Borrowing')
WHERE name = 'LENDINGS'
  AND NOT ('Borrowing' = ANY(categories));
