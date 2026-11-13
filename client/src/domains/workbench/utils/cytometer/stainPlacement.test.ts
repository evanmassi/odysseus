import { BUILT_IN_CATALOG, dyeCatalog } from '../dyes/dyeCatalog';

import { BUILT_IN_INSTRUMENTS } from './instrumentCatalog';
import { bestDetector, misplacementText } from './stainPlacement';

const [IQUE, A8] = BUILT_IN_INSTRUMENTS;

const bestOn = (instrument: typeof IQUE, fluorochrome: string) => {
  const dye = BUILT_IN_CATALOG.find(fluorochrome);
  return dye && bestDetector(instrument, dye)?.detector.id;
};

describe('bestDetector', () => {
  it('puts each dye on the iQue detector its laser and filter suit', () => {
    const placements = [
      'BV421',
      'BV605',
      'BV785',
      'FITC',
      'PE',
      'PE-Cy7',
      'AF647',
      'Zombie NIR',
    ].map(dye => bestOn(IQUE, dye));
    expect(placements).toEqual(['VL1', 'VL4', 'VL6', 'BL1', 'BL2', 'BL5', 'RL1', 'RL2']);
  });

  it('picks the A8 peak detector, preferring yellow-green for PE', () => {
    expect(['BV421', 'APC', 'PE'].map(dye => bestOn(A8, dye))).toEqual(['V1', 'R1', 'YG1']);
  });
});

describe('misplacementText', () => {
  it('says when a dye sits on a laser that does not excite it', () => {
    expect(misplacementText(IQUE, BUILT_IN_CATALOG, 'BV785', 'BL3')).toEqual({
      text: 'BV785 isn’t excited by the blue laser; it works best on VL6 (780/60).',
      detectorId: 'VL6',
      filter: '780/60',
    });
  });

  it('says when the right laser has a better filter for it', () => {
    expect(misplacementText(IQUE, BUILT_IN_CATALOG, 'BV605', 'VL5')?.text).toBe(
      'BV605 peaks near 601 nm; it works best on VL4 (615/24).'
    );
  });

  it('stays quiet when the stain is where it works best or the dye is unknown', () => {
    expect(misplacementText(IQUE, BUILT_IN_CATALOG, 'BV421', 'VL1')).toBeUndefined();
    expect(misplacementText(IQUE, BUILT_IN_CATALOG, 'Mystery Fluor 9', 'VL1')).toBeUndefined();
  });

  it('checks a dye the file added the same way', () => {
    const catalog = dyeCatalog([{ name: 'Qx Fluor 512', lasers: [488], peak: 512 }]);
    expect(misplacementText(IQUE, catalog, 'Qx Fluor 512', 'RL1')?.detectorId).toBe('BL1');
  });
});
