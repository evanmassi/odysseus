/**
 * Reagent FEFO Consumption
 *
 * First-expired-first-out draw planning over a reagent's lots, plus read-time
 * expiry derivation. Pure: the repository supplies the locked lot rows and
 * applies the returned plan inside its transaction.
 */

// Quantities are decimals (µg, mL); tolerate float drift so an exact draw
// doesn't report a phantom shortfall.
const EPSILON = 1e-9;

export interface FefoLot {
  id: string;
  quantity: number;
  expirationDate?: string;
}

export interface FefoDraw {
  lotId: string;
  amount: number;
}

export interface FefoPlan {
  draws: FefoDraw[];
  shortfall: number;
}

/** A lot is expired when its expiration date is strictly before today (YYYY-MM-DD compare). */
export function isLotExpired(expirationDate: string | undefined, today: string): boolean {
  return expirationDate !== undefined && expirationDate < today;
}

/**
 * Plans a FEFO draw of `quantity` across `lots`. Non-expired lots are consumed
 * earliest-expiry-first (undated lots last); expired lots are drawn only when
 * `includeExpired` is set, and always after all non-expired stock.
 */
export function planFefoDraw(
  lots: FefoLot[],
  quantity: number,
  options: { includeExpired: boolean; today: string }
): FefoPlan {
  const available = lots.filter(lot => lot.quantity > 0);
  const nonExpired = available.filter(lot => !isLotExpired(lot.expirationDate, options.today));
  const expired = available.filter(lot => isLotExpired(lot.expirationDate, options.today));

  const ordered = [
    ...sortByExpiry(nonExpired),
    ...(options.includeExpired ? sortByExpiry(expired) : []),
  ];

  const draws: FefoDraw[] = [];
  let remaining = quantity;
  for (const lot of ordered) {
    if (remaining <= EPSILON) break;
    const amount = Math.min(lot.quantity, remaining);
    draws.push({ lotId: lot.id, amount });
    remaining -= amount;
  }

  return { draws, shortfall: remaining > EPSILON ? remaining : 0 };
}

/** Earliest expiration first; undated lots sort last (treated as latest). */
function sortByExpiry(lots: FefoLot[]): FefoLot[] {
  return [...lots].sort((a, b) => {
    if (a.expirationDate === b.expirationDate) return 0;
    if (a.expirationDate === undefined) return 1;
    if (b.expirationDate === undefined) return -1;
    return a.expirationDate < b.expirationDate ? -1 : 1;
  });
}
