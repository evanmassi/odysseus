/**
 * Reagent FEFO Consumption Tests
 *
 * Verifies earliest-expiry ordering, cross-lot spanning, expired handling, and
 * shortfall reporting for the pure draw planner.
 */

import { isLotExpired, planFefoDraw, type FefoLot } from './reagentFefo';

const TODAY = '2026-07-25';

describe('isLotExpired', () => {
  it('treats an undated lot as never expired', () => {
    expect(isLotExpired(undefined, TODAY)).toBe(false);
  });

  it('is false on the expiration day and true the day before', () => {
    expect(isLotExpired('2026-07-25', TODAY)).toBe(false);
    expect(isLotExpired('2026-07-24', TODAY)).toBe(true);
    expect(isLotExpired('2026-07-26', TODAY)).toBe(false);
  });
});

describe('planFefoDraw', () => {
  it('draws from a single lot when it covers the amount', () => {
    const lots: FefoLot[] = [{ id: 'a', quantity: 100, expirationDate: '2026-12-01' }];
    const plan = planFefoDraw(lots, 40, { includeExpired: false, today: TODAY });
    expect(plan.draws).toEqual([{ lotId: 'a', amount: 40 }]);
    expect(plan.shortfall).toBe(0);
  });

  it('spans lots earliest-expiry first', () => {
    const lots: FefoLot[] = [
      { id: 'late', quantity: 80, expirationDate: '2027-01-01' },
      { id: 'early', quantity: 60, expirationDate: '2026-09-01' },
    ];
    const plan = planFefoDraw(lots, 100, { includeExpired: false, today: TODAY });
    expect(plan.draws).toEqual([
      { lotId: 'early', amount: 60 },
      { lotId: 'late', amount: 40 },
    ]);
    expect(plan.shortfall).toBe(0);
  });

  it('sorts undated lots after dated ones', () => {
    const lots: FefoLot[] = [
      { id: 'undated', quantity: 50 },
      { id: 'dated', quantity: 50, expirationDate: '2026-10-01' },
    ];
    const plan = planFefoDraw(lots, 60, { includeExpired: false, today: TODAY });
    expect(plan.draws).toEqual([
      { lotId: 'dated', amount: 50 },
      { lotId: 'undated', amount: 10 },
    ]);
  });

  it('skips expired lots by default, reporting the shortfall', () => {
    const lots: FefoLot[] = [
      { id: 'expired', quantity: 100, expirationDate: '2026-01-01' },
      { id: 'fresh', quantity: 30, expirationDate: '2026-12-01' },
    ];
    const plan = planFefoDraw(lots, 50, { includeExpired: false, today: TODAY });
    expect(plan.draws).toEqual([{ lotId: 'fresh', amount: 30 }]);
    expect(plan.shortfall).toBe(20);
  });

  it('draws expired lots only after non-expired when includeExpired is set', () => {
    const lots: FefoLot[] = [
      { id: 'expired', quantity: 100, expirationDate: '2026-01-01' },
      { id: 'fresh', quantity: 30, expirationDate: '2026-12-01' },
    ];
    const plan = planFefoDraw(lots, 50, { includeExpired: true, today: TODAY });
    expect(plan.draws).toEqual([
      { lotId: 'fresh', amount: 30 },
      { lotId: 'expired', amount: 20 },
    ]);
    expect(plan.shortfall).toBe(0);
  });

  it('ignores depleted (zero-quantity) lots', () => {
    const lots: FefoLot[] = [
      { id: 'empty', quantity: 0, expirationDate: '2026-08-01' },
      { id: 'stock', quantity: 25, expirationDate: '2026-09-01' },
    ];
    const plan = planFefoDraw(lots, 25, { includeExpired: false, today: TODAY });
    expect(plan.draws).toEqual([{ lotId: 'stock', amount: 25 }]);
    expect(plan.shortfall).toBe(0);
  });

  it('reports a shortfall when total on-hand cannot cover the request', () => {
    const lots: FefoLot[] = [{ id: 'a', quantity: 10, expirationDate: '2026-12-01' }];
    const plan = planFefoDraw(lots, 25, { includeExpired: false, today: TODAY });
    expect(plan.draws).toEqual([{ lotId: 'a', amount: 10 }]);
    expect(plan.shortfall).toBe(15);
  });

  it('handles decimal quantities without a phantom shortfall', () => {
    const lots: FefoLot[] = [
      { id: 'a', quantity: 0.1, expirationDate: '2026-09-01' },
      { id: 'b', quantity: 0.2, expirationDate: '2026-10-01' },
    ];
    const plan = planFefoDraw(lots, 0.3, { includeExpired: false, today: TODAY });
    expect(plan.shortfall).toBe(0);
    expect(plan.draws).toHaveLength(2);
  });
});
