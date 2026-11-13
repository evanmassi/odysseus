import { BUILT_IN_INSTRUMENTS } from './instrumentCatalog';
import { bestDetector, dyeFacts, misplacementText } from './stainPlacement';

const [IQUE, A8] = BUILT_IN_INSTRUMENTS;

const bestOn = (instrument: typeof IQUE, fluorochrome: string) => {
  const facts = dyeFacts(fluorochrome);
  return facts && bestDetector(instrument, facts)?.detector.id;
};

describe('dyeFacts', () => {
  it('reads a dye’s laser from the app’s list and its emission peak from FPbase', () => {
    expect(dyeFacts('Brilliant Violet 421')).toEqual({
      name: 'BV421',
      lasers: [405],
      emission: 422,
    });
    expect(dyeFacts('Zombie NIR')).toMatchObject({ lasers: [640], emission: 746 });
    expect(dyeFacts('PE-TxRed')).toMatchObject({ name: 'PE-Texas Red', emission: 615 });
  });

  it('lets the PE family use the yellow-green or blue laser, yellow-green first', () => {
    expect(dyeFacts('PE')?.lasers).toEqual([561, 488]);
  });

  it('knows nothing about non-fluorescent conjugates', () => {
    expect(dyeFacts('Biotin')).toBeUndefined();
  });
});

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
    expect(misplacementText(IQUE, 'BV785', 'BL3')).toEqual({
      text: 'BV785 isn’t excited by the blue laser; it works best on VL6 (780/60).',
      detectorId: 'VL6',
      filter: '780/60',
    });
  });

  it('says when the right laser has a better filter for it', () => {
    expect(misplacementText(IQUE, 'BV605', 'VL5')?.text).toBe(
      'BV605 peaks near 601 nm; it works best on VL4 (615/24).'
    );
  });

  it('stays quiet when the stain is where it works best or the dye is unknown', () => {
    expect(misplacementText(IQUE, 'BV421', 'VL1')).toBeUndefined();
    expect(misplacementText(IQUE, 'Mystery Fluor 9', 'VL1')).toBeUndefined();
  });
});
