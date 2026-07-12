/**
 * User Lab-Scoping Isolation
 *
 * Proves UserRepository.findById filters by lab (and findByIdAnyLab does not), and that
 * GetUserByIdQueryHandler denies a lab admin a cross-lab read (hole #2) while still letting a
 * system admin span labs.
 */

import { GetUserByIdQueryHandler } from '@application/queries/UserQueries';
import { UserNotFoundError } from '@domain/errors/UserErrors';
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

  describe('GetUserByIdQueryHandler', () => {
    let handler: GetUserByIdQueryHandler;

    beforeAll(() => {
      handler = new GetUserByIdQueryHandler(repo);
    });

    it('denies a lab admin reading a user in another lab (hole #2)', async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      const userB = await seed.user({ labId: labB.id });

      await expect(
        handler.handle({ userId: userB.id, requesterLabId: labA.id, requesterIsSystemAdmin: false })
      ).rejects.toThrow(UserNotFoundError);
    });

    it('lets a system admin read a user in any lab', async () => {
      const labB = await seed.lab();
      const userB = await seed.user({ labId: labB.id });

      const found = await handler.handle({
        userId: userB.id,
        requesterLabId: undefined,
        requesterIsSystemAdmin: true,
      });
      expect(found.id).toBe(userB.id);
    });

    it('lets a lab admin read a user in their own lab', async () => {
      const labA = await seed.lab();
      const userA = await seed.user({ labId: labA.id });

      const found = await handler.handle({
        userId: userA.id,
        requesterLabId: labA.id,
        requesterIsSystemAdmin: false,
      });
      expect(found.id).toBe(userA.id);
    });
  });
});
