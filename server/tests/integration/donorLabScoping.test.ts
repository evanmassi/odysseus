/**
 * Donor Lab-Scoping Isolation
 *
 * Proves getCollectionHistory refuses a cross-lab donor id (hole #3) — the read path now guards
 * via the lab-scoped getDonorOrThrow before returning history, matching the write sibling.
 */

import { DonorApplicationService } from '@application/services/DonorApplicationService';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { DonorRepository } from '@infrastructure/repositories/DonorRepository';
import type { LabRepository } from '@domain/repositories/LabRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { EventBus } from '@application/contracts/EventBus';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('donor lab-scoping', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let service: DonorApplicationService;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    // getCollectionHistory only touches the repository; the other deps are never reached.
    service = new DonorApplicationService(
      new DonorRepository(context),
      {} as unknown as AccessControlService,
      {} as unknown as EventBus,
      {} as unknown as LabRepository
    );
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('refuses collection-history for a donor in another lab (hole #3)', async () => {
    const labA = await seed.lab();
    const labB = await seed.lab();
    const donorB = await seed.donor({ labId: labB.id });
    await seed.donorCollectionHistory({ donorId: donorB.id });

    await expect(service.getCollectionHistory(labA.id, donorB.id)).rejects.toThrow(NotFoundError);
  });

  it("returns collection-history within the donor's own lab", async () => {
    const labB = await seed.lab();
    const donorB = await seed.donor({ labId: labB.id });
    await seed.donorCollectionHistory({ donorId: donorB.id });

    const history = await service.getCollectionHistory(labB.id, donorB.id);
    expect(history).toHaveLength(1);
  });
});
