/**
 * Donor Search LIKE-Metacharacter Escaping
 *
 * Proves a LIKE wildcard character (_) in a search term matches literally rather than acting as a
 * wildcard, so a search can't silently over-match.
 */

import { DonorRepository } from '@infrastructure/repositories/DonorRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('donor search LIKE escaping', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let repo: DonorRepository;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    repo = new DonorRepository(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('treats an underscore as a literal, not a wildcard', async () => {
    const lab = await seed.lab();
    await seed.donor({ labId: lab.id, donorSourceId: 'AB_1' });
    await seed.donor({ labId: lab.id, donorSourceId: 'ABX1' });

    const results = await repo.search(lab.id, 'AB_1');

    expect(results.map(donor => donor.donorSourceId)).toEqual(['AB_1']);
  });
});
