/**
 * Supply Child-Resource Lab-Scoping Isolation
 *
 * Documents, barcodes, and packaging levels are children of a supply item; mutating one by global
 * id must be scoped to its parent item. Proves a foreign itemId can neither update nor delete
 * another lab's child rows, and leaves the target untouched.
 */

import { SupplyItemRepository } from '@infrastructure/repositories/SupplyItemRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('supply child-resource lab-scoping', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let repo: SupplyItemRepository;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    repo = new SupplyItemRepository(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  describe('documents', () => {
    it('updateDocument leaves another lab\'s document untouched', async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const itemA = await seed.supplyItem({ labId: labA.id });
      const doc = await seed.supplyDocument({ itemId: itemA.id, label: 'original' });
      const itemB = await seed.supplyItem({ labId: labB.id });

      expect(await repo.updateDocument(doc.id, itemB.id, { label: 'hacked' })).toBeNull();
      expect((await repo.findDocumentsByItemId(itemA.id))[0].label).toBe('original');
    });

    it('updateDocument updates a document under its own item', async () => {
      const labA = await seed.lab();
      const itemA = await seed.supplyItem({ labId: labA.id });
      const doc = await seed.supplyDocument({ itemId: itemA.id, label: 'original' });

      expect((await repo.updateDocument(doc.id, itemA.id, { label: 'renamed' }))?.label).toBe('renamed');
    });

    it('deleteDocument does not delete another lab\'s document', async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const itemA = await seed.supplyItem({ labId: labA.id });
      const doc = await seed.supplyDocument({ itemId: itemA.id });
      const itemB = await seed.supplyItem({ labId: labB.id });

      expect(await repo.deleteDocument(doc.id, itemB.id)).toBe(false);
      expect(await repo.findDocumentsByItemId(itemA.id)).toHaveLength(1);
    });

    it('deleteDocument deletes a document under its own item', async () => {
      const labA = await seed.lab();
      const itemA = await seed.supplyItem({ labId: labA.id });
      const doc = await seed.supplyDocument({ itemId: itemA.id });

      expect(await repo.deleteDocument(doc.id, itemA.id)).toBe(true);
      expect(await repo.findDocumentsByItemId(itemA.id)).toHaveLength(0);
    });
  });

  describe('barcodes', () => {
    it('updateBarcode leaves another lab\'s barcode untouched', async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const itemA = await seed.supplyItem({ labId: labA.id });
      const barcode = await seed.supplyBarcode({ itemId: itemA.id, label: 'original' });
      const itemB = await seed.supplyItem({ labId: labB.id });

      expect(await repo.updateBarcode(barcode.id, itemB.id, { label: 'hacked' })).toBeNull();
      expect((await repo.findBarcodesByItemId(itemA.id))[0].label).toBe('original');
    });

    it('updateBarcode updates a barcode under its own item', async () => {
      const labA = await seed.lab();
      const itemA = await seed.supplyItem({ labId: labA.id });
      const barcode = await seed.supplyBarcode({ itemId: itemA.id, label: 'original' });

      expect((await repo.updateBarcode(barcode.id, itemA.id, { label: 'renamed' }))?.label).toBe('renamed');
    });

    it('deleteBarcode does not delete another lab\'s barcode', async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const itemA = await seed.supplyItem({ labId: labA.id });
      const barcode = await seed.supplyBarcode({ itemId: itemA.id });
      const itemB = await seed.supplyItem({ labId: labB.id });

      expect(await repo.deleteBarcode(barcode.id, itemB.id)).toBe(false);
      expect(await repo.findBarcodesByItemId(itemA.id)).toHaveLength(1);
    });
  });

  describe('packaging levels', () => {
    it('updatePackagingLevel leaves another lab\'s level untouched', async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const itemA = await seed.supplyItem({ labId: labA.id });
      const level = await seed.supplyPackagingLevel({ itemId: itemA.id, quantity: 10 });
      const itemB = await seed.supplyItem({ labId: labB.id });

      expect(await repo.updatePackagingLevel(level.id, itemB.id, 999)).toBe(false);
      expect((await repo.findPackagingLevelsByItemId(itemA.id))[0].quantity).toBe(10);
    });

    it('updatePackagingLevel updates a level under its own item', async () => {
      const labA = await seed.lab();
      const itemA = await seed.supplyItem({ labId: labA.id });
      const level = await seed.supplyPackagingLevel({ itemId: itemA.id, quantity: 10 });

      expect(await repo.updatePackagingLevel(level.id, itemA.id, 42)).toBe(true);
      expect((await repo.findPackagingLevelsByItemId(itemA.id))[0].quantity).toBe(42);
    });
  });
});
