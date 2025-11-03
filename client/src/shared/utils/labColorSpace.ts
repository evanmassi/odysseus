// LAB color space utilities for perceptually uniform color generation
// This ensures equal visual distances between colors for optimal distinction

export interface LABColor {
  L: number; // Lightness 0-100
  A: number; // Green-Red axis -128 to 127
  B: number; // Blue-Yellow axis -128 to 127
}

export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

// Convert RGB to XYZ color space (intermediate step for LAB)
function rgbToXYZ(rgb: RGBColor): { x: number; y: number; z: number } {
  let { r, g, b } = rgb;
  
  // Normalize RGB values
  r /= 255;
  g /= 255;
  b /= 255;
  
  // Apply gamma correction
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  // Convert to XYZ using sRGB matrix
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  
  return { x: x * 100, y: y * 100, z: z * 100 };
}

// Convert XYZ to LAB color space
function xyzToLAB(xyz: { x: number; y: number; z: number }): LABColor {
  // D65 illuminant reference values
  const xn = 95.047;
  const yn = 100.000;
  const zn = 108.883;
  
  let { x, y, z } = xyz;
  x /= xn;
  y /= yn;
  z /= zn;
  
  // Apply LAB transformation
  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
  
  const L = 116 * fy - 16;
  const A = 500 * (fx - fy);
  const B = 200 * (fy - fz);
  
  return { L, A, B };
}

// Convert LAB to XYZ color space
function labToXYZ(lab: LABColor): { x: number; y: number; z: number } {
  const { L, A, B } = lab;
  
  // D65 illuminant reference values
  const xn = 95.047;
  const yn = 100.000;
  const zn = 108.883;
  
  const fy = (L + 16) / 116;
  const fx = A / 500 + fy;
  const fz = fy - B / 200;
  
  const x = fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16/116) / 7.787;
  const y = fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16/116) / 7.787;
  const z = fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16/116) / 7.787;
  
  return {
    x: x * xn,
    y: y * yn,
    z: z * zn
  };
}

// Convert XYZ to RGB color space
function xyzToRGB(xyz: { x: number; y: number; z: number }): RGBColor {
  let { x, y, z } = xyz;
  
  // Normalize XYZ values
  x /= 100;
  y /= 100;
  z /= 100;
  
  // Convert to RGB using sRGB matrix (inverse)
  let r = x *  3.2404542 + y * -1.5371385 + z * -0.4985314;
  let g = x * -0.9692660 + y *  1.8760108 + z *  0.0415560;
  let b = x *  0.0556434 + y * -0.2040259 + z *  1.0572252;
  
  // Apply inverse gamma correction
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1/2.4) - 0.055 : 12.92 * b;
  
  // Clamp to valid RGB range
  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b = Math.max(0, Math.min(1, b));
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

// Convert RGB to LAB (full pipeline)
export function rgbToLAB(rgb: RGBColor): LABColor {
  const xyz = rgbToXYZ(rgb);
  return xyzToLAB(xyz);
}

// Convert LAB to RGB (full pipeline)
export function labToRGB(lab: LABColor): RGBColor {
  const xyz = labToXYZ(lab);
  return xyzToRGB(xyz);
}

// Calculate Delta E (CIE76) - perceptual color difference
export function calculateDeltaE(color1: LABColor, color2: LABColor): number {
  const deltaL = color1.L - color2.L;
  const deltaA = color1.A - color2.A;
  const deltaB = color1.B - color2.B;
  
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

// Convert RGB to CSS hex string
export function rgbToHex(rgb: RGBColor): string {
  const { r, g, b } = rgb;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Convert hex to RGB
export function hexToRGB(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error('Invalid hex color');
  
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

// Seeded random number generator for deterministic color generation
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 0x100000000;
    return state / 0x100000000;
  };
}

// Generate deterministic perceptually uniform color palette
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
  
  // Generate colors with maximum perceptual distance
  for (let i = 0; i < count; i++) {
    let bestColor: LABColor | null = null;
    let bestMinDistance = 0;
    
    for (let attempt = 0; attempt < attempts; attempt++) {
      // Generate deterministic random color in LAB space
      const L = lightRange[0] + random() * (lightRange[1] - lightRange[0]);
      const angle = random() * 2 * Math.PI;
      const chroma = chromaRange[0] + random() * (chromaRange[1] - chromaRange[0]);
      
      const A = Math.cos(angle) * chroma;
      const B = Math.sin(angle) * chroma;
      
      const candidate: LABColor = { L, A, B };
      
      // Check if this color can be represented in RGB
      const rgb = labToRGB(candidate);
      if (rgb.r < 0 || rgb.r > 255 || rgb.g < 0 || rgb.g > 255 || rgb.b < 0 || rgb.b > 255) {
        continue;
      }
      
      // Calculate minimum distance to existing colors
      let minDistanceToExisting = Infinity;
      for (const existing of colors) {
        const distance = calculateDeltaE(candidate, existing);
        minDistanceToExisting = Math.min(minDistanceToExisting, distance);
      }
      
      // Keep the candidate with the maximum minimum distance
      if (minDistanceToExisting > bestMinDistance) {
        bestMinDistance = minDistanceToExisting;
        bestColor = candidate;
      }
      
      // If we found a good enough color, use it
      if (bestMinDistance >= minDistance) {
        break;
      }
    }
    
    if (bestColor) {
      colors.push(bestColor);
    }
  }
  
  // Convert to hex strings
  return colors.map(lab => rgbToHex(labToRGB(lab)));
}

// Calculate luminance for contrast ratio
export function getLuminance(rgb: RGBColor): number {
  const { r, g, b } = rgb;
  
  const sR = r / 255;
  const sG = g / 255;
  const sB = b / 255;
  
  const rL = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
  const gL = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
  const bL = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

// Calculate contrast ratio between two colors
export function getContrastRatio(color1: RGBColor, color2: RGBColor): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Convert RGB string (hex or rgb()) to LAB color space
export function rgbStringToLAB(colorString: string): LABColor {
  const rgb = hexToRGB(colorString);
  return rgbToLAB(rgb);
}

// Convert LAB color to RGB hex string
export function labToRGBString(lab: LABColor): string {
  const rgb = labToRGB(lab);
  return rgbToHex(rgb);
}

// Find optimal text color for maximum contrast
export function getOptimalTextColor(backgroundColor: string): string {
  const bgRGB = hexToRGB(backgroundColor);
  const whiteRGB: RGBColor = { r: 255, g: 255, b: 255 };
  const blackRGB: RGBColor = { r: 0, g: 0, b: 0 };
  
  const whiteContrast = getContrastRatio(bgRGB, whiteRGB);
  const blackContrast = getContrastRatio(bgRGB, blackRGB);
  
  return whiteContrast > blackContrast ? '#ffffff' : '#000000';
}
