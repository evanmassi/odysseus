/**
 * Researcher Lab-Scoping Isolation
 *
 * Proves ResearcherRepository.findById filters by lab (and findByIdAnyLab does not), closing the
 * cross-lab researcher read (hole #1) at its SQL source — the layer the inverted service guard missed.
 */

import { ResearcherRepository } from '@infrastructure/repositories/ResearcherRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('researcher lab-scoping', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let repo: ResearcherRepository;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    repo = new ResearcherRepository(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('findById returns null for a researcher in another lab', async () => {
    const labA = await seed.lab();
    const labB = await seed.lab();
    const researcherB = await seed.researcher({ labId: labB.id });

    expect(await repo.findById(researcherB.id, labA.id)).toBeNull();
  });

  it('findById returns the researcher within its own lab', async () => {
    const labA = await seed.lab();
    const researcherA = await seed.researcher({ labId: labA.id });

    const found = await repo.findById(researcherA.id, labA.id);
    expect(found?.id).toBe(researcherA.id);
  });

  it('findByIdAnyLab returns a researcher regardless of lab', async () => {
    const labB = await seed.lab();
    const researcherB = await seed.researcher({ labId: labB.id });

    const found = await repo.findByIdAnyLab(researcherB.id);
    expect(found?.id).toBe(researcherB.id);
  });
});
