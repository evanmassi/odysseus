/**
 * Demo Dataset Application
 *
 * Applies the real dataset to a real database, covering what a unit test cannot: foreign-key
 * order, tube placement into whatever storage exists, and re-running without duplicating.
 */

import { applyDemoDataset } from '@application/commands/applyDemoDataset';
import { DEMO_DATASET } from '@application/config/DemoDataset';
import type { Repositories } from '@application/contracts/UnitOfWork';
import { Storage } from '@domain/entities/Storage';
import { UserRole } from '@domain/value-objects/UserRole';
import { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import { StorageRepository } from '@infrastructure/repositories/StorageRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, testConnectionString, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const EXPECTED_TUBES = DEMO_DATASET.tubeBatches.reduce((sum, b) => sum + b.count, 0);

describe('demo dataset application', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let factory: RepositoryFactory;
  let storage: StorageRepository;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    storage = new StorageRepository(context);
    // withTransaction is only on the factory, which owns its own pool against the same test DB.
    factory = new RepositoryFactory({
      connectionString: testConnectionString(),
      ssl: false,
      maxConnections: 5,
    });
    await factory.initialize();
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await factory.close();
    await context.close();
  });

  /** A lab with default storage and one user — the shape the demo lab is provisioned into. */
  async function demoLab() {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });
    const config = await storage.ensureDefaultForLab(lab.id);
    return { lab, user, config };
  }

  const apply = async (labId: string, userId: string, config: Storage) =>
    factory.withTransaction((repos: Repositories) =>
      applyDemoDataset(repos, labId, userId, config)
    );

  it('writes the whole dataset in foreign-key order', async () => {
    const { lab, user, config } = await demoLab();

    const result = await apply(lab.id, user.id, config);

    expect(result.tubes).toBe(EXPECTED_TUBES);
    expect(result.donors).toBe(DEMO_DATASET.donors.length);
    expect(result.researchers).toBe(DEMO_DATASET.people.length);

    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);
    expect(tubes).toHaveLength(EXPECTED_TUBES);

    const donors = await factory.getDonorRepository().findByLabId(lab.id);
    expect(donors).toHaveLength(DEMO_DATASET.donors.length);
  });

  it('marks everything it writes as seeded, so Phase 1 protects it', async () => {
    const { lab, user, config } = await demoLab();
    await apply(lab.id, user.id, config);

    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);
    expect(tubes.every(t => t.isSeeded)).toBe(true);

    const donors = await factory.getDonorRepository().findByLabId(lab.id);
    expect(donors.every(d => d.isSeeded)).toBe(true);

    // Seeded rows must not consume the visitor's creation budget.
    expect(await factory.getTubeRepository().countNonSeededByLabId(lab.id)).toBe(0);
  });

  it('places every tube inside storage that actually exists', async () => {
    const { lab, user, config } = await demoLab();
    await apply(lab.id, user.id, config);

    const tankIds = new Set(config.tanks.map(t => t.id));
    const rackIds = new Set(config.tanks.flatMap(t => t.racks.map(r => r.id)));
    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);

    expect(tubes.every(t => tankIds.has(t.location.tankId))).toBe(true);
    expect(tubes.every(t => rackIds.has(t.location.rackId))).toBe(true);

    // One tube per position — the unique constraint would have rejected a collision, but an
    // off-by-one in the slot walk could still stack a batch onto the same box.
    const seats = new Set(
      tubes.map(t => `${t.location.rackId}:${t.location.boxId}:${t.location.position}`)
    );
    expect(seats.size).toBe(tubes.length);
  });

  // A visitor's first instinct is to add a tube to the box they land on, so the opening box must
  // have free seats — loaded front to back like a real box, not sprinkled.
  it('loads the opening box contiguously and fills a later one edge to edge', async () => {
    const { lab, user, config } = await demoLab();
    await apply(lab.id, user.id, config);

    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);
    const firstRack = config.tanks[0].racks[0];
    const boxes = firstRack.boxes;

    const occupancy = (boxName: string) =>
      tubes.filter(t => t.location.rackId === firstRack.id && t.location.boxId === boxName).length;

    const capacity = boxes[0].maxPositions;
    const openingBox = occupancy(boxes[0].name);
    expect(openingBox).toBe(DEMO_DATASET.placement.openingBoxTubes);
    expect(openingBox).toBeLessThan(capacity);

    const openingTubes = tubes.filter(
      t => t.location.rackId === firstRack.id && t.location.boxId === boxes[0].name
    );

    // Seats 1..n with nothing beyond — a box someone loaded, not one someone sprinkled.
    expect(Math.max(...openingTubes.map(t => t.location.position))).toBe(openingBox);

    // Two donors, so the grid's colour grouping is legible at a glance.
    const donorIds = new Set(openingTubes.map(t => t.sample.donorInternalId));
    expect(donorIds.size).toBe(2);

    const fullBoxName = boxes[DEMO_DATASET.placement.fullBoxOrdinal].name;
    expect(occupancy(fullBoxName)).toBe(capacity);
  });

  // A demo lab may hold more people than the demo account; its history must not follow whichever
  // user the database returns first.
  it('attributes seeded history to the lab admin, not whichever user comes back first', async () => {
    const lab = await seed.lab();
    const admin = await seed.user({ labId: lab.id, role: UserRole.labAdmin() });
    await seed.user({ labId: lab.id });
    const config = await storage.ensureDefaultForLab(lab.id);

    await apply(lab.id, admin.id, config);

    const items = await factory.getReagentItemRepository().findByLabIdWithStock(lab.id);
    const transactions = await factory
      .getReagentItemRepository()
      .findTransactionsByItemId(items[0].item.id);

    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions.every(t => t.performedBy === admin.id)).toBe(true);
  });

  it('restores rather than duplicates when applied twice', async () => {
    const { lab, user, config } = await demoLab();
    await apply(lab.id, user.id, config);
    await apply(lab.id, user.id, config);

    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);
    const donors = await factory.getDonorRepository().findByLabId(lab.id);
    const researchers = await factory.getResearcherRepository().findByLabId(lab.id);

    expect(tubes).toHaveLength(EXPECTED_TUBES);
    expect(donors).toHaveLength(DEMO_DATASET.donors.length);
    expect(researchers).toHaveLength(DEMO_DATASET.people.length);
  });

  it('refuses rather than half-filling a lab too small to hold the dataset', async () => {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });
    const full = await storage.ensureDefaultForLab(lab.id);

    // One box of 81 positions cannot hold the dataset; the run must refuse, not truncate.
    const tanks = full
      .toData()
      .tanks.slice(0, 1)
      .map(tank => ({
        ...tank,
        racks: tank.racks.slice(0, 1).map(rack => ({ ...rack, boxes: rack.boxes.slice(0, 1) })),
      }));
    const tiny = Storage.fromData({ ...full.toData(), tanks });

    await expect(apply(lab.id, user.id, tiny)).rejects.toThrow(/positions/);
  });
});
