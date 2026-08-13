/**
 * Demo Reset Bulk Purge
 *
 * `deleteAllForLab` is what the demo reset wipes with, and its ordering is not a preference:
 * `reagent_transactions.item_id` and `supply_transactions.item_id` are NO ACTION, so an item
 * cannot be deleted while its ledger still points at it. A lab with no stock movement would
 * pass either ordering, so every case here records a transaction first.
 */

import { EquipmentItemRepository } from '@infrastructure/repositories/EquipmentItemRepository';
import { ReagentItemRepository } from '@infrastructure/repositories/ReagentItemRepository';
import { SupplyItemRepository } from '@infrastructure/repositories/SupplyItemRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('demo reset bulk purge', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let reagents: ReagentItemRepository;
  let supplies: SupplyItemRepository;
  let equipment: EquipmentItemRepository;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    reagents = new ReagentItemRepository(context);
    supplies = new SupplyItemRepository(context);
    equipment = new EquipmentItemRepository(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('clears reagents whose ledger still references them', async () => {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });
    const item = await seed.reagentItem({ labId: lab.id });
    const location = await seed.location({ labId: lab.id });

    await reagents.recordTransaction({
      itemId: item.id,
      locationId: location.id,
      labId: lab.id,
      type: 'received',
      quantity: 25,
      lotNumber: 'LOT-1',
      performedBy: user.id,
    });

    expect(await reagents.hasTransactions(item.id)).toBe(true);
    expect(await reagents.deleteAllForLab(lab.id)).toBe(1);

    expect(await reagents.findById(item.id, lab.id)).toBeNull();
    expect(await reagents.findTransactionsByItemId(item.id)).toHaveLength(0);
  });

  it('clears supplies whose ledger still references them', async () => {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });
    const item = await seed.supplyItem({ labId: lab.id });
    const location = await seed.location({ labId: lab.id });

    await supplies.recordTransaction({
      itemId: item.id,
      locationId: location.id,
      labId: lab.id,
      type: 'received',
      quantityChange: 10,
      performedBy: user.id,
    });

    expect(await supplies.hasTransactions(item.id)).toBe(true);
    expect(await supplies.deleteAllForLab(lab.id)).toBe(1);

    expect(await supplies.findById(item.id, lab.id)).toBeNull();
    expect(await supplies.findTransactionsByItemId(item.id)).toHaveLength(0);
  });

  it('clears equipment', async () => {
    const lab = await seed.lab();
    const item = await seed.equipmentItem({ labId: lab.id });

    expect(await equipment.deleteAllForLab(lab.id)).toBe(1);
    expect(await equipment.findById(item.id, lab.id)).toBeNull();
  });

  it('leaves other labs untouched', async () => {
    const mine = await seed.lab();
    const theirs = await seed.lab();
    await seed.reagentItem({ labId: mine.id });
    const survivor = await seed.reagentItem({ labId: theirs.id });

    expect(await reagents.deleteAllForLab(mine.id)).toBe(1);
    expect(await reagents.findById(survivor.id, theirs.id)).not.toBeNull();
  });
});
