import { type Dye, type DyeCatalog } from '../dyes/dyeCatalog';

import { filterCenter } from './wavelengthColor';

import type { Instrument } from '@odysseus/shared-schemas';

type Laser = Instrument['lasers'][number];
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

export interface StainCandidate {
  materialId: string;
  name: string;
  best: DetectorChoice | undefined;
}

const LASER_MATCH_NM = 15;

const laserRank = (laser: Laser, dye: Dye) =>
  dye.lasers.findIndex(nm => Math.abs(nm - laser.nm) <= LASER_MATCH_NM);

function bandGap(emission: number, filter: string): number {
  const [, width = '0'] = filter.split('/');
  return Math.max(0, Math.abs(emission - filterCenter(filter)) - Number.parseFloat(width) / 2);
}

export function bestDetector(instrument: Instrument, dye: Dye): DetectorChoice | undefined {
  return instrument.lasers
    .filter(laser => laserRank(laser, dye) >= 0)
    .flatMap(laser =>
      laser.detectors.map(detector => ({
        laser,
        detector,
        gap: bandGap(dye.peak, detector.filter),
      }))
    )
    .sort(
      (a, b) =>
        a.gap - b.gap ||
        laserRank(a.laser, dye) - laserRank(b.laser, dye) ||
        Math.abs(dye.peak - filterCenter(a.detector.filter)) -
          Math.abs(dye.peak - filterCenter(b.detector.filter))
    )[0];
}

export function misplacementText(
  instrument: Instrument,
  catalog: DyeCatalog,
  fluorochrome: string,
  detectorId: string
): Misplacement | undefined {
  const dye = catalog.find(fluorochrome);
  const best = dye && bestDetector(instrument, dye);
  const laser = instrument.lasers.find(candidate =>
    candidate.detectors.some(detector => detector.id === detectorId)
  );
  const detector = laser?.detectors.find(candidate => candidate.id === detectorId);
  if (!dye || !best || !laser || !detector || best.detector.id === detectorId) return undefined;
  const isExcited = laserRank(laser, dye) >= 0;
  if (isExcited && bandGap(dye.peak, detector.filter) <= best.gap) return undefined;
  const why = isExcited
    ? `peaks near ${dye.peak} nm`
    : `isn’t excited by the ${laser.name.toLowerCase()} laser`;
  return {
    text: `${dye.name} ${why}; it works best on ${best.detector.id} (${best.detector.filter}).`,
    detectorId: best.detector.id,
    filter: best.detector.filter,
  };
}

export const stainCandidatesOn = (
  instrument: Instrument,
  catalog: DyeCatalog,
  stains: ReadonlyArray<{ materialId: string; name: string; fluorochrome: string }>
): StainCandidate[] =>
  stains.map(({ materialId, name, fluorochrome }) => {
    const dye = catalog.find(fluorochrome);
    return { materialId, name, best: dye && bestDetector(instrument, dye) };
  });
