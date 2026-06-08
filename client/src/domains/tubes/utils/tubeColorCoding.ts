/**
 * Tube Color Coding
 *
 * LAB color space system for visually distinguishing tubes by donor, cell type, and lot.
 */

import { adaptTubeDataForColorSystem } from '@domains/tubes/types/tubeColorCodingTypes';
import { logger } from '@infra/logger';
import {
  generateOptimalColorPalette,
  getOptimalTextColor,
  rgbStringToLAB,
  labToRGBString,
} from '@shared/utils/labColorSpace';

import type { TubeData } from '@odysseus/shared-schemas';

interface ColorResult {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

/** Minimal color inputs shared by full tubes and the navigator's slim rack projection. */
interface TubeColorFields {
  cellType?: string;
  cellLine?: string;
  donor?: string;
  donorInternalId?: string;
  donorSourceId?: string;
  lotNumber?: string;
  cultureCondition?: string;
}

interface LotStyle {
  color: string;
  pattern:
    | 'solid'
    | 'stripe'
    | 'dot'
    | 'cross'
    | 'checkered'
    | 'circle'
    | 'double-stripe'
    | 'diamond';
  shape?:
    | 'square'
    | 'circle'
    | 'triangle'
    | 'diamond'
    | 'hexagon'
    | 'star'
    | 'plus'
    | 'cross-shape'
    | 'heart'
    | 'pentagon';
  size?: 'small' | 'medium' | 'large';
}

const donorColorPalette = generateOptimalColorPalette({
  count: 72,
  minDistance: 18,
  lightRange: [40, 75],
  chromaRange: [30, 55],
  seed: 12345,
});

interface CellLineCategory {
  name: string;
  color: string;
  patterns: string[];
}

export const cellLineCategories: CellLineCategory[] = [
  // Lab's commonly used cell lines (muted versions)
  {
    name: 'jurkat',
    color: '#A85A4A', // Muted terracotta red
    patterns: [
      'jurkat',
      'jur-kat',
      'jur kat',
      'jurkat t',
      'jurkat-t',
      // Clone annotations
      'jurkat e6-1',
      'jurkat e6.1',
      'jurkat-e6-1',
      'jurkat_e6-1',
    ],
  },
  {
    name: 'nalm6',
    color: '#4A9A8F', // Muted teal
    patterns: ['nalm6', 'nalm-6', 'nalm 6', 'nalm_6'],
  },
  {
    name: 'lncap',
    color: '#7B7FC4', // Muted periwinkle
    patterns: [
      'lncap',
      // Strain suffixes
      'lncap-fgc',
      'lncap fgc',
      'lncap_fgc',
      'lncap clone fgc',
    ],
  },
  {
    name: '22rv1',
    color: '#C9B86A', // Muted gold
    patterns: ['22rv1', '22 rv1', '22-rv1', '22_rv1'],
  },
  {
    name: 'skbr3',
    color: '#9A7AA8', // Muted lavender
    patterns: [
      'skbr3',
      'skbr-3',
      'sk-br3',
      'sk-br-3',
      'sk br 3',
      'sk br-3',
      'sk-br 3',
      'sk_br_3',
      'sk_br3',
    ],
  },
  {
    name: 'panc1',
    color: '#C9986A', // Muted sandy tan
    patterns: [
      // PANC-1 (pancreatic carcinoma - most common meaning)
      'panc-1',
      'panc1',
      'panc 1',
      'panc_1',
      // PAN-1 (if literally meant)
      'pan-1',
      'pan1',
      'pan 1',
      'pan_1',
    ],
  },
  {
    name: 'mcf7',
    color: '#3D5A73', // Muted slate blue
    patterns: [
      'mcf7',
      'mcf-7',
      'mcf 7',
      'mcf_7',
      'mcf-7 wt', // Subline tag
    ],
  },
  {
    name: 'a549',
    color: '#C47A65', // Muted coral
    patterns: [
      'a549',
      'a-549',
      'a 549',
      'a_549',
      'nci-a549', // NCI prefix
    ],
  },
  {
    name: 'h1299',
    color: '#4A6A6A', // Muted dark teal
    patterns: [
      'h1299',
      'h-1299',
      'h 1299',
      'h_1299',
      // NCI prefix variants
      'nci-h1299',
      'nci h1299',
      'nci_h1299',
    ],
  },

  // Additional common cell lines
  {
    name: 'hela',
    color: '#8B6B4A', // Muted brown
    patterns: ['hela', 'he-la', 'he la', 'he_la'],
  },
  {
    name: 'k562',
    color: '#B84A5A', // Muted crimson
    patterns: ['k562', 'k-562', 'k 562', 'k_562'],
  },
  {
    name: 'u937',
    color: '#5A8AAA', // Muted steel blue
    patterns: ['u937', 'u-937', 'u 937', 'u_937'],
  },
];

// Light theme blue for tubes with missing donor/cell line info
const UNKNOWN_FALLBACK_COLOR = '#b8d0e5';

const baseIndicatorColors = generateOptimalColorPalette({
  count: 16,
  minDistance: 20,
  lightRange: [25, 85],
  chromaRange: [20, 80],
  seed: 54321,
});

const enhancedPatterns: LotStyle['pattern'][] = [
  'solid',
  'stripe',
  'dot',
  'cross',
  'checkered',
  'circle',
  'double-stripe',
  'diamond',
];

const lotIndicatorStyles: LotStyle[] = [];

baseIndicatorColors.forEach(color => {
  enhancedPatterns.forEach(pattern => {
    lotIndicatorStyles.push({ color, pattern });
  });
});

const additionalStyles: LotStyle[] = [
  { color: '#000000', pattern: 'solid' },
  { color: '#FFFFFF', pattern: 'solid' },
  { color: '#FF0000', pattern: 'solid' },
  { color: '#00FF00', pattern: 'solid' },
  { color: '#0000FF', pattern: 'solid' },
  { color: '#FFFF00', pattern: 'solid' },
  { color: '#FF00FF', pattern: 'solid' },
  { color: '#00FFFF', pattern: 'solid' },
];

lotIndicatorStyles.push(...additionalStyles);

const conditionIndicatorColors = [
  '#FF0000', // Pure Red
  '#00AA00', // Green
  '#0066FF', // Blue
  '#FF8800', // Orange
  '#8800FF', // Purple
  '#00CCCC', // Cyan
  '#FFCC00', // Yellow
  '#FF0080', // Magenta
  '#666666', // Dark Gray
  '#CC6600', // Brown
  '#008800', // Dark Green
  '#000088', // Dark Blue
  '#880000', // Dark Red
  '#CC0088', // Dark Magenta
  '#006666', // Dark Cyan
  '#664400', // Olive Brown
];

const conditionIndicatorStyles: LotStyle[] = conditionIndicatorColors.map(color => ({
  color,
  pattern: 'solid',
}));

class ColorCache {
  private tubeColors = new Map<string, string>();
  private donorColors = new Map<string, string>();
  private accessOrder: string[] = [];
  private maxCacheSize = 1000;

  private evictLRU(): void {
    if (this.tubeColors.size <= this.maxCacheSize) return;

    const oldestKey = this.accessOrder.shift();
    if (oldestKey) {
      this.tubeColors.delete(oldestKey);
    }
  }

  private updateAccess(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  getTubeColor(signature: string): string | undefined {
    const color = this.tubeColors.get(signature);
    if (color) this.updateAccess(signature);
    return color;
  }

  setTubeColor(signature: string, color: string): void {
    this.evictLRU();
    this.tubeColors.set(signature, color);
    this.updateAccess(signature);
  }

  getDonorColor(donorId: string): string | undefined {
    return this.donorColors.get(donorId);
  }

  setDonorColor(donorId: string, color: string): void {
    this.donorColors.set(donorId, color);
  }
}

const colorCache = new ColorCache();

// FNV-1a hash function for good distribution and collision resistance
function hashStringToIndex(str: string, maxIndex: number): number {
  const FNV_OFFSET_BASIS = 0x811c9dc5;
  const FNV_PRIME = 0x01000193;

  let hash = FNV_OFFSET_BASIS;

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return Math.abs(hash) % maxIndex;
}

function getCellLineColor(cellType: string): string | null {
  if (!cellType) return null;
  const normalized = cellType.toLowerCase().trim();

  for (const category of cellLineCategories) {
    if (category.patterns.includes(normalized)) {
      return category.color;
    }

    for (const pattern of category.patterns) {
      if (normalized.includes(pattern)) {
        return category.color;
      }
    }
  }

  return null;
}

function getDonorIdentifier(tubeData: TubeColorFields): string {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback chain, empty string should trigger next option
  if (tubeData.donorInternalId || tubeData.donorSourceId) {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback chain, empty string should trigger next option
    return tubeData.donorInternalId || tubeData.donorSourceId || 'unknown';
  }

  // Fallback to legacy donor field
  if (!tubeData.donor) return 'unknown';

  try {
    const donorData = JSON.parse(tubeData.donor);
    return donorData.internal || donorData.source || 'unknown';
  } catch {
    return tubeData.donor || 'unknown';
  }
}

function createTubeSignature(tubeData: TubeColorFields): string {
  const donorId = getDonorIdentifier(tubeData);
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback chain, empty string should trigger next option
  const cellType = tubeData.cellType || tubeData.cellLine || '';
  const lotNumber = tubeData.lotNumber ?? '';
  const condition = tubeData.cultureCondition ?? '';

  return `${donorId}|${cellType}|${lotNumber}|${condition}`;
}

interface CellTypeCategory {
  name: string;
  brightness: number;
  patterns: string[];
}

const cellTypeCategories: CellTypeCategory[] = [
  // Primary cell types - base brightness (no offset)
  {
    name: 'pbmc',
    brightness: 0,
    patterns: ['pbmc', 'pbmcs', 'peripheral blood mononuclear cells'],
  },

  // T cell lineage - lighter shades
  {
    name: 't-cells',
    brightness: 25,
    patterns: [
      't cells',
      't cell',
      't-cells',
      't-cell',
      'tcells',
      'tcell',
      't-lymphocytes',
      't-lymphocyte',
      't lymphocytes',
      't lymphocyte',
      'cd3+',
      'cd3',
    ],
  },
  {
    name: 'cd4-t-cells',
    brightness: 20,
    patterns: ['cd4+', 'cd4'],
  },
  {
    name: 'cd8-t-cells',
    brightness: 30,
    patterns: ['cd8+', 'cd8'],
  },
  {
    name: 't-helper-regulatory',
    brightness: 15,
    patterns: ['th1', 'th2', 'th17', 'treg', 'regulatory t'],
  },

  // B cell lineage - medium-light shades
  {
    name: 'b-cells',
    brightness: 18,
    patterns: [
      'b cells',
      'b cell',
      'b-cells',
      'b-cell',
      'bcells',
      'bcell',
      'b-lymphocytes',
      'b-lymphocyte',
      'b lymphocytes',
      'b lymphocyte',
      'cd19+',
      'cd19',
      'cd20+',
      'cd20',
    ],
  },

  // NK cells - medium shades
  {
    name: 'nk-cells',
    brightness: 10,
    patterns: [
      'nk cells',
      'nk cell',
      'nk-cells',
      'nk-cell',
      'nk',
      'natural killer',
      'cd56+',
      'cd56',
    ],
  },

  // Monocyte/Macrophage lineage - darker shades
  {
    name: 'monocytes',
    brightness: -15,
    patterns: ['monocytes', 'monocyte', 'cd14+', 'cd14'],
  },
  {
    name: 'cd16-monocytes',
    brightness: -10,
    patterns: ['cd16+', 'cd16'],
  },
  {
    name: 'macrophages',
    brightness: -20,
    patterns: ['macrophages', 'macrophage'],
  },
  {
    name: 'm1-macrophages',
    brightness: -25,
    patterns: ['m1'],
  },
  {
    name: 'm2-macrophages',
    brightness: -18,
    patterns: ['m2'],
  },

  // Dendritic cells - medium-dark
  {
    name: 'dendritic-cells',
    brightness: -12,
    patterns: ['dendritic cells', 'dc', 'dendritic'],
  },

  // Stem cells - very light
  {
    name: 'mesenchymal-stem-cells',
    brightness: 35,
    patterns: ['msc', 'mesenchymal', 'stem cells'],
  },
  {
    name: 'hematopoietic-stem-cells',
    brightness: 40,
    patterns: ['hsc'],
  },

  // Cell lines - distinctive offsets (fallback if not caught by cell line detection)
  {
    name: 'hela-fallback',
    brightness: -8,
    patterns: ['hela'],
  },
  {
    name: 'jurkat-fallback',
    brightness: 22,
    patterns: ['jurkat'],
  },
  {
    name: 'k562-fallback',
    brightness: -5,
    patterns: ['k562'],
  },
  {
    name: 'u937-fallback',
    brightness: -18,
    patterns: ['u937'],
  },

  // Cell therapy specific - CAR-T variants
  {
    name: 'car-t',
    brightness: 25,
    patterns: [
      // Standard forms
      'car-t',
      'car-t cells',
      'car-t cell',
      'car-ts',
      'cart',
      'cart cells',
      'cart cell',
      'carts',
      'car t',
      'car t cells',
      'car t cell',
      // CAR+ variants
      'car+',
      'car+ t cells',
      'car+ t cell',
      'car positive',
      'car positive t cells',
      'car positive t cell',
      'car-positive',
      'car-positive t cells',
      'car-positive t cell',
      // Transduced
      'transduced',
      'transduced t cells',
      'transduced t cell',
      'chimeric antigen receptor',
    ],
  },

  // Cell therapy specific - Untransduced variants
  {
    name: 'untransduced',
    brightness: 12,
    patterns: [
      // Standard forms
      'untransduced',
      'untransduced t cells',
      'untransduced t cell',
      'utd',
      'utd t cells',
      'utd t cell',
      // UTD "x" patterns (extra confirmed negative)
      'utx',
      'utxd',
      'utdx',
      'ut-dx',
      'ut_dx',
      'utd + x',
      'utd +x',
      'utd+x',
      'utd-x',
      'utd_x',
      // Hyphenated/spaced variants
      'un-transduced',
      'un-transduced t cells',
      'non-transduced',
      'non-transduced t cells',
      'nontransduced',
      'nontransduced t cells',
      'non transduced',
      'non transduced t cells',
      // Other synonyms
      'unmodified',
      'unmodified t cells',
      'unmodified t cell',
      'naive t cells',
      'naive t cell',
      'naïve t cells',
      'naïve t cell',
      'fresh t cells',
      'fresh t cell',
      'mock',
      'mock transduced',
    ],
  },

  // Cell therapy specific - TILs
  {
    name: 'tils',
    brightness: 8,
    patterns: ['tils', 'til', 'tumor-infiltrating lymphocytes', 'tumor infiltrating lymphocytes'],
  },
];

function getCellTypeBrightnessOffset(cellType: string): number {
  if (!cellType) return 0;

  const normalized = cellType.toLowerCase().trim();

  for (const category of cellTypeCategories) {
    if (category.patterns.includes(normalized)) {
      return category.brightness;
    }

    for (const pattern of category.patterns) {
      if (normalized.includes(pattern) || pattern.includes(normalized)) {
        return category.brightness;
      }
    }
  }

  return 0;
}

function adjustColorBrightness(color: string, percent: number): string {
  try {
    const lab = rgbStringToLAB(color);
    lab.L = Math.max(0, Math.min(100, lab.L + percent));
    return labToRGBString(lab);
  } catch (error) {
    logger.warn('Color adjustment failed, using original color', { color });
    return color;
  }
}

export function getTubeColorFromFields(fields: TubeColorFields): ColorResult {
  const signature = createTubeSignature(fields);

  const cachedColor = colorCache.getTubeColor(signature);
  if (cachedColor) {
    return {
      backgroundColor: cachedColor,
      borderColor: adjustColorBrightness(cachedColor, -20),
      textColor: getOptimalTextColor(cachedColor),
    };
  }

  let finalColor: string;
  const cellType = fields.cellType ?? '';

  const cellLineColor = getCellLineColor(cellType);
  if (cellLineColor) {
    finalColor = cellLineColor;
  } else {
    const donorId = getDonorIdentifier(fields);

    if (donorId !== 'unknown') {
      let baseColor = colorCache.getDonorColor(donorId);
      if (!baseColor) {
        const colorIndex = hashStringToIndex(donorId, donorColorPalette.length);
        baseColor = donorColorPalette[colorIndex];
        colorCache.setDonorColor(donorId, baseColor);
      }

      const brightnessOffset = getCellTypeBrightnessOffset(cellType);
      finalColor = adjustColorBrightness(baseColor, brightnessOffset);
    } else {
      const brightnessOffset = getCellTypeBrightnessOffset(cellType);
      finalColor = adjustColorBrightness(UNKNOWN_FALLBACK_COLOR, brightnessOffset);
    }
  }

  colorCache.setTubeColor(signature, finalColor);

  return {
    backgroundColor: finalColor,
    borderColor: adjustColorBrightness(finalColor, -20),
    textColor: getOptimalTextColor(finalColor),
  };
}

export function getTubeColor(tubeData: TubeData): ColorResult {
  return getTubeColorFromFields(adaptTubeDataForColorSystem(tubeData));
}

export function getLotStyleForBox(lotNumber: string | undefined): LotStyle | null {
  if (!lotNumber || lotNumber.trim() === '') return null;

  const lot = lotNumber.trim();
  const styleIndex = hashStringToIndex(lot, lotIndicatorStyles.length);
  return lotIndicatorStyles[styleIndex];
}

export function getConditionStyleForBox(condition: string | undefined): LotStyle | null {
  if (!condition || condition.trim() === '') return null;

  const cond = condition.trim();
  const styleIndex = hashStringToIndex(cond, conditionIndicatorStyles.length);
  return conditionIndicatorStyles[styleIndex];
}

/** Grid cells only have room for trailing digits — users identify donors by the last few characters. */
export function formatIdForGrid(id: string, maxLength = 5): string {
  if (!id || id.trim() === '') return '';

  const cleanId = id.trim();

  if (cleanId.length > maxLength) {
    return `...${cleanId.substring(cleanId.length - maxLength)}`;
  }

  return cleanId;
}

/** Supports both new separate ID fields and legacy JSON donor format for backwards compatibility. */
export function parseDonorInfo(tubeData: TubeData): { internal: string; source: string } {
  const adaptedData = adaptTubeDataForColorSystem(tubeData);

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check if either donor field is present
  if (adaptedData.donorInternalId || adaptedData.donorSourceId) {
    return {
      internal: formatIdForGrid(adaptedData.donorInternalId ?? '', 8),
      source: formatIdForGrid(adaptedData.donorSourceId ?? ''),
    };
  }

  // Fallback to legacy donor field
  if (!adaptedData.donor) return { internal: '', source: '' };

  try {
    const donorData = JSON.parse(adaptedData.donor);
    const internal = donorData.internal || '';
    const source = donorData.source || '';

    return {
      internal: formatIdForGrid(internal, 8),
      source: formatIdForGrid(source),
    };
  } catch (e) {
    // Legacy format or invalid JSON
    const rawDonor = adaptedData.donor || '';
    if (rawDonor.includes('{"internal":') || rawDonor.includes('"source":')) {
      return { internal: '', source: '' }; // Malformed JSON with empty values
    }
    // True legacy format - treat as internal ID
    return {
      internal: formatIdForGrid(rawDonor, 8),
      source: '',
    };
  }
}
