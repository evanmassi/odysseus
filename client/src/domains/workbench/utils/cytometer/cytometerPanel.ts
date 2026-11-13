import { type DyeCatalog } from '../dyes/dyeCatalog';
import { ANTIBODY_GROUP, materialFields } from '../materials/materialCatalog';
import { guessMaterial } from '../materials/materialGuesser';
import { applyMaterialKind, materialFromGuess } from '../materials/materialItems';
import { normalizeMaterialKey } from '../materials/materialKey';
import { rememberedKinds, type LabMemory } from '../materials/materialMemory';

import { misplacementText, type Misplacement } from './stainPlacement';
import { filterCenter, wavelengthColor, wavelengthTone } from './wavelengthColor';

import type { CytometerBlock, Instrument, MaterialItem, Protocol } from '@odysseus/shared-schemas';

type PanelRow = CytometerBlock['rows'][number];
type Detector = Instrument['lasers'][number]['detectors'][number];

export interface PanelStain {
  row: PanelRow;
  material: MaterialItem | undefined;
  markerKey: string;
  marker: string;
  fluorochrome: string;
  isFluorochromeEditable: boolean;
  clone: string;
  isotype: string;
  sharesDetectorWith: string[];
  misplacement: Misplacement | undefined;
  dyeColor: string | undefined;
}

export interface DetectorSlot {
  detector: Detector;
  color: string;
  stains: PanelStain[];
}

export interface LaserGroup {
  name: string;
  nm: number;
  color: string;
  tone: string;
  slots: DetectorSlot[];
}

export interface PanelLayout {
  lasers: LaserGroup[];
  unplaced: PanelStain[];
  clashCount: number;
  misplacedCount: number;
}

export const CONJUGATE_KEY = 'conjugate';
const MARKER_KEYS = ['target', 'specificity', 'target-species-and-isotype'];
const NON_STAIN_TYPES = new Set(['Fc block', 'Beads']);
const STAIN_FALLBACK_TYPE = 'Antibody';
const STARTING_STAINS = ['Viability', 'Surface', 'ICS'];

const hasField = (item: MaterialItem, key: string) =>
  materialFields(item).some(definition => definition.key === key);

const dyeEmissionColor = (catalog: DyeCatalog, fluorochrome: string): string | undefined => {
  const dye = catalog.find(fluorochrome);
  return dye && wavelengthColor(dye.peak);
};

export const stainFluorochrome = (item: MaterialItem): string =>
  hasField(item, CONJUGATE_KEY) ? (item.values[CONJUGATE_KEY] ?? '').trim() : item.name.trim();

function readStain(
  row: PanelRow,
  material: MaterialItem | undefined,
  instrument: Instrument | undefined,
  catalog: DyeCatalog
): PanelStain {
  const value = (key: string) => (material?.values[key] ?? '').trim();
  const markerKey =
    (material && MARKER_KEYS.find(key => hasField(material, key))) ?? MARKER_KEYS[0];
  const isFluorochromeEditable = !material || hasField(material, CONJUGATE_KEY);
  const fluorochrome = material ? stainFluorochrome(material) : '';
  return {
    row,
    material,
    markerKey,
    marker: value(markerKey),
    fluorochrome,
    isFluorochromeEditable,
    clone: value('clone'),
    isotype: value('isotype'),
    sharesDetectorWith: [],
    misplacement: instrument && misplacementText(instrument, catalog, fluorochrome, row.detectorId),
    dyeColor: dyeEmissionColor(catalog, fluorochrome),
  };
}

const stainLabel = (stain: PanelStain) =>
  [stain.fluorochrome, stain.marker, stain.material?.name.trim()].find(Boolean) ?? 'another stain';

export function panelLayout(
  block: CytometerBlock,
  materials: readonly MaterialItem[],
  catalog: DyeCatalog
): PanelLayout {
  const byId = new Map(materials.map(item => [item.id, item]));
  const stains = block.rows.map(row =>
    readStain(row, byId.get(row.materialId), block.instrument, catalog)
  );
  const placed = new Set<PanelStain>();
  const lasers = (block.instrument?.lasers ?? []).map(laser => ({
    name: laser.name,
    nm: laser.nm,
    color: wavelengthColor(laser.nm),
    tone: wavelengthTone(laser.nm),
    slots: laser.detectors.map(detector => {
      const inSlot = stains.filter(stain => stain.row.detectorId === detector.id);
      inSlot.forEach(stain => {
        placed.add(stain);
        stain.sharesDetectorWith = inSlot.filter(other => other !== stain).map(stainLabel);
      });
      return { detector, color: wavelengthColor(filterCenter(detector.filter)), stains: inSlot };
    }),
  }));
  const clashCount = lasers
    .flatMap(laser => laser.slots)
    .filter(slot => slot.stains.length > 1).length;
  return {
    lasers,
    unplaced: stains.filter(stain => !placed.has(stain)),
    clashCount,
    misplacedCount: stains.filter(stain => stain.misplacement).length,
  };
}

export const stainCandidates = (
  block: CytometerBlock,
  materials: readonly MaterialItem[]
): MaterialItem[] => {
  const onPanel = new Set(block.rows.map(row => row.materialId));
  return materials.filter(
    item =>
      item.group === ANTIBODY_GROUP && !NON_STAIN_TYPES.has(item.type) && !onPanel.has(item.id)
  );
};

export function stainSteps(block: CytometerBlock): string[] {
  const steps = new Map<string, string>();
  for (const stain of [...block.rows.map(row => row.stain), ...STARTING_STAINS]) {
    const key = normalizeMaterialKey(stain);
    if (key && !steps.has(key)) steps.set(key, stain.trim());
  }
  return [...steps.values()];
}

export const dilutionFactor = (typed: string): string => typed.replace(/^\s*1\s*:\s*/, '');

export const firstOpenDetector = (laser: LaserGroup): string | undefined =>
  (laser.slots.find(slot => !slot.stains.length) ?? laser.slots[0])?.detector.id;

export function panelDetectorLabels(protocol: Pick<Protocol, 'blocks'>): Map<string, string> {
  const detectors = new Map<string, string[]>();
  for (const block of protocol.blocks) {
    if (block.type !== 'cytometer') continue;
    for (const row of block.rows) {
      detectors.set(row.materialId, [...(detectors.get(row.materialId) ?? []), row.detectorId]);
    }
  }
  return new Map([...detectors].map(([materialId, ids]) => [materialId, ids.join(', ')]));
}

export function newStainMaterial(
  text: string,
  memory: LabMemory,
  protocol: Pick<Protocol, 'blocks'>
): MaterialItem {
  const item = materialFromGuess(guessMaterial(text, rememberedKinds(memory, protocol)), memory);
  if (item.group !== ANTIBODY_GROUP || NON_STAIN_TYPES.has(item.type)) {
    applyMaterialKind(item, ANTIBODY_GROUP, STAIN_FALLBACK_TYPE, memory);
  }
  return item;
}
