/**
 * LAB Color Space Utilities
 *
 * Perceptually uniform color generation using CIE LAB for equal visual distance between colors.
 */

export interface LABColor {
  L: number;
  A: number;
  B: number;
}

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// D65 illuminant reference values (standard daylight)
const D65_XN = 95.047;
const D65_YN = 100.0;
const D65_ZN = 108.883;

function rgbToXYZ(rgb: RGBColor): { x: number; y: number; z: number } {
  let { r, g, b } = rgb;

  r /= 255;
  g /= 255;
  b /= 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

  return { x: x * 100, y: y * 100, z: z * 100 };
}

function xyzToLAB(xyz: { x: number; y: number; z: number }): LABColor {
  let { x, y, z } = xyz;
  x /= D65_XN;
  y /= D65_YN;
  z /= D65_ZN;

  const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  const L = 116 * fy - 16;
  const A = 500 * (fx - fy);
  const B = 200 * (fy - fz);

  return { L, A, B };
}

function labToXYZ(lab: LABColor): { x: number; y: number; z: number } {
  const { L, A, B } = lab;

  const fy = (L + 16) / 116;
  const fx = A / 500 + fy;
  const fz = fy - B / 200;

  const x = fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16 / 116) / 7.787;
  const y = fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16 / 116) / 7.787;
  const z = fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16 / 116) / 7.787;

  return {
    x: x * D65_XN,
    y: y * D65_YN,
    z: z * D65_ZN,
  };
}

function xyzToRGB(xyz: { x: number; y: number; z: number }): RGBColor {
  let { x, y, z } = xyz;

  x /= 100;
  y /= 100;
  z /= 100;

  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  let g = x * -0.969266 + y * 1.8760108 + z * 0.041556;
  let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b = Math.max(0, Math.min(1, b));

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function rgbToLAB(rgb: RGBColor): LABColor {
  const xyz = rgbToXYZ(rgb);
  return xyzToLAB(xyz);
}

function labToRGB(lab: LABColor): RGBColor {
  const xyz = labToXYZ(lab);
  return xyzToRGB(xyz);
}

/** Delta E (CIE76) perceptual color difference. */
function calculateDeltaE(color1: LABColor, color2: LABColor): number {
  const deltaL = color1.L - color2.L;
  const deltaA = color1.A - color2.A;
  const deltaB = color1.B - color2.B;

  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

function rgbToHex(rgb: RGBColor): string {
  const { r, g, b } = rgb;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRGB(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error('Invalid hex color');

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Deterministic PRNG for reproducible palette generation
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 0x100000000;
    return state / 0x100000000;
  };
}

export function generateOptimalColorPalette(options: {
  count: number;
  minDistance: number;
  lightRange: [number, number];
  chromaRange: [number, number];
  attempts?: number;
  seed?: number;
}): string[] {
  const { count, minDistance, lightRange, chromaRange, attempts = 1000, seed = 42 } = options;
  const colors: LABColor[] = [];
  const random = seededRandom(seed);

  for (let i = 0; i < count; i++) {
    let bestColor: LABColor | null = null;
    let bestMinDistance = 0;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const L = lightRange[0] + random() * (lightRange[1] - lightRange[0]);
      const angle = random() * 2 * Math.PI;
      const chroma = chromaRange[0] + random() * (chromaRange[1] - chromaRange[0]);

      const A = Math.cos(angle) * chroma;
      const B = Math.sin(angle) * chroma;

      const candidate: LABColor = { L, A, B };

      let minDistanceToExisting = Infinity;
      for (const existing of colors) {
        const distance = calculateDeltaE(candidate, existing);
        minDistanceToExisting = Math.min(minDistanceToExisting, distance);
      }

      if (minDistanceToExisting > bestMinDistance) {
        bestMinDistance = minDistanceToExisting;
        bestColor = candidate;
      }

      if (bestMinDistance >= minDistance) {
        break;
      }
    }

    if (bestColor) {
      colors.push(bestColor);
    }
  }

  return colors.map(lab => rgbToHex(labToRGB(lab)));
}

// WCAG 2.0 relative luminance formula (uses simplified 0.03928 threshold)
function getLuminance(rgb: RGBColor): number {
  const { r, g, b } = rgb;

  const sR = r / 255;
  const sG = g / 255;
  const sB = b / 255;

  const rL = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
  const gL = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
  const bL = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);

  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

function getContrastRatio(color1: RGBColor, color2: RGBColor): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function rgbStringToLAB(colorString: string): LABColor {
  const rgb = hexToRGB(colorString);
  return rgbToLAB(rgb);
}

export function labToRGBString(lab: LABColor): string {
  const rgb = labToRGB(lab);
  return rgbToHex(rgb);
}

export function getOptimalTextColor(backgroundColor: string): string {
  const bgRGB = hexToRGB(backgroundColor);
  const whiteRGB: RGBColor = { r: 255, g: 255, b: 255 };
  const blackRGB: RGBColor = { r: 0, g: 0, b: 0 };

  const whiteContrast = getContrastRatio(bgRGB, whiteRGB);
  const blackContrast = getContrastRatio(bgRGB, blackRGB);

  return whiteContrast > blackContrast ? '#ffffff' : '#000000';
}
