/**
 * Phase 3 — By-Id Convergence Lab-Scoping
 *
 * Defense-in-depth: the remaining guarded Camp-B by-id writes now scope lab_id in SQL. Proves the
 * delete methods no-op cross-lab (representative of the identical WHERE id AND lab_id pattern shared
 * by LookupValue.delete etc.), the donor collection-history read is lab-scoped via the donor subquery,
 * and the Tube optimistic-lock hot path still works with the added lab_id predicate.
 */

import { ConflictError } from '@domain/errors/ConflictError';
import { DonorRepository } from '@infrastructure/repositories/DonorRepository';
import { ResearcherRepository } from '@infrastructure/repositories/ResearcherRepository';
import { StorageRepository } from '@infrastructure/repositories/StorageRepository';
import { TubeRepository } from '@infrastructure/repositories/TubeRepository';
import { UserRepository } from '@infrastructure/repositories/UserRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('phase 3 by-id lab-scoping convergence', () => {
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

  describe('delete methods no-op cross-lab', () => {
    it('DonorRepository.delete', async () => {
      const repo = new DonorRepository(context);
      const labA = await seed.lab();
      const labB = await seed.lab();
      const donor = await seed.donor({ labId: labA.id });

      expect(await repo.delete(donor.id, labB.id)).toBe(false);
      expect(await repo.findById(donor.id, labA.id)).not.toBeNull();
      expect(await repo.delete(donor.id, labA.id)).toBe(true);
    });

    it('ResearcherRepository.delete', async () => {
      const repo = new ResearcherRepository(context);
      const labA = await seed.lab();
      const labB = await seed.lab();
      const researcher = await seed.researcher({ labId: labA.id });

      expect(await repo.delete(researcher.id, labB.id)).toBe(false);
      expect(await repo.findById(researcher.id, labA.id)).not.toBeNull();
      expect(await repo.delete(researcher.id, labA.id)).toBe(true);
    });

    it('UserRepository.delete', async () => {
      const repo = new UserRepository(context);
      const labA = await seed.lab();
      const labB = await seed.lab();
      const seeded = await seed.user({ labId: labA.id });

      expect(await repo.delete(seeded.id, labB.id)).toBe(false);
      expect(await repo.findById(seeded.id, labA.id)).not.toBeNull();
      expect(await repo.delete(seeded.id, labA.id)).toBe(true);
    });
  });

  describe('donor collection history is lab-scoped', () => {
    it('findCollectionHistory returns nothing for another lab', async () => {
      const repo = new DonorRepository(context);
      const labA = await seed.lab();
      const labB = await seed.lab();
      const donor = await seed.donor({ labId: labA.id });
      await seed.donorCollectionHistory({ donorId: donor.id });

      expect(await repo.findCollectionHistory(donor.id, labB.id)).toHaveLength(0);
      expect(await repo.findCollectionHistory(donor.id, labA.id)).toHaveLength(1);
    });
  });

  describe('tube optimistic-lock hot path (with lab_id predicate)', () => {
    it('saves within the lab and rejects a stale version', async () => {
      const repo = new TubeRepository(context, new StorageRepository(context));
      const labA = await seed.lab();
      const persisted = await seed.tube({ labId: labA.id });

      const loaded = await repo.findById(persisted.id, labA.id);
      const updated = loaded!.update({ sample: { notes: 'updated' } });
      await repo.saveWithOptimisticLock(updated, loaded!.version);

      const after = await repo.findById(persisted.id, labA.id);
      expect(after?.version).toBe(loaded!.version + 1);

      // DB already advanced past the expected version → conflict.
      await expect(repo.saveWithOptimisticLock(updated, loaded!.version)).rejects.toThrow(
        ConflictError
      );
    });
  });
});
