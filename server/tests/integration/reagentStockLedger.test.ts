/**
 * Reagent Per-Lot Stock Ledger
 *
 * Exercises the atomic lot-aware recordTransaction against real Postgres:
 * receiving into lots, the label minted with each new lot, FEFO issues spanning lots
 * (one row per lot), expired-lot handling, insufficient-stock rejection, and void
 * restoring a lot.
 */

import { ReagentItemRepository } from '@infrastructure/repositories/ReagentItemRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { RecordTransactionData } from '@domain/repositories/ReagentItemRepository';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const daysFromNow = (n: number): string =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const EARLY = daysFromNow(30);
const LATE = daysFromNow(120);
const EXPIRED = daysFromNow(-60);
const FUTURE = daysFromNow(90);

describe('reagent per-lot stock ledger', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let repo: ReagentItemRepository;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    repo = new ReagentItemRepository(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  async function scenario() {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });
    const item = await seed.reagentItem({ labId: lab.id });
    const location = await seed.location({ labId: lab.id });
    const base = { itemId: item.id, locationId: location.id, labId: lab.id, performedBy: user.id };
    const record = (extra: Partial<RecordTransactionData> & { type: RecordTransactionData['type'] }) =>
      repo.recordTransaction({ ...base, ...extra });
    return { lab, user, item, location, base, record };
  }

  it('receives into a lot and rolls up on-hand and soonest expiry', async () => {
    const { lab, item, record } = await scenario();
    await record({ type: 'received', quantity: 60, lotNumber: 'A', expirationDate: EARLY });

    const withStock = await repo.findByLabIdWithStock(lab.id);
    expect(withStock[0].item.id).toBe(item.id);
    expect(withStock[0].totalStock).toBe(60);
    expect(withStock[0].soonestExpiration).toBe(EARLY);
    expect(withStock[0].lotCount).toBe(1);
    expect(withStock[0].expiredLotCount).toBe(0);
  });

  it('mints one internal barcode per new lot, carrying the lot it labels', async () => {
    const { item, record } = await scenario();
    const [txn] = await record({ type: 'received', quantity: 10, lotNumber: 'A' });

    const lotBarcodes = (await repo.findBarcodesByItemId(item.id)).filter(bc => bc.lotId);
    expect(lotBarcodes).toHaveLength(1);
    expect(lotBarcodes[0]).toMatchObject({
      lotId: txn.lotId,
      barcodeType: 'internal',
      isPrimary: false,
    });
    expect(lotBarcodes[0].barcodeValue).toMatch(/^RLOT-/);
  });

  it('does not mint a second barcode when a receive tops up an existing lot', async () => {
    const { item, record } = await scenario();
    await record({ type: 'received', quantity: 10, lotNumber: 'A' });
    await record({ type: 'received', quantity: 5, lotNumber: 'A' });
    await record({ type: 'received', quantity: 7, lotNumber: 'B' });

    const lotBarcodes = (await repo.findBarcodesByItemId(item.id)).filter(bc => bc.lotId);
    expect(lotBarcodes).toHaveLength(2);
    expect(new Set(lotBarcodes.map(bc => bc.barcodeValue)).size).toBe(2);
  });

  it('counts lots and flags only the expired ones', async () => {
    const { lab, record } = await scenario();
    await record({ type: 'received', quantity: 10, lotNumber: 'A', expirationDate: '2020-01-01' });
    await record({ type: 'received', quantity: 20, lotNumber: 'B', expirationDate: LATE });

    const [withStock] = await repo.findByLabIdWithStock(lab.id);
    expect(withStock.totalStock).toBe(30);
    expect(withStock.lotCount).toBe(2);
    expect(withStock.expiredLotCount).toBe(1);
  });

  it('issues FEFO across lots earliest-expiry first, one row per lot', async () => {
    const { item, record } = await scenario();
    await record({ type: 'received', quantity: 80, lotNumber: 'late', expirationDate: LATE });
    await record({ type: 'received', quantity: 60, lotNumber: 'early', expirationDate: EARLY });

    const txns = await record({ type: 'issued', quantity: 100 });
    expect(txns).toHaveLength(2);
    expect(txns[0].quantityChange).toBe(-60);
    expect(txns[0].quantityAfter).toBe(80);
    expect(txns[1].quantityChange).toBe(-40);
    expect(txns[1].quantityAfter).toBe(40);

    const lots = await repo.findLotsByItemId(item.id);
    expect(lots.find(l => l.lotNumber === 'early')).toMatchObject({ quantity: 0, status: 'depleted' });
    expect(lots.find(l => l.lotNumber === 'late')).toMatchObject({ quantity: 40, status: 'active' });
  });

  it('rejects an issue that exceeds on-hand', async () => {
    const { record } = await scenario();
    await record({ type: 'received', quantity: 10, lotNumber: 'A', expirationDate: FUTURE });
    await expect(record({ type: 'issued', quantity: 25 })).rejects.toThrow(/not enough stock/i);
  });

  it('skips expired lots unless includeExpired is set', async () => {
    const { record } = await scenario();
    await record({ type: 'received', quantity: 50, lotNumber: 'old', expirationDate: EXPIRED });

    await expect(record({ type: 'issued', quantity: 10 })).rejects.toThrow(/expired/i);

    const txns = await record({ type: 'issued', quantity: 10, includeExpired: true });
    expect(txns).toHaveLength(1);
    expect(txns[0].quantityChange).toBe(-10);
  });

  it('reconciles a lot to an actual count', async () => {
    const { item, record } = await scenario();
    await record({ type: 'received', quantity: 50, lotNumber: 'A', expirationDate: FUTURE });
    const lot = (await repo.findLotsByItemId(item.id))[0];

    const [txn] = await record({ type: 'count_adjustment', lotId: lot.id, actualCount: 42 });
    expect(txn.quantityChange).toBe(-8);
    expect(txn.quantityAfter).toBe(42);

    expect((await repo.findLotsByItemId(item.id))[0].quantity).toBe(42);
  });

  it('corrects lot dates and refuses a lot belonging to another item', async () => {
    const { lab, item, record } = await scenario();
    await record({ type: 'received', quantity: 20, lotNumber: 'A', expirationDate: EARLY });
    const lot = (await repo.findLotsByItemId(item.id))[0];

    const updated = await repo.updateLot(lot.id, item.id, {
      openedDate: FUTURE,
      expirationDate: LATE,
    });
    expect(updated).toMatchObject({ openedDate: FUTURE, expirationDate: LATE });

    const cleared = await repo.updateLot(lot.id, item.id, { openedDate: null });
    expect(cleared?.openedDate).toBeUndefined();

    const otherItem = await seed.reagentItem({ labId: lab.id });
    expect(await repo.updateLot(lot.id, otherItem.id, { expirationDate: EARLY })).toBeNull();
  });

  it('voids an issue transaction, restoring the lot quantity', async () => {
    const { lab, user, item, record } = await scenario();
    await record({ type: 'received', quantity: 40, lotNumber: 'A', expirationDate: FUTURE });
    const [issued] = await record({ type: 'issued', quantity: 30 });

    const { reversal } = await repo.voidTransaction({
      transactionId: issued.id,
      labId: lab.id,
      voidedBy: user.id,
      voidReason: 'test',
    });
    expect(reversal.quantityChange).toBe(30);

    const lots = await repo.findLotsByItemId(item.id);
    expect(lots[0].quantity).toBe(40);
  });
});
