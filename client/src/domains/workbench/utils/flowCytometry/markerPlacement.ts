import { type Fluor, type FluorCatalog } from '../fluors/fluorCatalog';

import { filterCenter } from './wavelengthColor';

import type { Cytometer } from '@odysseus/shared-schemas';

type Laser = Cytometer['lasers'][number];
type Detector = Laser['detectors'][number];

export interface DetectorChoice {
  laser: Laser;
  detector: Detector;
  gap: number;
}

export interface Misplacement {
  text: string;
  detectorId: string;
  filter: string;
}

export interface MarkerCandidate {
  materialId: string;
  name: string;
  best: DetectorChoice | undefined;
}

const LASER_MATCH_NM = 15;

const laserRank = (laser: Laser, fluor: Fluor) =>
  fluor.lasers.findIndex(nm => Math.abs(nm - laser.nm) <= LASER_MATCH_NM);

function bandGap(emission: number, filter: string): number {
  const [, width = '0'] = filter.split('/');
  return Math.max(0, Math.abs(emission - filterCenter(filter)) - Number.parseFloat(width) / 2);
}

export function bestDetector(cytometer: Cytometer, fluor: Fluor): DetectorChoice | undefined {
  return cytometer.lasers
    .filter(laser => laserRank(laser, fluor) >= 0)
    .flatMap(laser =>
      laser.detectors.map(detector => ({
        laser,
        detector,
        gap: bandGap(fluor.peak, detector.filter),
      }))
    )
    .sort(
      (a, b) =>
        a.gap - b.gap ||
        laserRank(a.laser, fluor) - laserRank(b.laser, fluor) ||
        Math.abs(fluor.peak - filterCenter(a.detector.filter)) -
          Math.abs(fluor.peak - filterCenter(b.detector.filter))
    )[0];
}

export function misplacementText(
  cytometer: Cytometer,
  catalog: FluorCatalog,
  fluorName: string,
  detectorId: string
): Misplacement | undefined {
  const fluor = catalog.find(fluorName);
  const best = fluor && bestDetector(cytometer, fluor);
  const laser = cytometer.lasers.find(candidate =>
    candidate.detectors.some(detector => detector.id === detectorId)
  );
  const detector = laser?.detectors.find(candidate => candidate.id === detectorId);
  if (!fluor || !best || !laser || !detector || best.detector.id === detectorId) return undefined;
  const isExcited = laserRank(laser, fluor) >= 0;
  if (isExcited && bandGap(fluor.peak, detector.filter) <= best.gap) return undefined;
  const why = isExcited
    ? `peaks near ${fluor.peak} nm`
    : `isn't excited by the ${laser.name.toLowerCase()} laser`;
  return {
    text: `${fluor.name} ${why}; it works best on ${best.detector.id} (${best.detector.filter}).`,
    detectorId: best.detector.id,
    filter: best.detector.filter,
  };
}

export const markerCandidatesOn = (
  cytometer: Cytometer,
  catalog: FluorCatalog,
  markers: ReadonlyArray<{ materialId: string; name: string; fluor: string }>
): MarkerCandidate[] =>
  markers.map(({ materialId, name, fluor: fluorName }) => {
    const fluor = catalog.find(fluorName);
    return { materialId, name, best: fluor && bestDetector(cytometer, fluor) };
  });
