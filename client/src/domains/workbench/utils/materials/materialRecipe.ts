import { createId } from '../ids/createId';
import { parseValueLine } from '../values/valueLines';

import { ensureMaterial } from './materialLookup';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

type RecipeEntry = MaterialItem['recipe'][number];

export interface RecipeLine {
  entry: RecipeEntry;
  ingredient: MaterialItem | undefined;
}

const allMaterials = (protocol: Protocol): MaterialItem[] =>
  protocol.blocks.flatMap(block => (block.type === 'materials' ? block.items : []));

const materialIn = (protocol: Protocol, id: string) =>
  allMaterials(protocol).find(item => item.id === id);

export const recipeLines = (
  item: MaterialItem,
  materials: ReadonlyMap<string, MaterialItem>
): RecipeLine[] =>
  item.recipe.map(entry => ({ entry, ingredient: materials.get(entry.materialId) }));

export function addRecipeLine(
  draft: Protocol,
  itemId: string,
  text: string,
  createMaterial: (name: string) => MaterialItem
): void {
  const parsed = parseValueLine(text);
  const item = materialIn(draft, itemId);
  if (!parsed || !item) return;
  const ingredient = ensureMaterial(draft, parsed.name, createMaterial);
  if (ingredient.id === item.id) return;
  const existing = item.recipe.find(entry => entry.materialId === ingredient.id);
  if (existing) {
    existing.amount = parsed.value || existing.amount;
    existing.unit = parsed.unit || existing.unit;
    return;
  }
  item.recipe.push({
    id: createId(),
    materialId: ingredient.id,
    amount: parsed.value,
    unit: parsed.unit,
  });
}

export function editRecipeEntry(
  draft: Protocol,
  itemId: string,
  entryId: string,
  change: Partial<Pick<RecipeEntry, 'amount' | 'unit'>>
): void {
  const entry = materialIn(draft, itemId)?.recipe.find(candidate => candidate.id === entryId);
  if (entry) Object.assign(entry, change);
}

export function removeRecipeEntry(draft: Protocol, itemId: string, entryId: string): void {
  const item = materialIn(draft, itemId);
  if (item) item.recipe = item.recipe.filter(entry => entry.id !== entryId);
}

export function recipesUsing(materials: readonly MaterialItem[]): Map<string, string[]> {
  const usedIn = new Map<string, string[]>();
  for (const item of materials) {
    for (const { materialId } of item.recipe) {
      usedIn.set(materialId, [...(usedIn.get(materialId) ?? []), item.name.trim()]);
    }
  }
  return usedIn;
}
