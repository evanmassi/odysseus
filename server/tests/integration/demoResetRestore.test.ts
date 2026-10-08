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
    // PITFALL: withTransaction is only on the factory, which owns its own pool against the same test DB.
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

    const seats = new Set(
      tubes.map(t => `${t.location.rackId}:${t.location.boxId}:${t.location.position}`)
    );
    expect(seats.size).toBe(tubes.length);
  });

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

    for (const contents of boxContents) {
      const blocks = contents.filter((entry, i) => i === 0 || entry !== contents[i - 1]);
      expect(new Set(blocks).size).toBe(blocks.length);
    }
  });

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

  it('ends every item on its declared stock with one barcode, even when applied twice', async () => {
    const { lab, user, config } = await demoLab();
    await apply(lab.id, user.id, config);
    await apply(lab.id, user.id, config);

    const supplies = factory.getSupplyItemRepository();
    for (const supply of DEMO_DATASET.supplies) {
      const stock = await supplies.findStockByItemId(supply.id);
      for (const declared of supply.stock) {
        const row = stock.find(s => s.locationId === declared.locationRef);
        expect(Number(row?.quantity ?? 0)).toBe(declared.quantity);
      }
      expect(await supplies.findBarcodesByItemId(supply.id)).toHaveLength(1);
    }

    const reagents = factory.getReagentItemRepository();
    for (const reagent of DEMO_DATASET.reagents) {
      const lots = await reagents.findLotsByItemId(reagent.id);
      for (const declared of reagent.lots) {
        const lot = lots.find(l => l.lotNumber === declared.lotNumber);
        expect(Number(lot?.quantity)).toBe(declared.quantity);
      }
    }
  });

  it('gives every alert and status a visitor can look for something to show', async () => {
    const { lab, user, config } = await demoLab();
    await apply(lab.id, user.id, config);

    const today = new Date().toISOString().slice(0, 10);
    const inThirtyDays = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const equipment = await factory.getEquipmentItemRepository().findByLabId(lab.id);
    const dueDates = equipment.flatMap(item => item.nextMaintenanceDate ?? []);
    expect(dueDates.some(date => date < today)).toBe(true);
    expect(dueDates.some(date => date >= today && date <= inThirtyDays)).toBe(true);
    expect(equipment.some(item => item.status === 'decommissioned')).toBe(true);
    expect(equipment.some(item => item.status === 'out_of_service')).toBe(true);

    const donors = await factory.getDonorRepository().findByLabId(lab.id);
    expect(donors.some(donor => !donor.isCurated)).toBe(true);

    const tubes = await factory.getTubeRepository().findAllByLabId(lab.id);
    expect(tubes.some(tube => tube.isLocked)).toBe(true);

    const supplies = await factory.getSupplyItemRepository().findByLabIdWithStock(lab.id);
    expect(supplies.some(({ item }) => item.status === 'archived')).toBe(true);
    expect(supplies.some(({ totalStock }) => totalStock === 0)).toBe(true);
  });

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
