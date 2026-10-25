import assert from 'node:assert/strict';
import test from 'node:test';
import {
    LENDING_INTENT_CONFIG,
    normalizePersonName,
    parseAmount,
    parseDueDate,
    parseLendingMessage,
    planRepaymentAllocations,
} from '../lib/lending-domain.ts';

test('maps each lending intent to the correct balance direction', () => {
    assert.deepEqual(
        Object.fromEntries(Object.entries(LENDING_INTENT_CONFIG).map(([intent, value]) => [intent, [value.type, value.kind]])),
        {
            lent: ['cash_out', 'receivable'],
            received: ['cash_in', 'receivable'],
            borrowed: ['cash_in', 'payable'],
            repaid: ['cash_out', 'payable'],
        }
    );
});

test('parses explicit and shorthand Telegram messages', () => {
    const parsed = parseLendingMessage('gave john 1.5k tomorrow');
    assert.equal(parsed?.intent, 'lent');
    assert.equal(parsed?.amount, 1500);
    assert.equal(parsed?.personName, 'John');
    assert.equal(parsed?.rawDueText, 'tomorrow');
    assert.ok(parsed?.dueDate instanceof Date);
    assert.equal(parseLendingMessage('received MARY 500')?.intent, 'received');
    assert.equal(parseLendingMessage('₹2,000 rahul next week')?.amount, 2000);
});

test('rejects partially numeric and malformed amounts', () => {
    assert.equal(parseAmount('12abc'), null);
    assert.equal(parseAmount('1.2.3k'), null);
    assert.equal(parseAmount('-100'), null);
    assert.equal(parseAmount('0'), null);
});

test('normalizes person whitespace without destroying display casing', () => {
    assert.equal(normalizePersonName('  Mary   Jane  '), 'Mary Jane');
});

test('rejects impossible calendar dates', () => {
    assert.equal(parseDueDate('31 feb', new Date('2026-01-01T00:00:00Z')), undefined);
    assert.equal(parseDueDate('tomorrow', new Date('2026-09-03T00:00:00Z'))?.getDate(), 4);
});

test('allocates partial repayments oldest-first and preserves excess', () => {
    assert.deepEqual(planRepaymentAllocations([
        { id: 'oldest', remaining_amount: 300 },
        { id: 'newest', remaining_amount: 500 },
    ], 450), {
        allocations: [
            { lending_id: 'oldest', amount: 300, remaining_amount: 0 },
            { lending_id: 'newest', amount: 150, remaining_amount: 350 },
        ],
        unallocated_amount: 0,
    });
    assert.equal(planRepaymentAllocations([{ id: 'one', remaining_amount: 100 }], 125).unallocated_amount, 25);
});
