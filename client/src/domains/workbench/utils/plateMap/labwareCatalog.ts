import type { PlateMapCard } from '@odysseus/shared-schemas';

type LabwareKind = 'well' | 'flask' | 'dish' | 'tube';

interface LabwareBase {
  label: string;
  group: 'Plates' | 'Flasks and dishes' | 'Tubes';
  kind: LabwareKind;
}

interface PlateLabware extends LabwareBase {
  rows: number;
  cols: number;
}

interface OtherLabware extends LabwareBase {
  prefix: 'F' | 'D' | 'T';
  shape: 'flask25' | 'flask75' | 'flask175' | 'dish' | 'micro' | 'facs' | 'conical15' | 'conical50';
  scale: number;
  short: string;
}

const plate = (format: string, rows: number, cols: number): PlateLabware => ({
  label: `${format}-well plate`,
  group: 'Plates',
  kind: 'well',
  rows,
  cols,
});

const PLATE_LABWARE: Readonly<Record<PlateMapCard['plates'][number]['vessel'], PlateLabware>> = {
  '6': plate('6', 2, 3),
  '12': plate('12', 3, 4),
  '24': plate('24', 4, 6),
  '48': plate('48', 6, 8),
  '96': plate('96', 8, 12),
  '384': plate('384', 16, 24),
};

const FLASK = { group: 'Flasks and dishes', kind: 'flask', prefix: 'F' } as const;
const TUBE = { group: 'Tubes', kind: 'tube', prefix: 'T' } as const;

export const OTHER_LABWARE: Readonly<Record<PlateMapCard['sets'][number]['vessel'], OtherLabware>> =
  {
    T25: { ...FLASK, label: 'T25 flask', shape: 'flask25', scale: 1, short: 'T25' },
    T75: { ...FLASK, label: 'T75 flask', shape: 'flask75', scale: 1.25, short: 'T75' },
    T175: { ...FLASK, label: 'T175 flask', shape: 'flask175', scale: 1.5, short: 'T175' },
    dish10: {
      label: '10 cm dish',
      group: 'Flasks and dishes',
      kind: 'dish',
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

export type LabwareType = keyof typeof PLATE_LABWARE | keyof typeof OTHER_LABWARE;

export const LABWARE_TYPES: readonly LabwareType[] = [
  ...(Object.keys(PLATE_LABWARE) as Array<keyof typeof PLATE_LABWARE>),
  ...(Object.keys(OTHER_LABWARE) as Array<keyof typeof OTHER_LABWARE>),
];

export const labwareOf = (type: LabwareType): PlateLabware | OtherLabware =>
  type in PLATE_LABWARE
    ? PLATE_LABWARE[type as keyof typeof PLATE_LABWARE]
    : OTHER_LABWARE[type as keyof typeof OTHER_LABWARE];

export const LABWARE_KIND_PLURALS: Readonly<Record<LabwareKind, string>> = {
  well: 'wells',
  flask: 'flasks',
  dish: 'dishes',
  tube: 'tubes',
};

export interface LabwareWords {
  noun: string;
  plural: string;
}

export const MIXED_LABWARE_WORDS: LabwareWords = { noun: 'sample', plural: 'samples' };

export function wordsForTypes(types: readonly LabwareType[]): LabwareWords {
  const nouns = [...new Set(types.map(type => labwareOf(type).kind))];
  return nouns.length === 1
    ? { noun: nouns[0], plural: LABWARE_KIND_PLURALS[nouns[0]] }
    : MIXED_LABWARE_WORDS;
}

export function labwareTypeAt(card: PlateMapCard, wellKey: string): LabwareType {
  const onPlate = card.plates.find(candidate => wellKey.startsWith(`${candidate.id}:`));
  if (onPlate) return onPlate.vessel;
  return (
    card.sets.find(set => wellKey.startsWith(`${set.id}#`))?.vessel ?? card.sets[0]?.vessel ?? '96'
  );
}
