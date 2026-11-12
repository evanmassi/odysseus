import { filterCenter, wavelengthColor } from './wavelengthColor';

const hueOf = (color: string) => Number(/hsl\((\d+)/.exec(color)?.[1]);
const lightnessOf = (color: string) => Number(/(\d+)%\)$/.exec(color)?.[1]);

describe('wavelengthColor', () => {
  it('runs violet to blue to green to red across the visible range', () => {
    const hues = [405, 488, 530, 575, 660].map(nm => hueOf(wavelengthColor(nm)));
    expect(hues).toEqual([...hues].sort((a, b) => b - a));
  });

  it('darkens reds past 700 nm so far-red dyes stay apart', () => {
    expect(lightnessOf(wavelengthColor(780))).toBeLessThan(lightnessOf(wavelengthColor(700)));
    expect(lightnessOf(wavelengthColor(845))).toBeLessThan(lightnessOf(wavelengthColor(780)));
  });

  it('gives UV a pale lavender', () => {
    expect(wavelengthColor(349)).toBe('hsl(268 40% 74%)');
  });
});

describe('filterCenter', () => {
  it('reads the center of a band-pass filter', () => {
    expect(filterCenter('530/30')).toBe(530);
  });
});
