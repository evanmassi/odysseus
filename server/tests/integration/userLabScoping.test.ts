/**
 * User Lab-Scoping Isolation
 *
 * Proves UserRepository.findById filters by lab (and findByIdAnyLab does not).
 */

import { UserRepository } from '@infrastructure/repositories/UserRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('user lab-scoping', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let repo: UserRepository;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    repo = new UserRepository(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  describe('repository', () => {
    it('findById returns null for a user in another lab', async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const userB = await seed.user({ labId: labB.id });

      expect(await repo.findById(userB.id, labA.id)).toBeNull();
    });

    it('findById returns the user within its own lab', async () => {
      const labA = await seed.lab();
      const userA = await seed.user({ labId: labA.id });

      const found = await repo.findById(userA.id, labA.id);
      expect(found?.id).toBe(userA.id);
    });

    it('findByIdAnyLab returns a user regardless of lab', async () => {
      const labB = await seed.lab();
      const userB = await seed.user({ labId: labB.id });

      const found = await repo.findByIdAnyLab(userB.id);
      expect(found?.id).toBe(userB.id);
    });
  });
});
