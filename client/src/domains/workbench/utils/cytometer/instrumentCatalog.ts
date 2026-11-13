import type { Instrument } from '@odysseus/shared-schemas';

type Laser = Instrument['lasers'][number];

const conventionalLaser = (
  name: string,
  nm: number,
  prefix: string,
  detectors: ReadonlyArray<readonly [string, string]>
): Laser => ({
  name,
  nm,
  detectors: detectors.map(([filter, usual], index) => ({
    id: `${prefix}${index + 1}`,
    filter,
    usual,
  })),
});

const IQUE: Instrument = {
  name: 'Sartorius iQue',
  kind: 'conventional',
  lasers: [
    conventionalLaser('Violet', 405, 'VL', [
      ['445/45', 'BV421, Pacific Blue'],
      ['530/30', 'BV510'],
      ['572/30', 'BV570'],
      ['615/24', 'BV605'],
      ['675/30', 'BV650'],
      ['780/60', 'BV785'],
    ]),
    conventionalLaser('Blue', 488, 'BL', [
      ['530/30', 'FITC, GFP'],
      ['572/28', 'PE, PI'],
      ['615/24', 'PE-Texas Red'],
      ['675/30', 'PerCP-Cy5.5'],
      ['780/60', 'PE-Cy7'],
    ]),
    conventionalLaser('Red', 640, 'RL', [
      ['675/30', 'APC, AF647'],
      ['780/60', 'APC-Cy7'],
    ]),
  ],
};

const DISCOVER_BANDS = [
  '375/20',
  '392/14',
  '420/20',
  '440/20',
  '459/18',
  '476/16',
  '501/16',
  '517/16',
  '532/16',
  '547/16',
  '574/16',
  '590/16',
  '607/18',
  '625/18',
  '655/20',
  '675/20',
  '698/26',
  '724/26',
  '752/30',
  '782/30',
  '812/30',
  '844/34',
];

const spectralLaser = (name: string, nm: number, prefix: string, firstBand: string): Laser => ({
  name,
  nm,
  detectors: DISCOVER_BANDS.slice(DISCOVER_BANDS.indexOf(firstBand)).map((filter, index) => ({
    id: `${prefix}${index + 1}`,
    filter,
    usual: '',
  })),
});

const FACSDISCOVER_A8: Instrument = {
  name: 'BD FACSDiscover A8',
  kind: 'spectral',
  lasers: [
    spectralLaser('UV', 349, 'UV', '375/20'),
    spectralLaser('Violet', 405, 'V', '420/20'),
    spectralLaser('Blue', 488, 'B', '501/16'),
    spectralLaser('Yellow-green', 561, 'YG', '574/16'),
    spectralLaser('Red', 637, 'R', '655/20'),
  ],
};

export const BUILT_IN_INSTRUMENTS: readonly Instrument[] = [IQUE, FACSDISCOVER_A8];
