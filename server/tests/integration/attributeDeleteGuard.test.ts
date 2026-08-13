/**
 * Attribute Delete Guard
 *
 * Every catalog's value table cascades from both the definition and the option, so an unguarded
 * delete would silently strip a field from every item that recorded a value. These are the guards
 * that stop it, plus the rule that seeded system attributes are undeletable.
 */

import { AttributeApplicationService } from '@application/services/AttributeApplicationService';
import { AttributeDefinition } from '@domain/entities/AttributeDefinition';
import { AccessControlService } from '@domain/services/AccessControlService';
import { generateId } from '@domain/utils/generateId';
import { AttributeRepository } from '@infrastructure/repositories/AttributeRepository';
import { StorageRepository } from '@infrastructure/repositories/StorageRepository';
import { TubeRepository } from '@infrastructure/repositories/TubeRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import { createTestAdmin } from '../../src/domain/__tests__/helpers';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('attribute delete guard', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let repo: AttributeRepository;
  let service: AttributeApplicationService;
  const admin = createTestAdmin();

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    repo = new AttributeRepository(context);
    const tubes = new TubeRepository(context, new StorageRepository(context));
    service = new AttributeApplicationService(
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

  async function scenario(overrides: { isSystem?: boolean } = {}) {
    const lab = await seed.lab();
    const item = await seed.reagentItem({ labId: lab.id });
    const definition = AttributeDefinition.create({
      labId: lab.id,
      name: 'Fluorophore',
      valueType: 'select',
      isSystem: overrides.isSystem,
      systemKey: overrides.isSystem ? 'fluorophore' : undefined,
    });
    await repo.saveDefinition(definition);

    const option = { id: generateId('aopt'), definitionId: definition.id, value: 'FITC', sortOrder: 0 };
    await repo.saveOption(option);

    const recordValue = () =>
      context.execute(
        `INSERT INTO reagent_attribute_values (id, item_id, definition_id, value_option_id)
         VALUES ($1, $2, $3, $4)`,
        [generateId('ratv'), item.id, definition.id, option.id]
      );

    return { lab, item, definition, option, recordValue };
  }

  it('refuses to delete a definition an item still records a value for', async () => {
    const { lab, definition, recordValue } = await scenario();
    await recordValue();

    await expect(service.deleteDefinition(lab.id, definition.id, admin)).rejects.toThrow(
      /1 item still records a value/
    );
    expect(await repo.findDefinitionById(definition.id, lab.id)).not.toBeNull();
  });

  it('refuses to delete an option an item still uses', async () => {
    const { lab, option, recordValue } = await scenario();
    await recordValue();

    await expect(service.deleteOption(lab.id, option.id, admin)).rejects.toThrow(/1 item still uses it/);
    expect(await repo.findOptionById(option.id, lab.id)).not.toBeNull();
  });

  it('refuses to delete a system definition even when unused', async () => {
    const { lab, definition } = await scenario({ isSystem: true });

    await expect(service.deleteDefinition(lab.id, definition.id, admin)).rejects.toThrow(
      /built-in attribute/
    );
  });

  it('deletes an unused definition and its options', async () => {
    const { lab, definition, option } = await scenario();

    await service.deleteDefinition(lab.id, definition.id, admin);

    expect(await repo.findDefinitionById(definition.id, lab.id)).toBeNull();
    expect(await repo.findOptionById(option.id, lab.id)).toBeNull();
  });

  // Definitions are lab-wide but each catalog stores its values in its own table, so a count that
  // only looked at reagents would clear the guard and let the cascade wipe the other two.
  it.each([
    ['a supply', 'supply', 'supply_attribute_values'],
    ['an equipment', 'equipment', 'equipment_attribute_values'],
  ])('refuses to delete a definition %s item records a value for', async (_label, catalog, table) => {
    const { lab, definition, option } = await scenario();
    const item =
      catalog === 'supply'
        ? await seed.supplyItem({ labId: lab.id })
        : await seed.equipmentItem({ labId: lab.id });

    await context.execute(
      `INSERT INTO ${table} (id, item_id, definition_id, value_option_id) VALUES ($1, $2, $3, $4)`,
      [generateId('atv'), item.id, definition.id, option.id]
    );

    await expect(service.deleteDefinition(lab.id, definition.id, admin)).rejects.toThrow(
      /1 item still records a value/
    );
    await expect(service.deleteOption(lab.id, option.id, admin)).rejects.toThrow(
      /1 item still uses it/
    );
  });

  it("does not surface another lab's definitions", async () => {
    const { definition } = await scenario();
    const otherLab = await seed.lab();

    expect(await repo.findDefinitionById(definition.id, otherLab.id)).toBeNull();
    expect((await service.list(otherLab.id)).definitions).toHaveLength(0);
  });
});
