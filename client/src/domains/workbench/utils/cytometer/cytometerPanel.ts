import { ANTIBODY_GROUP, materialFields } from '../materials/materialCatalog';
import { normalizeMaterialKey } from '../materials/materialGuesser';

import { filterCenter, wavelengthColor } from './wavelengthColor';

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
  catalog: string;
  sharesDetectorWith: string[];
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
  slots: DetectorSlot[];
}

export interface PanelLayout {
  lasers: LaserGroup[];
  unplaced: PanelStain[];
  clashCount: number;
}

export const CONJUGATE_KEY = 'conjugate';
const MARKER_KEYS = ['target', 'specificity', 'target-species-and-isotype'];
const NON_STAIN_TYPES = new Set(['Fc block', 'Beads']);
const STARTING_STAINS = ['Viability', 'Surface', 'ICS'];

const hasField = (item: MaterialItem, key: string) =>
  materialFields(item).some(definition => definition.key === key);

function readStain(row: PanelRow, material: MaterialItem | undefined): PanelStain {
  const value = (key: string) => (material?.values[key] ?? '').trim();
  const markerKey =
    (material && MARKER_KEYS.find(key => hasField(material, key))) ?? MARKER_KEYS[0];
  const isFluorochromeEditable = !material || hasField(material, CONJUGATE_KEY);
  return {
    row,
    material,
    markerKey,
    marker: value(markerKey),
    fluorochrome: isFluorochromeEditable ? value(CONJUGATE_KEY) : (material?.name.trim() ?? ''),
    isFluorochromeEditable,
    clone: value('clone'),
    catalog: value('catalog'),
    sharesDetectorWith: [],
  };
}

const stainLabel = (stain: PanelStain) =>
  [stain.fluorochrome, stain.marker, stain.material?.name.trim()].find(Boolean) ?? 'another stain';

export function panelLayout(
  block: CytometerBlock,
  materials: readonly MaterialItem[]
): PanelLayout {
  const byId = new Map(materials.map(item => [item.id, item]));
  const stains = block.rows.map(row => readStain(row, byId.get(row.materialId)));
  const placed = new Set<PanelStain>();
  const lasers = (block.instrument?.lasers ?? []).map(laser => ({
    name: laser.name,
    nm: laser.nm,
    color: wavelengthColor(laser.nm),
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
  return { lasers, unplaced: stains.filter(stain => !placed.has(stain)), clashCount };
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
