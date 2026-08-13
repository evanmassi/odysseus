/**
 * Custom Unit CRUD
 *
 * A custom unit is referenced by its label across twelve columns in five tables, so a rename has to
 * rewrite all of them — rewriting a subset detaches packaging chains, which walk `parent_unit` to
 * `unit_name` to `stock_unit` by string equality. That is the bug migration 032 was written to avoid
 * and the reason `renameStockUnit` was deleted rather than fixed. These cases hold that line, plus
 * the guards that keep the dropdown honest.
 */

import { CustomUnitApplicationService } from '@application/services/CustomUnitApplicationService';
import { AccessControlService } from '@domain/services/AccessControlService';
import { generateId } from '@domain/utils/generateId';
import { CustomUnitRepository } from '@infrastructure/repositories/CustomUnitRepository';
import { StorageRepository } from '@infrastructure/repositories/StorageRepository';
import { TubeRepository } from '@infrastructure/repositories/TubeRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import { createTestAdmin } from '../../src/domain/__tests__/helpers';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('custom unit CRUD', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let repo: CustomUnitRepository;
  let service: CustomUnitApplicationService;
  const admin = createTestAdmin();

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    repo = new CustomUnitRepository(context);
    const tubes = new TubeRepository(context, new StorageRepository(context));
    service = new CustomUnitApplicationService(
      repo,
      new AccessControlService(tubes),
      new StorageRepository(context)
    );
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  /** An item in every unit-bearing table, all holding `label`. */
  async function itemsUsing(labId: string, label: string) {
    const supplyItem = await seed.supplyItem({ labId });
    await context.execute(
      `UPDATE supply_items SET stock_unit = $1, reorder_unit = $1, reorder_threshold_unit = $1 WHERE id = $2`,
      [label, supplyItem.id]
    );
    await seed.supplyPackagingLevel({ itemId: supplyItem.id, unitName: 'box', parentUnit: label });

    const reagentItem = await seed.reagentItem({ labId });
    await context.execute(
      `UPDATE reagent_items
       SET stock_unit = $1, reorder_unit = $1, reorder_threshold_unit = $1, concentration_unit = $1
       WHERE id = $2`,
      [label, reagentItem.id]
    );
    await context.execute(
      `INSERT INTO reagent_packaging_levels (id, item_id, unit_name, quantity, parent_unit)
       VALUES ($1, $2, 'vial', 10, $3)`,
      [generateId('rpkg'), reagentItem.id, label]
    );

    const location = await seed.location({ labId });
    await context.execute(
      `INSERT INTO reagent_lots (id, item_id, location_id, quantity, concentration_unit, status)
       VALUES ($1, $2, $3, 5, $4, 'active')`,
      [generateId('rlot'), reagentItem.id, location.id, label]
    );

    return { supplyItem, reagentItem };
  }

  async function unit(labId: string, label = 'beads/50 µL') {
    return service.create(labId, { label, kind: 'count-conc' }, admin);
  }

  it('refuses a label the registry already offers', async () => {
    const lab = await seed.lab();
    await expect(service.create(lab.id, { label: 'ML', kind: 'volume' }, admin)).rejects.toThrow(
      /already a standard unit/
    );
  });

  it('refuses a label the lab already has', async () => {
    const lab = await seed.lab();
    await unit(lab.id, 'rxn');
    await expect(service.create(lab.id, { label: 'RXN', kind: 'count' }, admin)).rejects.toThrow(
      /already has a unit/
    );
  });

  it('counts every column that holds the label', async () => {
    const lab = await seed.lab();
    const created = await unit(lab.id);
    await itemsUsing(lab.id, created.label);

    const [listed] = await service.list(lab.id);
    expect(listed.usageCount).toBe(10);
  });

  it('renames across all twelve unit columns and keeps the packaging chain attached', async () => {
    const lab = await seed.lab();
    const created = await unit(lab.id);
    const { supplyItem, reagentItem } = await itemsUsing(lab.id, created.label);

    await service.update(lab.id, created.id, { label: 'beads/100 µL' }, admin);

    const supply = await context.queryOne<{
      stock_unit: string;
      reorder_unit: string;
      reorder_threshold_unit: string;
    }>(
      `SELECT stock_unit, reorder_unit, reorder_threshold_unit FROM supply_items WHERE id = $1`,
      [supplyItem.id]
    );
    expect(supply).toEqual({
      stock_unit: 'beads/100 µL',
      reorder_unit: 'beads/100 µL',
      reorder_threshold_unit: 'beads/100 µL',
    });

    const reagent = await context.queryOne<{
      stock_unit: string;
      reorder_unit: string;
      reorder_threshold_unit: string;
      concentration_unit: string;
    }>(
      `SELECT stock_unit, reorder_unit, reorder_threshold_unit, concentration_unit
       FROM reagent_items WHERE id = $1`,
      [reagentItem.id]
    );
    expect(reagent).toEqual({
      stock_unit: 'beads/100 µL',
      reorder_unit: 'beads/100 µL',
      reorder_threshold_unit: 'beads/100 µL',
      concentration_unit: 'beads/100 µL',
    });

    const lot = await context.queryOne<{ concentration_unit: string }>(
      `SELECT concentration_unit FROM reagent_lots WHERE item_id = $1`,
      [reagentItem.id]
    );
    expect(lot?.concentration_unit).toBe('beads/100 µL');

    // The chain is intact only if each pack's parent_unit still names the item's stock unit.
    const chains = await context.queryMany<{ parent_unit: string; stock_unit: string }>(
      `SELECT p.parent_unit, i.stock_unit FROM supply_packaging_levels p
         JOIN supply_items i ON i.id = p.item_id WHERE i.lab_id = $1
       UNION ALL
       SELECT p.parent_unit, i.stock_unit FROM reagent_packaging_levels p
         JOIN reagent_items i ON i.id = p.item_id WHERE i.lab_id = $1`,
      [lab.id]
    );
    expect(chains).toHaveLength(2);
    chains.forEach(chain => expect(chain.parent_unit).toBe(chain.stock_unit));

    const [listed] = await service.list(lab.id);
    expect(listed.label).toBe('beads/100 µL');
    expect(listed.usageCount).toBe(10);
  });

  it('changes what an unused unit measures, and refuses once something uses it', async () => {
    const lab = await seed.lab();
    const created = await unit(lab.id);

    const rekinded = await service.update(lab.id, created.id, { kind: 'count' }, admin);
    expect(rekinded.kind).toBe('count');

    await itemsUsing(lab.id, created.label);
    await expect(
      service.update(lab.id, created.id, { kind: 'count-conc' }, admin)
    ).rejects.toThrow(/Cannot change what/);

    // A rename still works while in use — that is what the cascade is for.
    const renamed = await service.update(lab.id, created.id, { label: 'beads/100 µL' }, admin);
    expect(renamed.label).toBe('beads/100 µL');
    expect(renamed.kind).toBe('count');
  });

  it('leaves another lab holding the same label alone', async () => {
    const [lab, other] = [await seed.lab(), await seed.lab()];
    const created = await unit(lab.id);
    await unit(other.id);
    const untouched = await itemsUsing(other.id, created.label);

    await service.update(lab.id, created.id, { label: 'beads/100 µL' }, admin);

    const supply = await context.queryOne<{ stock_unit: string }>(
      `SELECT stock_unit FROM supply_items WHERE id = $1`,
      [untouched.supplyItem.id]
    );
    expect(supply?.stock_unit).toBe(created.label);

    // Counting is scoped the same way the rewrite is: the other lab's items are its own.
    const [renamed] = await service.list(lab.id);
    const [neighbour] = await service.list(other.id);
    expect(renamed.usageCount).toBe(0);
    expect(neighbour.usageCount).toBe(10);
  });

  it('refuses to delete a unit still in use, and allows it once free', async () => {
    const lab = await seed.lab();
    const created = await unit(lab.id);
    const { supplyItem, reagentItem } = await itemsUsing(lab.id, created.label);

    await expect(service.delete(lab.id, created.id, admin)).rejects.toThrow(/still use it/);

    await context.execute(`DELETE FROM supply_items WHERE id = $1`, [supplyItem.id]);
    await context.execute(`DELETE FROM reagent_items WHERE id = $1`, [reagentItem.id]);

    await service.delete(lab.id, created.id, admin);
    expect(await service.list(lab.id)).toHaveLength(0);
  });

  it('cannot reach a unit belonging to another lab', async () => {
    const [lab, other] = [await seed.lab(), await seed.lab()];
    const created = await unit(lab.id);

    await expect(
      service.update(other.id, created.id, { label: 'nope' }, admin)
    ).rejects.toThrow(/could not be found/);
    await expect(service.delete(other.id, created.id, admin)).rejects.toThrow(/could not be found/);
  });
});
