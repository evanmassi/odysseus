import { splitStepSettings } from './stepSettings';

describe('splitStepSettings', () => {
  it('lifts a spin’s speed, time and temperature onto one line', () => {
    expect(splitStepSettings('at 300 ×g, 5 min, 4 °C.')).toEqual({
      text: '',
      settings: [
        { label: '300 × g', kind: 'g-force' },
        { label: '5 min', kind: 'time' },
        { label: '4 °C', kind: 'temperature' },
      ],
    });
  });

  it('keeps the rest of the sentence readable', () => {
    expect(splitStepSettings('the vial in a 37 °C water bath for 2 mins.')).toEqual({
      text: 'the vial in a water bath.',
      settings: [
        { label: '2 min', kind: 'time' },
        { label: '37 °C', kind: 'temperature' },
      ],
    });
  });

  it('leaves the sentence alone when two times or temperatures would lose their place', () => {
    const text = '100 µL substrate, shake 2 min, then incubate 10 min at RT.';
    expect(splitStepSettings(text)).toEqual({ text, settings: [] });
  });

  it('leaves volumes and concentrations in the text', () => {
    expect(splitStepSettings('50 µL of 10 µg/mL antibody.')).toEqual({
      text: '50 µL of 10 µg/mL antibody.',
      settings: [],
    });
  });
});
