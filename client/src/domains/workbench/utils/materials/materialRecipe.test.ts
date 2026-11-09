import { addRecipeLine, recipesUsing, removeRecipeEntry } from './materialRecipe';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

const material = (id: string, name: string): MaterialItem => ({
  id,
  group: 'chem',
  type: 'Recombinant protein',
  name,
  shownFields: [],
  values: {},
  units: {},
  customFields: [],
  fieldLabels: {},
  isDropped: false,
  recipe: [],
});

const protocolWith = (items: MaterialItem[]) =>
  ({
    blocks: [{ id: 'materials', type: 'materials', items, foldedGroups: [] }],
  }) as unknown as Protocol;

const itemsOf = (protocol: Protocol) =>
  protocol.blocks.flatMap(block => (block.type === 'materials' ? block.items : []));

describe('recipes', () => {
  it('adds a typed ingredient, linking a listed material or adding a new one', () => {
    const protocol = protocolWith([material('mix', 'Th17 cocktail'), material('il6', 'IL-6')]);
    addRecipeLine(protocol, 'mix', 'IL-6 20 µg/mL', name => material('new', name));
    addRecipeLine(protocol, 'mix', 'IL-23 10 µg/mL', name => material('il23', name));
    const [mix] = itemsOf(protocol);
    expect(mix.recipe.map(({ materialId, amount, unit }) => [materialId, amount, unit])).toEqual([
      ['il6', '20', 'µg/mL'],
      ['il23', '10', 'µg/mL'],
    ]);
    expect(itemsOf(protocol).map(item => item.name)).toContain('IL-23');
  });

  it('updates an ingredient typed again instead of listing it twice', () => {
    const protocol = protocolWith([material('mix', 'Th17 cocktail'), material('il6', 'IL-6')]);
    addRecipeLine(protocol, 'mix', 'IL-6 20 µg/mL', name => material('x', name));
    addRecipeLine(protocol, 'mix', 'IL-6 40 µg/mL', name => material('x', name));
    expect(itemsOf(protocol)[0].recipe.map(entry => entry.amount)).toEqual(['40']);
  });

  it('takes an ingredient out and lists which recipes use each material', () => {
    const protocol = protocolWith([material('mix', 'Th17 cocktail'), material('il6', 'IL-6')]);
    addRecipeLine(protocol, 'mix', 'IL-6 20 µg/mL', name => material('x', name));
    expect(recipesUsing(itemsOf(protocol)).get('il6')).toEqual(['Th17 cocktail']);
    removeRecipeEntry(protocol, 'mix', itemsOf(protocol)[0].recipe[0].id);
    expect(itemsOf(protocol)[0].recipe).toEqual([]);
  });
});
