import { randomUUID } from 'crypto';
import {
    LendingEntryInput,
    LendingEntryResult,
    LendingRecord,
    Transaction,
} from '../supabase';
import {
    LENDING_INTENT_CONFIG,
    normalizePersonName,
    planRepaymentAllocations,
} from '../lending-domain';
import { postgres } from './postgres';

export class LendingDomainError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly status: number
    ) {
        super(message);
    }
}

function numbersIn<T extends Record<string, unknown>>(row: T): T {
    return {
        ...row,
        ...('amount' in row && { amount: Number(row.amount) }),
        ...('original_amount' in row && { original_amount: Number(row.original_amount) }),
        ...('remaining_amount' in row && { remaining_amount: Number(row.remaining_amount) }),
    };
}

export async function getLendingRecordsForUser(
    userId: string,
    ledgerId: string
): Promise<LendingRecord[]> {
    const result = await postgres.query(`
        SELECT lending.*
        FROM lendings AS lending
        JOIN transactions AS transaction ON transaction.id = lending.transaction_id
        JOIN ledgers AS ledger ON ledger.id = transaction.ledger_id
        WHERE ledger.user_id = $1 AND ledger.id = $2
        ORDER BY lending.created_at DESC
    `, [userId, ledgerId]);

    return result.rows.map(numbersIn) as LendingRecord[];
}

export async function createLendingEntryForUser(
    userId: string,
    input: LendingEntryInput
): Promise<LendingEntryResult> {
    const client = await postgres.connect();
    const config = LENDING_INTENT_CONFIG[input.intent];
    const person = normalizePersonName(input.person);
    const amount = Number(input.amount);

    if (!person || !Number.isFinite(amount) || amount <= 0) {
        throw new LendingDomainError('INVALID_LENDING_ENTRY', 'A person and positive amount are required.', 400);
    }

    try {
        await client.query('BEGIN');
        const ledger = await client.query(
            'SELECT id FROM ledgers WHERE id = $1 AND user_id = $2 FOR UPDATE',
            [input.ledger_id, userId]
        );
        if (ledger.rowCount === 0) {
            throw new LendingDomainError('LEDGER_NOT_FOUND', 'Lending ledger was not found.', 404);
        }

        const isOrigin = input.intent === 'lent' || input.intent === 'borrowed';
        const title = input.title?.trim() || `${config.titlePrefix} ${person}`;
        const transactionId = randomUUID();
        const transactionResult = await client.query(`
            INSERT INTO transactions
                (id, ledger_id, title, amount, type, category, payment_mode, person)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            transactionId,
            input.ledger_id,
            title,
            amount,
            config.type,
            config.category,
            input.payment_mode || 'Cash',
            person,
        ]);

        let lending: LendingRecord | undefined;
        const allocations: LendingEntryResult['allocations'] = [];
        let unallocatedAmount = 0;

        if (isOrigin) {
            const lendingResult = await client.query(`
                INSERT INTO lendings
                    (transaction_id, borrower_name, due_date, status, original_amount, remaining_amount, notes, kind)
                VALUES ($1, $2, $3, 'pending', $4, $4, $5, $6)
                RETURNING *
            `, [transactionId, person, input.due_date || null, amount, null, config.kind]);
            lending = numbersIn(lendingResult.rows[0]) as LendingRecord;
        } else {
            const targetFilter = input.target_transaction_id
                ? 'AND original.id = $5'
                : '';
            const params = input.target_transaction_id
                ? [userId, input.ledger_id, person, config.kind, input.target_transaction_id]
                : [userId, input.ledger_id, person, config.kind];
            let openRecords = await client.query(`
                SELECT lending.*
                FROM lendings AS lending
                JOIN transactions AS original ON original.id = lending.transaction_id
                JOIN ledgers AS ledger ON ledger.id = original.ledger_id
                WHERE ledger.user_id = $1
                  AND ledger.id = $2
                  AND lower(trim(lending.borrower_name)) = lower(trim($3))
                  AND lending.kind = $4
                  AND lending.status <> 'settled'
                  ${targetFilter}
                ORDER BY lending.created_at ASC
                FOR UPDATE OF lending
            `, params);

            if (input.target_transaction_id && openRecords.rowCount === 0) {
                // Older web entries predate the unified lending table. Adopt a
                // valid legacy origin lazily so it can still receive payments.
                const legacyOrigin = await client.query(`
                    SELECT transaction.*
                    FROM transactions AS transaction
                    JOIN ledgers AS ledger ON ledger.id = transaction.ledger_id
                    WHERE transaction.id = $1
                      AND transaction.ledger_id = $2
                      AND ledger.user_id = $3
                      AND lower(trim(transaction.person)) = lower(trim($4))
                      AND transaction.category = $5
                    FOR UPDATE OF transaction
                `, [
                    input.target_transaction_id,
                    input.ledger_id,
                    userId,
                    person,
                    config.kind === 'receivable' ? 'Lending' : 'Borrowing',
                ]);

                if ((legacyOrigin.rowCount ?? 0) > 0) {
                    await client.query(`
                        INSERT INTO lendings
                            (transaction_id, borrower_name, status, original_amount, remaining_amount, kind)
                        VALUES ($1, $2, 'pending', $3, $3, $4)
                        ON CONFLICT (transaction_id) DO NOTHING
                    `, [input.target_transaction_id, person, legacyOrigin.rows[0].amount, config.kind]);
                    openRecords = await client.query(`
                        SELECT * FROM lendings
                        WHERE transaction_id = $1 AND status <> 'settled'
                        FOR UPDATE
                    `, [input.target_transaction_id]);
                }
            }

            if (input.target_transaction_id && openRecords.rowCount === 0) {
                throw new LendingDomainError('LENDING_NOT_FOUND', 'This lending is already settled or no longer exists.', 409);
            }

            const available = openRecords.rows.reduce(
                (sum, record) => sum + Number(record.remaining_amount),
                0
            );
            if (input.target_transaction_id && amount > available) {
                throw new LendingDomainError(
                    'REPAYMENT_EXCEEDS_BALANCE',
                    `The remaining amount for this record is ₹${available.toLocaleString('en-IN')}.`,
                    422
                );
            }

            const plan = planRepaymentAllocations(openRecords.rows, amount);
            for (const allocation of plan.allocations) {
                await client.query(`
                    UPDATE lendings
                    SET remaining_amount = $1,
                        status = CASE WHEN $1 = 0 THEN 'settled' ELSE 'partial' END
                    WHERE id = $2
                `, [allocation.remaining_amount, allocation.lending_id]);
                await client.query(`
                    INSERT INTO lending_payments (lending_id, transaction_id, amount)
                    VALUES ($1, $2, $3)
                `, [allocation.lending_id, transactionId, allocation.amount]);
                allocations.push({
                    lending_id: allocation.lending_id,
                    transaction_id: transactionId,
                    amount: allocation.amount,
                });
            }
            unallocatedAmount = plan.unallocated_amount;
        }

        await client.query('COMMIT');
        return {
            transaction: numbersIn(transactionResult.rows[0]) as Transaction,
            lending,
            allocations,
            unallocated_amount: unallocatedAmount,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function deleteTransactionWithLendingEffectsForUser(
    userId: string,
    transactionId: string
): Promise<void> {
    const client = await postgres.connect();
    try {
        await client.query('BEGIN');
        const ownedTransaction = await client.query(`
            SELECT transaction.id
            FROM transactions AS transaction
            JOIN ledgers AS ledger ON ledger.id = transaction.ledger_id
            WHERE transaction.id = $1 AND ledger.user_id = $2
            FOR UPDATE OF transaction
        `, [transactionId, userId]);
        if (ownedTransaction.rowCount === 0) {
            throw new LendingDomainError('TRANSACTION_NOT_FOUND', 'Transaction was not found.', 404);
        }

        const origin = await client.query(
            'SELECT id FROM lendings WHERE transaction_id = $1 FOR UPDATE',
            [transactionId]
        );
        if ((origin.rowCount ?? 0) > 0) {
            const payments = await client.query(
                'SELECT 1 FROM lending_payments WHERE lending_id = $1 LIMIT 1',
                [origin.rows[0].id]
            );
            if ((payments.rowCount ?? 0) > 0) {
                throw new LendingDomainError(
                    'LENDING_HAS_REPAYMENTS',
                    'Delete its repayment entries before deleting this lending.',
                    409
                );
            }
        }

        const allocations = await client.query(`
            SELECT payment.lending_id, payment.amount, lending.original_amount, lending.remaining_amount
            FROM lending_payments AS payment
            JOIN lendings AS lending ON lending.id = payment.lending_id
            WHERE payment.transaction_id = $1
            FOR UPDATE OF lending
        `, [transactionId]);
        for (const allocation of allocations.rows) {
            const restored = Math.min(
                Number(allocation.original_amount),
                Number(allocation.remaining_amount) + Number(allocation.amount)
            );
            await client.query(`
                UPDATE lendings
                SET remaining_amount = $1,
                    status = CASE WHEN $1 = original_amount THEN 'pending' ELSE 'partial' END
                WHERE id = $2
            `, [restored, allocation.lending_id]);
        }

        await client.query('DELETE FROM transactions WHERE id = $1', [transactionId]);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
