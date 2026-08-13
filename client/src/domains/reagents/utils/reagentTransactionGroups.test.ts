/**
 * Reagent Transaction Grouping
 *
 * Grouping decides what a user can void as one action, so the cases that matter are the ones
 * where the key isn't the timestamp: reversals written one transaction each, and two movements
 * that happen to share a moment but not a location.
 */

import { describe, expect, it } from 'vitest';

import { groupTransactions } from './reagentTransactionGroups';

import type { ReagentTransaction } from '@odysseus/shared-schemas';

const txn = (fields: Partial<ReagentTransaction> & { id: string }): ReagentTransaction => ({
  itemId: 'ritm-1',
  lotId: null,
  locationId: 'loc-1',
  labId: 'lab-1',
  type: 'issued',
  quantityChange: -1,
  quantityAfter: 0,
  performedBy: 'user-1',
  createdAt: new Date('2026-07-30T10:00:00.000Z'),
  isSeeded: false,
  ...fields,
});

describe('groupTransactions', () => {
  it('collapses a FEFO draw into one entry summing its lots', () => {
    const groups = groupTransactions([
      txn({ id: 'rtxn-a', lotId: 'rlot-1', quantityChange: -3 }),
      txn({ id: 'rtxn-b', lotId: 'rlot-2', quantityChange: -2 }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].quantityChange).toBe(-5);
    expect(groups[0].transactions.map(t => t.id)).toEqual(['rtxn-a', 'rtxn-b']);
  });

  it('keeps movements apart when they share a timestamp but not a location', () => {
    const groups = groupTransactions([
      txn({ id: 'rtxn-a', locationId: 'loc-1' }),
      txn({ id: 'rtxn-b', locationId: 'loc-2' }),
    ]);

    expect(groups).toHaveLength(2);
  });

  it('keeps movements apart when they share a timestamp but not a type', () => {
    const groups = groupTransactions([
      txn({ id: 'rtxn-a', type: 'issued' }),
      txn({ id: 'rtxn-b', type: 'disposed' }),
    ]);

    expect(groups).toHaveLength(2);
  });

  it('groups reversals by the movement they undo, not by their own timestamps', () => {
    const groups = groupTransactions([
      txn({ id: 'rtxn-a', quantityChange: -3, voidedAt: new Date('2026-07-30T11:00:00.000Z') }),
      txn({ id: 'rtxn-b', quantityChange: -2, voidedAt: new Date('2026-07-30T11:00:00.000Z') }),
      txn({
        id: 'rtxn-rev-a',
        type: 'void_reversal',
        quantityChange: 3,
        relatedTransactionId: 'rtxn-a',
        createdAt: new Date('2026-07-30T11:00:00.000Z'),
      }),
      txn({
        id: 'rtxn-rev-b',
        type: 'void_reversal',
        quantityChange: 2,
        relatedTransactionId: 'rtxn-b',
        createdAt: new Date('2026-07-30T11:00:01.000Z'),
      }),
    ]);

    expect(groups).toHaveLength(2);
    const reversal = groups.find(g => g.type === 'void_reversal');
    expect(reversal?.transactions).toHaveLength(2);
    expect(reversal?.quantityChange).toBe(5);
  });

  it('counts how many of a movement’s rows are voided', () => {
    const groups = groupTransactions([
      txn({ id: 'rtxn-a', voidedAt: new Date('2026-07-30T11:00:00.000Z') }),
      txn({ id: 'rtxn-b' }),
      txn({ id: 'rtxn-c' }),
    ]);

    expect(groups[0].voidedCount).toBe(1);
    expect(groups[0].transactions).toHaveLength(3);
  });
});
