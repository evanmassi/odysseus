/**
 * Document Queries
 *
 * Both catalogs store item documents through the same shared SQL, and both now list them
 * newest-first — matching every other time-ordered list in the app, including the maintenance log
 * that sits beside the documents on the equipment panel.
 */

import { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import { SupplyDocument } from '@domain/entities/SupplyDocument';
import { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, testConnectionString, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('item documents', () => {
  let bootstrap: PostgresContext;
  let factory: RepositoryFactory;
  let context: PostgresContext;
  let seed: TestSeed;

  beforeAll(async () => {
    bootstrap = await setupTestDatabase();
    factory = new RepositoryFactory({
      connectionString: testConnectionString(),
      ssl: false,
      maxConnections: 5,
    });
    await factory.initialize();
    context = factory.getPostgresContext();
    seed = createSeed(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await factory.close();
    await bootstrap.close();
  });

  describe('equipment', () => {
    const setup = async () => {
      const lab = await seed.lab();
      const item = await seed.equipmentItem({ labId: lab.id });
      return { repo: factory.getRepositories().equipmentItems, itemId: item.id };
    };

    it('round-trips a document', async () => {
      const { repo, itemId } = await setup();

      await repo.saveDocument(
        EquipmentDocument.create({ itemId, label: 'Manual', url: 'https://example.com/m.pdf', notes: 'v2' })
      );

      const [found] = await repo.findDocumentsByItemId(itemId);
      expect(found.label).toBe('Manual');
      expect(found.url).toBe('https://example.com/m.pdf');
      expect(found.notes).toBe('v2');
    });

    it('patches only the fields supplied', async () => {
      const { repo, itemId } = await setup();
      const doc = EquipmentDocument.create({ itemId, label: 'Manual', url: 'https://example.com/m.pdf', notes: 'v2' });
      await repo.saveDocument(doc);

      const updated = await repo.updateDocument(doc.id, itemId, { label: 'Handbook' });

      expect(updated!.label).toBe('Handbook');
      expect(updated!.url).toBe('https://example.com/m.pdf');
      expect(updated!.notes).toBe('v2');
    });

    it('returns the document unchanged when the patch is empty', async () => {
      const { repo, itemId } = await setup();
      const doc = EquipmentDocument.create({ itemId, label: 'Manual', url: 'https://example.com/m.pdf' });
      await repo.saveDocument(doc);

      const unchanged = await repo.updateDocument(doc.id, itemId, {});

      expect(unchanged!.label).toBe('Manual');
    });

    it('deletes', async () => {
      const { repo, itemId } = await setup();
      const doc = EquipmentDocument.create({ itemId, label: 'Manual', url: 'https://example.com/m.pdf' });
      await repo.saveDocument(doc);

      expect(await repo.deleteDocument(doc.id, itemId)).toBe(true);
      expect(await repo.findDocumentsByItemId(itemId)).toHaveLength(0);
    });

    it('lists newest-first', async () => {
      const { repo, itemId } = await setup();
      const older = EquipmentDocument.fromData({
        id: 'eqdoc_old', itemId, label: 'Older', url: 'https://example.com/1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const newer = EquipmentDocument.fromData({
        id: 'eqdoc_new', itemId, label: 'Newer', url: 'https://example.com/2',
        createdAt: new Date('2026-06-01T00:00:00Z'),
      });
      await repo.saveDocument(newer);
      await repo.saveDocument(older);

      const labels = (await repo.findDocumentsByItemId(itemId)).map(d => d.label);
      expect(labels).toEqual(['Newer', 'Older']);
    });
  });

  describe('supplies', () => {
    const setup = async () => {
      const lab = await seed.lab();
      const item = await seed.supplyItem({ labId: lab.id });
      return { repo: factory.getRepositories().supplyItems, itemId: item.id };
    };

    it('round-trips a document', async () => {
      const { repo, itemId } = await setup();

      await repo.saveDocument(
        SupplyDocument.create({ itemId, label: 'SOP', url: 'https://example.com/s.pdf', notes: 'rev A' })
      );

      const [found] = await repo.findDocumentsByItemId(itemId);
      expect(found.label).toBe('SOP');
      expect(found.notes).toBe('rev A');
    });

    it('patches only the fields supplied', async () => {
      const { repo, itemId } = await setup();
      const doc = SupplyDocument.create({ itemId, label: 'SOP', url: 'https://example.com/s.pdf', notes: 'rev A' });
      await repo.saveDocument(doc);

      const updated = await repo.updateDocument(doc.id, itemId, { url: 'https://example.com/new.pdf' });

      expect(updated!.url).toBe('https://example.com/new.pdf');
      expect(updated!.label).toBe('SOP');
      expect(updated!.notes).toBe('rev A');
    });

    it('lists newest-first, agreeing with equipment', async () => {
      const { repo, itemId } = await setup();
      const older = SupplyDocument.fromData({
        id: 'sdoc_old', itemId, label: 'Older', url: 'https://example.com/1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const newer = SupplyDocument.fromData({
        id: 'sdoc_new', itemId, label: 'Newer', url: 'https://example.com/2',
        createdAt: new Date('2026-06-01T00:00:00Z'),
      });
      await repo.saveDocument(older);
      await repo.saveDocument(newer);

      const labels = (await repo.findDocumentsByItemId(itemId)).map(d => d.label);
      expect(labels).toEqual(['Newer', 'Older']);
    });
  });
});
