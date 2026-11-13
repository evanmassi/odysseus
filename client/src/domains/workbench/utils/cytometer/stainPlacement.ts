import { findDyeLaser, normalizeMaterialKey } from '../materials/materialGuesser';

import { EMISSION_PEAK_NM } from './emissionPeaks';
import { filterCenter } from './wavelengthColor';

import type { Instrument } from '@odysseus/shared-schemas';

type Laser = Instrument['lasers'][number];
type Detector = Laser['detectors'][number];

export interface DyeFacts {
  name: string;
  lasers: readonly number[];
  emission: number;
}

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
const PHYCOERYTHRIN_LASERS_NM = [561, 488];

const emissionByKey = new Map(
  Object.entries(EMISSION_PEAK_NM).map(([name, nm]) => [normalizeMaterialKey(name), nm])
);

export function dyeFacts(fluorochrome: string): DyeFacts | undefined {
  const dye = findDyeLaser(fluorochrome);
  const emission = dye && emissionByKey.get(normalizeMaterialKey(dye.name));
  if (!dye || emission === undefined) return undefined;
  const laserNm = Number.parseFloat(dye.laser.replace(/^\D+/, ''));
  return {
    name: dye.name,
    lasers: Number.isFinite(laserNm) ? [laserNm] : PHYCOERYTHRIN_LASERS_NM,
    emission,
  };
}

const laserRank = (laser: Laser, facts: DyeFacts) =>
  facts.lasers.findIndex(nm => Math.abs(nm - laser.nm) <= LASER_MATCH_NM);

function bandGap(emission: number, filter: string): number {
  const [, width = '0'] = filter.split('/');
  return Math.max(0, Math.abs(emission - filterCenter(filter)) - Number.parseFloat(width) / 2);
}

export function bestDetector(instrument: Instrument, facts: DyeFacts): DetectorChoice | undefined {
  return instrument.lasers
    .filter(laser => laserRank(laser, facts) >= 0)
    .flatMap(laser =>
      laser.detectors.map(detector => ({
        laser,
        detector,
        gap: bandGap(facts.emission, detector.filter),
      }))
    )
    .sort(
      (a, b) =>
        a.gap - b.gap ||
        laserRank(a.laser, facts) - laserRank(b.laser, facts) ||
        Math.abs(facts.emission - filterCenter(a.detector.filter)) -
          Math.abs(facts.emission - filterCenter(b.detector.filter))
    )[0];
}

export function misplacementText(
  instrument: Instrument,
  fluorochrome: string,
  detectorId: string
): Misplacement | undefined {
  const facts = dyeFacts(fluorochrome);
  const best = facts && bestDetector(instrument, facts);
  const laser = instrument.lasers.find(candidate =>
    candidate.detectors.some(detector => detector.id === detectorId)
  );
  const detector = laser?.detectors.find(candidate => candidate.id === detectorId);
  if (!facts || !best || !laser || !detector || best.detector.id === detectorId) return undefined;
  const isExcited = laserRank(laser, facts) >= 0;
  if (isExcited && bandGap(facts.emission, detector.filter) <= best.gap) return undefined;
  const why = isExcited
    ? `peaks near ${facts.emission} nm`
    : `isn’t excited by the ${laser.name.toLowerCase()} laser`;
  return {
    text: `${facts.name} ${why}; it works best on ${best.detector.id} (${best.detector.filter}).`,
    detectorId: best.detector.id,
    filter: best.detector.filter,
  };
}

export const stainCandidatesOn = (
  instrument: Instrument,
  stains: ReadonlyArray<{ materialId: string; name: string; fluorochrome: string }>
): StainCandidate[] =>
  stains.map(({ materialId, name, fluorochrome }) => {
    const facts = dyeFacts(fluorochrome);
    return { materialId, name, best: facts && bestDetector(instrument, facts) };
  });
