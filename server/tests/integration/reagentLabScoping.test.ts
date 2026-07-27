/**
 * Reagent Child-Resource Lab-Scoping Isolation
 *
 * Documents and barcodes are children of a reagent item; mutating one by global id must be scoped
 * to its parent item. Proves a foreign itemId can neither update nor delete another lab's child
 * rows, and leaves the target untouched.
 */

import { ReagentItemRepository } from '@infrastructure/repositories/ReagentItemRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('reagent child-resource lab-scoping', () => {
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

  describe('documents', () => {
    it("updateDocument leaves another lab's document untouched", async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const itemA = await seed.reagentItem({ labId: labA.id });
      const doc = await seed.reagentDocument({ itemId: itemA.id, label: 'original' });
      const itemB = await seed.reagentItem({ labId: labB.id });

      expect(await repo.updateDocument(doc.id, itemB.id, { label: 'hacked' })).toBeNull();
      expect((await repo.findDocumentsByItemId(itemA.id))[0].label).toBe('original');
    });

    it('updateDocument updates a document under its own item', async () => {
      const labA = await seed.lab();
      const itemA = await seed.reagentItem({ labId: labA.id });
      const doc = await seed.reagentDocument({ itemId: itemA.id, label: 'original' });

      expect((await repo.updateDocument(doc.id, itemA.id, { label: 'renamed' }))?.label).toBe(
        'renamed'
      );
    });

    it("deleteDocument does not delete another lab's document", async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const itemA = await seed.reagentItem({ labId: labA.id });
      const doc = await seed.reagentDocument({ itemId: itemA.id });
      const itemB = await seed.reagentItem({ labId: labB.id });

      expect(await repo.deleteDocument(doc.id, itemB.id)).toBe(false);
      expect(await repo.findDocumentsByItemId(itemA.id)).toHaveLength(1);
    });
  });

  describe('barcodes', () => {
    it("updateBarcode leaves another lab's barcode untouched", async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const itemA = await seed.reagentItem({ labId: labA.id });
      const barcode = await seed.reagentBarcode({ itemId: itemA.id, label: 'original' });
      const itemB = await seed.reagentItem({ labId: labB.id });

      expect(await repo.updateBarcode(barcode.id, itemB.id, { label: 'hacked' })).toBeNull();
      expect((await repo.findBarcodesByItemId(itemA.id))[0].label).toBe('original');
    });

    it("deleteBarcode does not delete another lab's barcode", async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const itemA = await seed.reagentItem({ labId: labA.id });
      const barcode = await seed.reagentBarcode({ itemId: itemA.id });
      const itemB = await seed.reagentItem({ labId: labB.id });

      expect(await repo.deleteBarcode(barcode.id, itemB.id)).toBe(false);
      expect(await repo.findBarcodesByItemId(itemA.id)).toHaveLength(1);
    });
  });
});
