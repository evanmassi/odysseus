/**
 * Category Depth Invariant
 *
 * Both catalogs promise a two-level hierarchy. Creation enforced it; reparenting did not — supplies
 * let you move a category under a subcategory and reach a third level the UI cannot render. The
 * rule now lives in one guard, so this suite runs identically against both domains: any drift
 * between them fails here.
 */

import { validateCategoryDepth } from '@application/guards/CategoryGuards';
import { EquipmentApplicationService } from '@application/services/EquipmentApplicationService';
import { SupplyApplicationService } from '@application/services/SupplyApplicationService';
import { AccessControlService } from '@domain/services/AccessControlService';
import { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, testConnectionString, truncateAll } from './setup/testDb';

import { createTestAdmin } from '../../src/domain/__tests__/helpers';

import type { EventBus } from '@application/contracts/EventBus';
import type { User } from '@domain/entities/User';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

/** The slice of either application service this suite drives. */
interface CategoryService {
  createCategory(labId: string, data: { name: string; parentId?: string }, user: User): Promise<{ id: string }>;
  updateCategory(
    labId: string,
    id: string,
    data: { name?: string; parentId?: string | null },
    user: User
  ): Promise<{ id: string }>;
}

describe('category depth invariant', () => {
  let bootstrap: PostgresContext;
  let factory: RepositoryFactory;
  let context: PostgresContext;
  let seed: TestSeed;

  const eventBus = { publish: jest.fn(), subscribe: jest.fn() } as unknown as EventBus;

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
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await factory.close();
    await bootstrap.close();
  });

  const services = (): Record<'equipment' | 'supplies', CategoryService> => {
    const repos = factory.getRepositories();
    const accessControl = new AccessControlService(repos.tubes);

    return {
      equipment: new EquipmentApplicationService(
        repos.equipmentCategories,
        repos.equipmentItems,
        accessControl,
        eventBus
      ),
      supplies: new SupplyApplicationService(
        repos.supplyCategories,
        repos.supplyItems,
        repos.supplyLocations,
        accessControl,
        eventBus
      ),
    };
  };

  describe.each(['equipment', 'supplies'] as const)('%s categories', (domain) => {
    /** Top-level parent, a subcategory beneath it, and an unrelated top-level category. */
    const buildTree = async () => {
      const lab = await seed.lab();
      const admin = createTestAdmin({ labId: lab.id });
      const service = services()[domain];

      const parent = await service.createCategory(lab.id, { name: 'Parent' }, admin);
      const child = await service.createCategory(lab.id, { name: 'Child', parentId: parent.id }, admin);
      const other = await service.createCategory(lab.id, { name: 'Other' }, admin);

      return { labId: lab.id, admin, service, parent, child, other };
    };

    it('rejects creating a category under a subcategory', async () => {
      const { labId, admin, service, child } = await buildTree();

      await expect(
        service.createCategory(labId, { name: 'Too deep', parentId: child.id }, admin)
      ).rejects.toThrow(/two levels deep/);
    });

    it('rejects reparenting a category under a subcategory', async () => {
      const { labId, admin, service, child, other } = await buildTree();

      // The hole: supplies allowed this, reaching a third level the create path forbids.
      await expect(
        service.updateCategory(labId, other.id, { parentId: child.id }, admin)
      ).rejects.toThrow(/two levels deep/);
    });

    it('rejects nesting a category that already has subcategories', async () => {
      const { labId, admin, service, parent, other } = await buildTree();

      await expect(
        service.updateCategory(labId, parent.id, { parentId: other.id }, admin)
      ).rejects.toThrow(/two levels deep/);
    });

    it('allows a legitimate reparent to a top-level category', async () => {
      const { labId, admin, service, parent, other } = await buildTree();

      const moved = await service.updateCategory(labId, other.id, { parentId: parent.id }, admin);

      expect(moved.id).toBe(other.id);
    });

    it('allows a rename that leaves the parent untouched', async () => {
      const { labId, admin, service, child } = await buildTree();

      const renamed = await service.updateCategory(labId, child.id, { name: 'Renamed' }, admin);

      expect(renamed.id).toBe(child.id);
    });
  });

  it('accepts a top-level placement without touching the repository', async () => {
    const repository = {
      findById: jest.fn(),
      hasChildren: jest.fn(),
    };

    await validateCategoryDepth(repository, { labId: 'lab_1', parentId: undefined });

    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.hasChildren).not.toHaveBeenCalled();
  });
});
