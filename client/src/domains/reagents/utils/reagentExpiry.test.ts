/**
 * resolveExpiryBadge tests
 *
 * Verifies the precedence of expired lots over the warning window, the per-item
 * override of the lab default, and the boundaries of that window.
 */

import { resolveExpiryBadge, resolveLotExpiry, isLotExpired } from './reagentExpiry';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

// Built from local parts, not toISOString(): a UTC conversion shifts the calendar day
// either side of midnight, which is the drift the expiry math exists to avoid.
const dateInDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const item = (overrides: Partial<ReagentItemWithStock>): ReagentItemWithStock =>
  ({
    id: 'ritm1',
    labId: 'lab1',
    categoryId: 'rcat1',
    name: 'anti-CD3',
    status: 'active',
    totalStock: 100,
    lotCount: 1,
    expiredLotCount: 0,
    locationNames: [],
    attributeValues: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ReagentItemWithStock;

describe('resolveExpiryBadge', () => {
  it('returns nothing when no lot expires', () => {
    expect(resolveExpiryBadge(item({}))).toBeUndefined();
  });

  it('reports expired lots ahead of the warning window', () => {
    const badge = resolveExpiryBadge(
      item({ expiredLotCount: 2, soonestExpiration: dateInDays(-10) })
    );
    expect(badge).toMatchObject({ tone: 'danger', label: '2 expired' });
    expect(badge?.detail).toBe('2 lots expired');
  });

  it('singularizes a lone expired lot', () => {
    expect(
      resolveExpiryBadge(item({ expiredLotCount: 1, soonestExpiration: dateInDays(-1) }))?.detail
    ).toBe('1 lot expired');
  });

  it('warns inside the default window and stays quiet outside it', () => {
    expect(resolveExpiryBadge(item({ soonestExpiration: dateInDays(30) }))).toMatchObject({
      tone: 'warning',
      label: 'exp 30d',
    });
    expect(resolveExpiryBadge(item({ soonestExpiration: dateInDays(120) }))).toBeUndefined();
  });

  it('treats the window edge as inclusive', () => {
    expect(resolveExpiryBadge(item({ soonestExpiration: dateInDays(90) }))).toBeDefined();
    expect(resolveExpiryBadge(item({ soonestExpiration: dateInDays(91) }))).toBeUndefined();
  });

  it("honours the item's own warning window over the lab default", () => {
    const soonestExpiration = dateInDays(45);
    expect(resolveExpiryBadge(item({ soonestExpiration, expiryWarningDays: 10 }))).toBeUndefined();
    expect(resolveExpiryBadge(item({ soonestExpiration, expiryWarningDays: 60 }))).toBeDefined();
  });

  it('reads today as expiring rather than expired', () => {
    expect(resolveExpiryBadge(item({ soonestExpiration: dateInDays(0) }))).toMatchObject({
      tone: 'warning',
      label: 'exp today',
    });
  });
});

describe('resolveLotExpiry', () => {
  it('flags a past date as expired and a near one as warning', () => {
    expect(resolveLotExpiry(dateInDays(-1), 90)).toMatchObject({
      tone: 'danger',
      label: 'expired',
    });
    expect(resolveLotExpiry(dateInDays(5), 90)).toMatchObject({ tone: 'warning', label: '5d' });
  });

  it('is quiet for an undated lot or one beyond the window', () => {
    expect(resolveLotExpiry(undefined, 90)).toBeUndefined();
    expect(resolveLotExpiry(dateInDays(200), 90)).toBeUndefined();
  });

  it('falls back to the lab default window when the item sets none', () => {
    expect(resolveLotExpiry(dateInDays(80), undefined)).toBeDefined();
    expect(resolveLotExpiry(dateInDays(100), undefined)).toBeUndefined();
  });
});

describe('isLotExpired', () => {
  it('is true only strictly before today', () => {
    expect(isLotExpired(dateInDays(-1))).toBe(true);
    expect(isLotExpired(dateInDays(0))).toBe(false);
    expect(isLotExpired(dateInDays(1))).toBe(false);
    expect(isLotExpired(undefined)).toBe(false);
  });
});
