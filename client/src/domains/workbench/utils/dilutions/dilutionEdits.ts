import { materialFields } from '../materials/materialCatalog';
import { showMaterialField, writeMaterialField } from '../materials/materialItems';
import { ensureMaterial } from '../materials/materialLookup';

import type { PrepSettings } from './dilutionFormulas';
import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

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

export function recordOnMaterial(
  draft: Protocol,
  subject: string,
  field: string,
  value: string,
  unit: string,
  createMaterial: (name: string) => MaterialItem
): void {
  const material = ensureMaterial(draft, subject, createMaterial);
  const definition = materialFields(material).find(candidate => candidate.key === field);
  if (definition) writeMaterialField(material, definition, value);
  else {
    material.values[field] = value;
    showMaterialField(material, field);
  }
  material.units[field] = unit;
}
