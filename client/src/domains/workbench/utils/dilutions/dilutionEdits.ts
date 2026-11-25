import { materialFields } from '../materials/materialCatalog';
import { showMaterialField, writeMaterialField } from '../materials/materialItems';
import { ensureMaterial, materialNamed } from '../materials/materialLookup';
import { addNamedValue, writeValueSource } from '../values/valueEdits';

import type { SharedPrepField } from './dilutionPrep';
import type { MaterialItem, PlateSeries, Protocol } from '@odysseus/shared-schemas';

export type SeriesPrepKey = keyof NonNullable<PlateSeries['prep']>;

export function setPrepSetting(
  draft: Protocol,
  plateId: string,
  seriesId: string,
  key: SeriesPrepKey,
  value: string
): void {
  const series = draft.plateMaps.find(plateMap => plateMap.id === plateId)?.series[seriesId];
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
