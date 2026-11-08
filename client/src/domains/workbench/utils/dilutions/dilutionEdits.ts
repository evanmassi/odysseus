import { createBlock } from '../blocks/createBlock';
import { materialFields } from '../materials/materialCatalog';
import { showMaterialField, writeMaterialField } from '../materials/materialItems';

import { materialNamed } from './dilutionStock';

import type { PrepSettings } from './dilutionPrep';
import type { MaterialItem, MaterialsBlock, Protocol } from '@odysseus/shared-schemas';

const NEW_MATERIALS_SIZE = { w: 12, h: 8 };

export function setPrepSetting(
  draft: Protocol,
  plateId: string,
  seriesId: string,
  key: keyof PrepSettings,
  value: string
): void {
  const plate = draft.blocks.find(block => block.id === plateId);
  const series = plate?.type === 'plate' ? plate.series[seriesId] : undefined;
  if (series) series.prep = { ...series.prep, [key]: value };
}

function materialsBlockFor(draft: Protocol): MaterialsBlock {
  const existing = draft.blocks.find(
    (block): block is MaterialsBlock => block.type === 'materials'
  );
  if (existing) return existing;
  const page = draft.pages[0].id;
  const bottom = Math.max(
    0,
    ...draft.blocks.filter(block => block.page === page).map(block => block.y + block.h)
  );
  const created = createBlock('materials', { page, x: 0, y: bottom, ...NEW_MATERIALS_SIZE });
  draft.blocks.push(created);
  return created as MaterialsBlock;
}

export function recordOnMaterial(
  draft: Protocol,
  subject: string,
  field: string,
  value: string,
  unit: string,
  createMaterial: (name: string) => MaterialItem
): void {
  let material = materialNamed(draft, subject);
  if (!material) {
    material = createMaterial(subject);
    materialsBlockFor(draft).items.push(material);
  }
  const definition = materialFields(material).find(candidate => candidate.key === field);
  if (definition) writeMaterialField(material, definition, value);
  else {
    material.values[field] = value;
    showMaterialField(material, field);
  }
  material.units[field] = unit;
}
