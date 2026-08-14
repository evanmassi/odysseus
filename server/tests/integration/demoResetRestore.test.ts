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

    // Tube count follows the lab's own storage, so the contract is "what it reported is what it
    // wrote" rather than a fixed number.
    expect(result.tubes).toBeGreaterThan(0);
    expect(result.donors).toBe(DEMO_DATASET.donors.length);
    expect(result.researchers).toBe(DEMO_DATASET.people.length);

    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);
    expect(tubes).toHaveLength(result.tubes);

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

  // The dataset used to pour into the first rack and stop, leaving the rest of the lab empty.
  // Spread across the whole lab, with varied occupancy, is the point of the placement.
  it('spreads across every rack at varied occupancy', async () => {
    const { lab, user, config } = await demoLab();
    await apply(lab.id, user.id, config);

    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);
    const racks = config.tanks.flatMap(tank => tank.racks);
    expect(racks.length).toBeGreaterThan(1);

    for (const rack of racks) {
      expect(tubes.some(t => t.location.rackId === rack.id)).toBe(true);
    }

    const occupancy = (rackId: string, boxName: string) =>
      tubes.filter(t => t.location.rackId === rackId && t.location.boxId === boxName).length;

    const counts = racks.flatMap(rack =>
      rack.boxes.map(box => ({ filled: occupancy(rack.id, box.name), capacity: box.maxPositions }))
    );

    expect(counts.some(b => b.filled === b.capacity)).toBe(true);
    expect(counts.some(b => b.filled === 0)).toBe(true);
    expect(counts.some(b => b.filled > 0 && b.filled < b.capacity)).toBe(true);
  });

  // Most boxes hold one group so they can be named for their contents, but a shared box is what
  // shows the grid splitting into blocks of colour — and the blocks must be contiguous.
  it('mixes single-group and shared boxes, each group in one contiguous run', async () => {
    const { lab, user, config } = await demoLab();
    await apply(lab.id, user.id, config);

    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);
    const boxes = config.tanks
      .flatMap(tank => tank.racks)
      .flatMap(rack => rack.boxes.map(box => ({ rackId: rack.id, name: box.name })));

    const boxContents = boxes
      .map(box =>
        tubes
          .filter(t => t.location.rackId === box.rackId && t.location.boxId === box.name)
          .sort((a, b) => a.location.position - b.location.position)
          .map(t => `${t.sample.donorInternalId}/${t.sample.cellType}`)
      )
      .filter(contents => contents.length > 0);

    const distinct = boxContents.map(contents => new Set(contents).size);
    expect(distinct.some(n => n === 1)).toBe(true);
    expect(distinct.some(n => n > 1)).toBe(true);

    // A group occupies one unbroken run, never scattered back through the box.
    for (const contents of boxContents) {
      const blocks = contents.filter((entry, i) => i === 0 || entry !== contents[i - 1]);
      expect(new Set(blocks).size).toBe(blocks.length);
    }
  });

  // A visitor lands on the first box and should have room to add a tube straight away.
  it('leaves the opening box mostly free', async () => {
    const { lab, user, config } = await demoLab();
    await apply(lab.id, user.id, config);

    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);
    const firstRack = config.tanks[0].racks[0];
    const openingBox = firstRack.boxes[0];
    const filled = tubes.filter(
      t => t.location.rackId === firstRack.id && t.location.boxId === openingBox.name
    ).length;

    expect(filled).toBeGreaterThan(0);
    expect(filled).toBeLessThan(openingBox.maxPositions / 2);
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
    const first = await apply(lab.id, user.id, config);
    await apply(lab.id, user.id, config);

    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);
    const donors = await factory.getDonorRepository().findByLabId(lab.id);
    const researchers = await factory.getResearcherRepository().findByLabId(lab.id);

    expect(tubes).toHaveLength(first.tubes);
    expect(donors).toHaveLength(DEMO_DATASET.donors.length);
    expect(researchers).toHaveLength(DEMO_DATASET.people.length);
  });

  // A small lab is fine now — boxes fill by their own capacity. A lab with nowhere to put a tube
  // is not, and must refuse rather than report a successful run that placed nothing.
  it('refuses a lab with no boxes to place tubes in', async () => {
    const lab = await seed.lab();
    const user = await seed.user({ labId: lab.id });
    const full = await storage.ensureDefaultForLab(lab.id);

    const tanks = full
      .toData()
      .tanks.slice(0, 1)
      .map(tank => ({
        ...tank,
        racks: tank.racks.slice(0, 1).map(rack => ({ ...rack, boxes: [] })),
      }));
    const boxless = Storage.fromData({ ...full.toData(), tanks });

    await expect(apply(lab.id, user.id, boxless)).rejects.toThrow(/no boxes/);
  });
});
