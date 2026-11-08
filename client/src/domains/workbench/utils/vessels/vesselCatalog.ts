import type { VesselMapBlock } from '@odysseus/shared-schemas';

type VesselNoun = 'well' | 'flask' | 'dish' | 'tube';

interface VesselBase {
  label: string;
  group: 'Plates' | 'Flasks and dishes' | 'Tubes';
  noun: VesselNoun;
  many: 'Plates' | 'Flasks' | 'Dishes' | 'Tubes';
}

interface PlateVessel extends VesselBase {
  rows: number;
  cols: number;
}

interface LooseVessel extends VesselBase {
  prefix: 'F' | 'D' | 'T';
  shape: 'flask25' | 'flask75' | 'flask175' | 'dish' | 'micro' | 'facs' | 'conical15' | 'conical50';
  scale: number;
  short: string;
}

const plate = (format: string, rows: number, cols: number): PlateVessel => ({
  label: `${format}-well plate`,
  group: 'Plates',
  noun: 'well',
  many: 'Plates',
  rows,
  cols,
});

const PLATE_VESSELS: Readonly<Record<VesselMapBlock['plates'][number]['vessel'], PlateVessel>> = {
  '6': plate('6', 2, 3),
  '12': plate('12', 3, 4),
  '24': plate('24', 4, 6),
  '48': plate('48', 6, 8),
  '96': plate('96', 8, 12),
  '384': plate('384', 16, 24),
};

const FLASK = { group: 'Flasks and dishes', noun: 'flask', many: 'Flasks', prefix: 'F' } as const;
const TUBE = { group: 'Tubes', noun: 'tube', many: 'Tubes', prefix: 'T' } as const;

export const LOOSE_VESSELS: Readonly<
  Record<VesselMapBlock['sets'][number]['vessel'], LooseVessel>
> = {
  T25: { ...FLASK, label: 'T25 flask', shape: 'flask25', scale: 1, short: 'T25' },
  T75: { ...FLASK, label: 'T75 flask', shape: 'flask75', scale: 1.25, short: 'T75' },
  T175: { ...FLASK, label: 'T175 flask', shape: 'flask175', scale: 1.5, short: 'T175' },
  dish10: {
    label: '10 cm dish',
    group: 'Flasks and dishes',
    noun: 'dish',
    many: 'Dishes',
    prefix: 'D',
    shape: 'dish',
    scale: 1,
    short: '10 cm',
  },
  'tube1.5': { ...TUBE, label: '1.5 mL tube', shape: 'micro', scale: 0.6, short: '1.5 mL' },
  facs: { ...TUBE, label: '5 mL FACS tube', shape: 'facs', scale: 0.85, short: 'FACS' },
  tube15: { ...TUBE, label: '15 mL tube', shape: 'conical15', scale: 1.1, short: '15 mL' },
  tube50: { ...TUBE, label: '50 mL tube', shape: 'conical50', scale: 1.1, short: '50 mL' },
};

export type VesselType = keyof typeof PLATE_VESSELS | keyof typeof LOOSE_VESSELS;

export const VESSEL_TYPES: readonly VesselType[] = [
  ...(Object.keys(PLATE_VESSELS) as Array<keyof typeof PLATE_VESSELS>),
  ...(Object.keys(LOOSE_VESSELS) as Array<keyof typeof LOOSE_VESSELS>),
];

export const vesselOf = (type: VesselType): PlateVessel | LooseVessel =>
  type in PLATE_VESSELS
    ? PLATE_VESSELS[type as keyof typeof PLATE_VESSELS]
    : LOOSE_VESSELS[type as keyof typeof LOOSE_VESSELS];

export const VESSEL_PLURALS: Readonly<Record<VesselNoun, string>> = {
  well: 'wells',
  flask: 'flasks',
  dish: 'dishes',
  tube: 'tubes',
};

export function wordsForTypes(types: readonly VesselType[]): { noun: string; plural: string } {
  const nouns = [...new Set(types.map(type => vesselOf(type).noun))];
  return nouns.length === 1
    ? { noun: nouns[0], plural: VESSEL_PLURALS[nouns[0]] }
    : { noun: 'vessel', plural: 'vessels' };
}

export function vesselTypeAt(block: VesselMapBlock, wellKey: string): VesselType {
  const onPlate = block.plates.find(candidate => wellKey.startsWith(`${candidate.id}:`));
  if (onPlate) return onPlate.vessel;
  return (
    block.sets.find(set => wellKey.startsWith(`${set.id}#`))?.vessel ??
    block.sets[0]?.vessel ??
    '96'
  );
}
