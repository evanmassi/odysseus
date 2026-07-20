/**
 * Equipment Document Lab-Scoping Isolation
 *
 * A document is a child of an equipment item; mutating one by global id must be scoped to its
 * parent item. Proves a foreign itemId can neither update nor delete another lab's document, and
 * leaves the target row untouched.
 */

import { EquipmentItemRepository } from '@infrastructure/repositories/EquipmentItemRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('equipment document lab-scoping', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let repo: EquipmentItemRepository;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    repo = new EquipmentItemRepository(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  it("updateDocument leaves a document under another lab's item untouched", async () => {
    const labA = await seed.lab();
    const labB = await seed.lab();
    const itemA = await seed.equipmentItem({ labId: labA.id });
    const doc = await seed.equipmentDocument({ itemId: itemA.id, label: 'original' });
    const itemB = await seed.equipmentItem({ labId: labB.id });

    const result = await repo.updateDocument(doc.id, itemB.id, { label: 'hacked' });

    expect(result).toBeNull();
    const docs = await repo.findDocumentsByItemId(itemA.id);
    expect(docs[0].label).toBe('original');
  });

  it('updateDocument updates a document under its own item', async () => {
    const labA = await seed.lab();
    const itemA = await seed.equipmentItem({ labId: labA.id });
    const doc = await seed.equipmentDocument({ itemId: itemA.id, label: 'original' });

    const result = await repo.updateDocument(doc.id, itemA.id, { label: 'renamed' });

    expect(result?.label).toBe('renamed');
  });

  it("deleteDocument does not delete a document under another lab's item", async () => {
    const labA = await seed.lab();
    const labB = await seed.lab();
    const itemA = await seed.equipmentItem({ labId: labA.id });
    const doc = await seed.equipmentDocument({ itemId: itemA.id });
    const itemB = await seed.equipmentItem({ labId: labB.id });

    expect(await repo.deleteDocument(doc.id, itemB.id)).toBe(false);
    expect(await repo.findDocumentsByItemId(itemA.id)).toHaveLength(1);
  });

  it('deleteDocument deletes a document under its own item', async () => {
    const labA = await seed.lab();
    const itemA = await seed.equipmentItem({ labId: labA.id });
    const doc = await seed.equipmentDocument({ itemId: itemA.id });

    expect(await repo.deleteDocument(doc.id, itemA.id)).toBe(true);
    expect(await repo.findDocumentsByItemId(itemA.id)).toHaveLength(0);
  });
});
