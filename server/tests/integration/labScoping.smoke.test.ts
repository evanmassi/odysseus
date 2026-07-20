/**
 * Integration Harness Smoke Test
 *
 * Proves the two-lab test harness boots a real Postgres, applies migrations, and that every
 * seed factory persists a readable row scoped to its lab. Guards Phase 0 before the isolation
 * suites build on it.
 */

import { DonorRepository } from '@infrastructure/repositories/DonorRepository';
import { EquipmentItemRepository } from '@infrastructure/repositories/EquipmentItemRepository';
import { ResearcherRepository } from '@infrastructure/repositories/ResearcherRepository';
import { SupplyItemRepository } from '@infrastructure/repositories/SupplyItemRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('integration harness', () => {
  let context: PostgresContext;
  let seed: TestSeed;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('boots and applies migrations', async () => {
    const tables = await context.queryMany<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    const names = tables.map(t => t.tablename);
    expect(names).toEqual(
      expect.arrayContaining([
        'labs',
        'persons',
        'researchers',
        'donors',
        'equipment_items',
        'supply_items',
      ])
    );
  });

  it('seeds a lab and reads it back', async () => {
    const lab = await seed.lab();
    const found = await context.queryOne<{ id: string }>('SELECT id FROM labs WHERE id = $1', [
      lab.id,
    ]);
    expect(found?.id).toBe(lab.id);
  });

  it('persists a researcher scoped to its lab', async () => {
    const lab = await seed.lab();
    const researcher = await seed.researcher({ labId: lab.id });

    const repo = new ResearcherRepository(context);
    const found = await repo.findById(researcher.id, lab.id);
    expect(found?.id).toBe(researcher.id);
    expect(found?.labId).toBe(lab.id);
  });

  it('persists a donor and its collection history', async () => {
    const lab = await seed.lab();
    const donor = await seed.donor({ labId: lab.id });
    await seed.donorCollectionHistory({ donorId: donor.id });

    const repo = new DonorRepository(context);
    const foundDonor = await repo.findById(donor.id, lab.id);
    expect(foundDonor?.id).toBe(donor.id);

    const history = await repo.findCollectionHistory(donor.id, lab.id);
    expect(history).toHaveLength(1);
  });

  it('persists an equipment item and document', async () => {
    const lab = await seed.lab();
    const item = await seed.equipmentItem({ labId: lab.id });
    await seed.equipmentDocument({ itemId: item.id });

    const repo = new EquipmentItemRepository(context);
    const foundItem = await repo.findById(item.id, lab.id);
    expect(foundItem?.labId).toBe(lab.id);

    const docs = await repo.findDocumentsByItemId(item.id);
    expect(docs).toHaveLength(1);
  });

  it('persists a supply item with document, barcode, and packaging level', async () => {
    const lab = await seed.lab();
    const item = await seed.supplyItem({ labId: lab.id });
    await seed.supplyDocument({ itemId: item.id });
    const barcode = await seed.supplyBarcode({ itemId: item.id });
    await seed.supplyPackagingLevel({ itemId: item.id });

    const repo = new SupplyItemRepository(context);
    const foundItem = await repo.findById(item.id, lab.id);
    expect(foundItem?.labId).toBe(lab.id);

    const docs = await repo.findDocumentsByItemId(item.id);
    expect(docs).toHaveLength(1);

    const foundBarcode = await repo.findByBarcodeValue(barcode.barcodeValue);
    expect(foundBarcode?.itemId).toBe(item.id);

    const levels = await repo.findPackagingLevelsByItemId(item.id);
    expect(levels).toHaveLength(1);
  });

  it('records distinct lab ids across two labs (isolation sanity)', async () => {
    const labA = await seed.lab();
    const labB = await seed.lab();
    const rA = await seed.researcher({ labId: labA.id });
    const rB = await seed.researcher({ labId: labB.id });

    expect(rA.labId).toBe(labA.id);
    expect(rB.labId).toBe(labB.id);
    expect(rA.labId).not.toBe(rB.labId);
  });
});
