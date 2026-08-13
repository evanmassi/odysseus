/**
 * Lab-Wide Barcode Resolution
 *
 * One scan must identify a thing in whichever catalog holds it, and never reach across labs.
 * Also holds the rule that keeps the answer unambiguous: a value already linked in one catalog
 * cannot be linked again in the other, which each catalog's own UNIQUE constraint allows.
 */

import { BarcodeApplicationService } from '@application/services/BarcodeApplicationService';
import { SupplyApplicationService } from '@application/services/SupplyApplicationService';
import { AccessControlService } from '@domain/services/AccessControlService';
import { AttributeRepository } from '@infrastructure/repositories/AttributeRepository';
import { ReagentItemRepository } from '@infrastructure/repositories/ReagentItemRepository';
import { StorageRepository } from '@infrastructure/repositories/StorageRepository';
import { SupplyItemRepository } from '@infrastructure/repositories/SupplyItemRepository';
import { TubeRepository } from '@infrastructure/repositories/TubeRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import { createTestAdmin } from '../../src/domain/__tests__/helpers';

import type { EventBus } from '@application/contracts/EventBus';
import type { SupplyCategory } from '@domain/entities/SupplyCategory';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('lab-wide barcode resolve', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let service: BarcodeApplicationService;
  let supplyService: SupplyApplicationService;
  const admin = createTestAdmin();

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    const supplies = new SupplyItemRepository(context);
    const reagents = new ReagentItemRepository(context);
    service = new BarcodeApplicationService(supplies, reagents);
    supplyService = new SupplyApplicationService(
      {} as CategoryRepository<SupplyCategory>,
      supplies,
      reagents,
      new AttributeRepository(context),
      new AccessControlService(new TubeRepository(context, new StorageRepository(context))),
      { publish: async () => undefined } as unknown as EventBus,
      new StorageRepository(context)
    );
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('resolves a supply barcode to its catalog and item', async () => {
    const lab = await seed.lab();
    const item = await seed.supplyItem({ labId: lab.id, name: 'Nitrile Gloves' });
    await seed.supplyBarcode({ itemId: item.id, barcodeValue: 'SITM-glove' });

    expect(await service.resolve(lab.id, 'SITM-glove')).toEqual({
      catalog: 'supply',
      itemId: item.id,
      itemName: 'Nitrile Gloves',
      lotId: null,
    });
  });

  it('resolves a reagent barcode to its catalog and item', async () => {
    const lab = await seed.lab();
    const item = await seed.reagentItem({ labId: lab.id, name: 'Anti-CD3' });
    await seed.reagentBarcode({ itemId: item.id, barcodeValue: 'RITM-cd3' });

    expect(await service.resolve(lab.id, 'RITM-cd3')).toEqual({
      catalog: 'reagent',
      itemId: item.id,
      itemName: 'Anti-CD3',
      lotId: null,
    });
  });

  it("returns null for another lab's barcode", async () => {
    const labA = await seed.lab();
    const labB = await seed.lab();
    const item = await seed.reagentItem({ labId: labA.id });
    await seed.reagentBarcode({ itemId: item.id, barcodeValue: 'RITM-elsewhere' });

    expect(await service.resolve(labB.id, 'RITM-elsewhere')).toBeNull();
  });

  it('returns null for an unknown value', async () => {
    const lab = await seed.lab();

    expect(await service.resolve(lab.id, 'never-scanned')).toBeNull();
  });

  it('refuses a barcode value the other catalog already holds', async () => {
    const lab = await seed.lab();
    const reagent = await seed.reagentItem({ labId: lab.id });
    await seed.reagentBarcode({
      itemId: reagent.id,
      barcodeValue: '0123456789',
      barcodeType: 'upc',
    });
    const supply = await seed.supplyItem({ labId: lab.id });

    await expect(
      supplyService.addBarcode(
        lab.id,
        supply.id,
        { barcodeValue: '0123456789', barcodeType: 'upc' },
        admin
      )
    ).rejects.toThrow('already linked to another item');
  });
});
