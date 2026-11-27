import { materialFields } from '../materials/materialCatalog';
import { showMaterialField, writeMaterialField } from '../materials/materialItems';
import { ensureMaterial, materialNamed } from '../materials/materialLookup';
import { addNamedValue } from '../values/valueEdits';
import { writeValueSource } from '../values/valueSources';

import type { SharedPrepField } from './dilutionPrep';
import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

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

export function setSharedPrepValue(
  draft: Protocol,
  subject: string,
  { key, edit }: SharedPrepField,
  value: string,
  pageId: string
): void {
  if (edit.kind === 'source') writeValueSource(draft, edit.source, value);
  if (edit.kind !== 'new' || !value.trim()) return;
  const material = key === 'totalWellVolume' ? undefined : materialNamed(draft, subject);
  addNamedValue(draft, { name: edit.name, value, unit: edit.unit }, material, pageId);
}
