/**
 * Reagent Attribute Values
 *
 * Writing a value replaces the definition's rows wholesale, because a multi_select stores one row
 * per chosen option. These pin that replacement, the single-value rule, and the batched fill the
 * list rollup depends on.
 */

import { AttributeDefinition } from '@domain/entities/AttributeDefinition';
import { ReagentApplicationService } from '@application/services/ReagentApplicationService';
import { AccessControlService } from '@domain/services/AccessControlService';
import { generateId } from '@domain/utils/generateId';
import { AttributeRepository } from '@infrastructure/repositories/AttributeRepository';
import { ReagentItemRepository } from '@infrastructure/repositories/ReagentItemRepository';
import { StorageRepository } from '@infrastructure/repositories/StorageRepository';
import { TubeRepository } from '@infrastructure/repositories/TubeRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import { createTestAdmin } from '../../src/domain/__tests__/helpers';

import type { EventBus } from '@application/contracts/EventBus';
import type { ReagentCategory } from '@domain/entities/ReagentCategory';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';
import type { SupplyItemRepository } from '@domain/repositories/SupplyItemRepository';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';
import type { AttributeValueType } from '@odysseus/shared-schemas';

describe('reagent attribute values', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let attributes: AttributeRepository;
  let items: ReagentItemRepository;
  let service: ReagentApplicationService;
  const admin = createTestAdmin();

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    attributes = new AttributeRepository(context);
    items = new ReagentItemRepository(context);
    const tubes = new TubeRepository(context, new StorageRepository(context));
    service = new ReagentApplicationService(
      {} as CategoryRepository<ReagentCategory>,
      items,
      {} as SupplyItemRepository,
      attributes,
      new AccessControlService(tubes),
      { publish: async () => undefined } as unknown as EventBus,
      new StorageRepository(context)
    );
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await context.close();
  });

  async function scenario(valueType: AttributeValueType = 'multi_select') {
    const lab = await seed.lab();
    const item = await seed.reagentItem({ labId: lab.id });
    const definition = AttributeDefinition.create({
      labId: lab.id,
      name: 'Fluorophore',
      valueType,
    });
    await attributes.saveDefinition(definition);

    const options = await Promise.all(
      ['FITC', 'PE', 'APC'].map(async (value, index) => {
        const option = {
          id: generateId('aopt'),
          definitionId: definition.id,
          value,
          sortOrder: index,
        };
        await attributes.saveOption(option);
        return option;
      })
    );

    return { lab, item, definition, options };
  }

  it('stores one row per option for a multi_select', async () => {
    const { lab, item, definition, options } = await scenario();

    const stored = await service.setAttributeValue(
      lab.id,
      item.id,
      { definitionId: definition.id, valueOptionIds: [options[0].id, options[1].id] },
      admin
    );

    expect(stored).toHaveLength(2);
    expect(stored.map(v => v.valueOptionId).sort()).toEqual([options[0].id, options[1].id].sort());
  });

  it('replaces the previous selection rather than appending', async () => {
    const { lab, item, definition, options } = await scenario();
    await service.setAttributeValue(
      lab.id,
      item.id,
      { definitionId: definition.id, valueOptionIds: [options[0].id, options[1].id] },
      admin
    );

    const stored = await service.setAttributeValue(
      lab.id,
      item.id,
      { definitionId: definition.id, valueOptionIds: [options[2].id] },
      admin
    );

    expect(stored).toHaveLength(1);
    expect(stored[0].valueOptionId).toBe(options[2].id);
  });

  it('clears the value when no options are given', async () => {
    const { lab, item, definition, options } = await scenario();
    await service.setAttributeValue(
      lab.id,
      item.id,
      { definitionId: definition.id, valueOptionIds: [options[0].id] },
      admin
    );

    const stored = await service.setAttributeValue(
      lab.id,
      item.id,
      { definitionId: definition.id, valueOptionIds: [] },
      admin
    );

    expect(stored).toHaveLength(0);
    expect(await items.findAttributeValuesByItemId(item.id)).toHaveLength(0);
  });

  it('rejects more than one value for a select', async () => {
    const { lab, item, definition, options } = await scenario('select');

    await expect(
      service.setAttributeValue(
        lab.id,
        item.id,
        { definitionId: definition.id, valueOptionIds: [options[0].id, options[1].id] },
        admin
      )
    ).rejects.toThrow(/accepts a single value/);
  });

  it('stores a scalar value for a text attribute', async () => {
    const { lab, item, definition } = await scenario('text');

    const stored = await service.setAttributeValue(
      lab.id,
      item.id,
      { definitionId: definition.id, valueText: 'OKT3' },
      admin
    );

    expect(stored).toHaveLength(1);
    expect(stored[0].valueText).toBe('OKT3');
    expect(stored[0].valueOptionId).toBeNull();
  });

  it('fills the list rollup from a single lab-wide query', async () => {
    const { lab, item, definition, options } = await scenario();
    await service.setAttributeValue(
      lab.id,
      item.id,
      { definitionId: definition.id, valueOptionIds: [options[0].id] },
      admin
    );

    const listed = await service.listItems(lab.id);

    expect(listed).toHaveLength(1);
    expect(listed[0].attributeValues).toEqual([
      {
        definitionId: definition.id,
        valueOptionId: options[0].id,
        valueText: null,
        valueNumber: null,
      },
    ]);
  });
});
