import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { defaultCardTitle } from '../cards/cardTypes';
import { closeCardsShowing } from '../cards/createCard';
import { type FluorCatalog } from '../fluors/fluorCatalog';
import { createId } from '../ids/createId';
import { CONJUGATE_FIELD } from '../materials/conjugateConflicts';
import { ANTIBODY_GROUP, materialFields } from '../materials/materialCatalog';
import { guessMaterial, type MaterialKnowledge } from '../materials/materialGuesser';
import { applyMaterialType, materialFromGuess } from '../materials/materialItems';
import { type LabMemory } from '../materials/materialMemory';
import { unpaintStains } from '../plateMap/stainSide';

import { markerAmount, type MarkerAmount } from './markerAmount';
import { misplacementText, type Misplacement } from './markerPlacement';
import { filterCenter, wavelengthColor, wavelengthTone } from './wavelengthColor';

import type {
  FlowCytometryPanel,
  Cytometer,
  MaterialItem,
  Protocol,
} from '@odysseus/shared-schemas';

type PanelRow = FlowCytometryPanel['markers'][number];
type Detector = Cytometer['lasers'][number]['detectors'][number];

export interface PanelMarker {
  row: PanelRow;
  material: MaterialItem | undefined;
  markerKey: string;
  markerName: string;
  fluor: string;
  isFluorEditable: boolean;
  clone: string;
  isotype: string;
  amount: MarkerAmount | undefined;
  sharesDetectorWith: string[];
  misplacement: Misplacement | undefined;
  fluorColor: string | undefined;
}

export interface DetectorSlot {
  detector: Detector;
  color: string;
  markers: PanelMarker[];
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
  unplaced: PanelMarker[];
  detectorConflictCount: number;
  misplacedCount: number;
}

const MARKER_KEYS = ['target', 'specificity', 'target-species-and-isotype'];
const NON_MARKER_TYPES = new Set(['Fc block', 'Beads']);
const MARKER_FALLBACK_TYPE = 'Antibody';
const STARTING_STAININGS = ['Viability', 'Surface', 'ICS'];

const hasField = (item: MaterialItem, key: string) =>
  materialFields(item).some(definition => definition.key === key);

const fluorEmissionColor = (catalog: FluorCatalog, fluorName: string): string | undefined => {
  const fluor = catalog.find(fluorName);
  return fluor && wavelengthColor(fluor.peak);
};

export const markerFluor = (item: MaterialItem): string =>
  hasField(item, CONJUGATE_FIELD) ? (item.values[CONJUGATE_FIELD] ?? '').trim() : item.name.trim();

function readMarker(
  row: PanelRow,
  material: MaterialItem | undefined,
  cytometer: Cytometer | undefined,
  catalog: FluorCatalog
): PanelMarker {
  const value = (key: string) => (material?.values[key] ?? '').trim();
  const markerKey =
    (material && MARKER_KEYS.find(key => hasField(material, key))) ?? MARKER_KEYS[0];
  const isFluorEditable = !material || hasField(material, CONJUGATE_FIELD);
  const fluor = material ? markerFluor(material) : '';
  return {
    row,
    material,
    markerKey,
    markerName: value(markerKey),
    fluor,
    isFluorEditable,
    clone: value('clone'),
    isotype: value('isotype'),
    amount: material && markerAmount(material),
    sharesDetectorWith: [],
    misplacement: cytometer && misplacementText(cytometer, catalog, fluor, row.detectorId),
    fluorColor: fluorEmissionColor(catalog, fluor),
  };
}

const markerLabel = (marker: PanelMarker) =>
  [marker.fluor, marker.markerName, marker.material?.name.trim()].find(Boolean) ?? 'another marker';

export const newFlowCytometryPanel = (): FlowCytometryPanel => ({
  id: createId(),
  title: defaultCardTitle('flowCytometryPanel'),
  markers: [],
  stains: [],
});

export function removeFlowCytometryPanel(
  draft: Pick<Protocol, 'flowCytometryPanels' | 'plateMaps' | 'cards'>,
  panelId: string
): void {
  const panel = draft.flowCytometryPanels.find(candidate => candidate.id === panelId);
  if (!panel) return;
  unpaintStains(draft.plateMaps, new Set(panel.stains.map(stain => stain.id)));
  draft.flowCytometryPanels = draft.flowCytometryPanels.filter(other => other !== panel);
  closeCardsShowing(draft, panelId);
}

export function panelLayout(
  panel: FlowCytometryPanel,
  materials: readonly MaterialItem[],
  catalog: FluorCatalog
): PanelLayout {
  const byId = new Map(materials.map(item => [item.id, item]));
  const markers = panel.markers.map(row =>
    readMarker(row, byId.get(row.materialId), panel.cytometer, catalog)
  );
  const placed = new Set<PanelMarker>();
  const lasers = (panel.cytometer?.lasers ?? []).map(laser => ({
    name: laser.name,
    nm: laser.nm,
    color: wavelengthColor(laser.nm),
    tone: wavelengthTone(laser.nm),
    slots: laser.detectors.map(detector => {
      const inSlot = markers.filter(marker => marker.row.detectorId === detector.id);
      inSlot.forEach(marker => {
        placed.add(marker);
        marker.sharesDetectorWith = inSlot.filter(other => other !== marker).map(markerLabel);
      });
      return { detector, color: wavelengthColor(filterCenter(detector.filter)), markers: inSlot };
    }),
  }));
  const detectorConflictCount = lasers
    .flatMap(laser => laser.slots)
    .filter(slot => slot.markers.length > 1).length;
  return {
    lasers,
    unplaced: markers.filter(marker => !placed.has(marker)),
    detectorConflictCount,
    misplacedCount: markers.filter(marker => marker.misplacement).length,
  };
}

export const markerCandidates = (
  panel: FlowCytometryPanel,
  materials: readonly MaterialItem[]
): MaterialItem[] => {
  const onPanel = new Set(panel.markers.map(row => row.materialId));
  return materials.filter(
    item =>
      item.group === ANTIBODY_GROUP &&
      !NON_MARKER_TYPES.has(item.type) &&
      !onPanel.has(item.id) &&
      Boolean(markerFluor(item))
  );
};

export function panelStainings(panel: FlowCytometryPanel): string[] {
  const byKey = new Map<string, string>();
  for (const staining of [...panel.markers.map(row => row.staining), ...STARTING_STAININGS]) {
    const key = normalizeMaterialKey(staining);
    if (key && !byKey.has(key)) byKey.set(key, staining.trim());
  }
  return [...byKey.values()];
}

export const dilutionFactor = (typed: string): string => typed.replace(/^\s*1\s*:\s*/, '');

export const firstOpenDetector = (laser: LaserGroup): string | undefined =>
  (laser.slots.find(slot => !slot.markers.length) ?? laser.slots[0])?.detector.id;

export function panelDetectorLabels(
  protocol: Pick<Protocol, 'flowCytometryPanels'>
): Map<string, string> {
  const detectors = new Map<string, string[]>();
  for (const panel of protocol.flowCytometryPanels) {
    for (const row of panel.markers) {
      detectors.set(row.materialId, [...(detectors.get(row.materialId) ?? []), row.detectorId]);
    }
  }
  return new Map(
    [...detectors].map(([materialId, ids]) => [
      materialId,
      `${ids.length === 1 ? 'Detector' : 'Detectors'}: ${ids.join(', ')}`,
    ])
  );
}

export function newMarkerMaterial(
  text: string,
  known: MaterialKnowledge,
  memory: LabMemory
): MaterialItem {
  const item = materialFromGuess(guessMaterial(text, known), memory);
  if (item.group !== ANTIBODY_GROUP || NON_MARKER_TYPES.has(item.type)) {
    applyMaterialType(item, ANTIBODY_GROUP, MARKER_FALLBACK_TYPE, memory);
  }
  return item;
}
