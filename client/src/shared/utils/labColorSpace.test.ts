/**
 * LAB Color Space Utilities Tests
 *
 * Covers the public surface: optimal text color, deterministic palette generation, and color round-trips.
 */
import { describe, it, expect } from 'vitest';

import {
  generateOptimalColorPalette,
  getOptimalTextColor,
  labToRGBString,
  rgbStringToLAB,
} from './labColorSpace';

const HEX = /^#[0-9a-f]{6}$/;

describe('getOptimalTextColor', () => {
  it('picks white text on dark backgrounds', () => {
    expect(getOptimalTextColor('#000000')).toBe('#ffffff');
    expect(getOptimalTextColor('#0000ff')).toBe('#ffffff');
  });

  it('picks black text on light backgrounds', () => {
    expect(getOptimalTextColor('#ffffff')).toBe('#000000');
    expect(getOptimalTextColor('#ffff00')).toBe('#000000');
  });
});

describe('generateOptimalColorPalette', () => {
  const options = {
    count: 5,
    minDistance: 10,
    lightRange: [40, 80] as [number, number],
    chromaRange: [20, 60] as [number, number],
  };

  it('returns the requested number of valid hex colors', () => {
    const palette = generateOptimalColorPalette(options);
    expect(palette).toHaveLength(5);
    palette.forEach(color => expect(color).toMatch(HEX));
  });

  it('is deterministic for the same options', () => {
    expect(generateOptimalColorPalette(options)).toEqual(generateOptimalColorPalette(options));
  });
});

describe('rgbStringToLAB / labToRGBString', () => {
  it('round-trips gamut extremes exactly', () => {
    expect(labToRGBString(rgbStringToLAB('#000000'))).toBe('#000000');
    expect(labToRGBString(rgbStringToLAB('#ffffff'))).toBe('#ffffff');
  });

  it('produces a valid hex for a mid-gamut color', () => {
    expect(labToRGBString(rgbStringToLAB('#3b82f6'))).toMatch(HEX);
  });
});
