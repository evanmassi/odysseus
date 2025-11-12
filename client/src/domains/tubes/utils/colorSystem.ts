// Color system for tube identification using LAB color space
import { adaptTubeDataForColorSystem } from '@shared/types/colorSystemTypes';
import { 
  generateOptimalColorPalette, 
  getOptimalTextColor,
  rgbStringToLAB,
  labToRGBString
} from '@shared/utils/labColorSpace';

import type { ColorSystemTubeData} from '@shared/types/colorSystemTypes';


interface ColorResult {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

interface LotStyle {
  color: string;
  pattern: 'solid' | 'stripe' | 'dot' | 'cross' | 'checkered' | 'circle' | 'double-stripe' | 'diamond';
  shape?: 'square' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star' | 'plus' | 'cross-shape' | 'heart' | 'pentagon';
  size?: 'small' | 'medium' | 'large';
}

// Enhanced donor color palette - LAB color space optimized for maximum visual distinction
const donorColorPalette = generateOptimalColorPalette({
  count: 96,
  minDistance: 12, // ΔE units for clear visual distinction (reduced for larger palette)
  lightRange: [55, 85], // Lighter colors for better black text readability
  chromaRange: [25, 50], // Vivid but not overwhelming
  seed: 12345 // Deterministic seed for consistent colors across sessions
});

// Enhanced lot number indicators - LAB color space optimized with extended patterns
const baseIndicatorColors = generateOptimalColorPalette({
  count: 16,
  minDistance: 20, // Higher threshold for corner indicators
  lightRange: [25, 85], // Full range for maximum distinction
  chromaRange: [20, 80], // High saturation for visibility
  seed: 54321 // Different seed for lot indicators
});

// Enhanced pattern system with more variations
const enhancedPatterns: LotStyle['pattern'][] = [
  'solid', 'stripe', 'dot', 'cross', 'checkered', 'circle', 'double-stripe', 'diamond'
];

// Generate comprehensive lot indicator styles (16 colors × 8 patterns = 128 combinations)
const lotIndicatorStyles: LotStyle[] = [];

baseIndicatorColors.forEach(color => {
  enhancedPatterns.forEach(pattern => {
    lotIndicatorStyles.push({ color, pattern });
  });
});

// Add additional high-contrast combinations for edge cases
const additionalStyles: LotStyle[] = [
  { color: '#000000', pattern: 'solid' },
  { color: '#FFFFFF', pattern: 'solid' }, 
  { color: '#FF0000', pattern: 'solid' },
  { color: '#00FF00', pattern: 'solid' },
  { color: '#0000FF', pattern: 'solid' },
  { color: '#FFFF00', pattern: 'solid' },
  { color: '#FF00FF', pattern: 'solid' },
  { color: '#00FFFF', pattern: 'solid' }
];

lotIndicatorStyles.push(...additionalStyles);

// Simplified culture condition indicators - highly distinct solid colors for small triangular indicators
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
  '#664400'  // Olive Brown
];

// Generate condition indicator styles - solid colors only for clarity
const conditionIndicatorStyles: LotStyle[] = conditionIndicatorColors.map(color => ({
  color,
  pattern: 'solid'
}));

// Enhanced cache system with LRU eviction
class EnhancedColorCache {
  private tubeColors = new Map<string, string>();
  private donorColors = new Map<string, string>();
  private boxLotAssignments = new Map<string, Map<string, number>>();
  private boxConditionAssignments = new Map<string, Map<string, number>>();
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
  
  invalidateTubeColor(signature: string): void {
    this.tubeColors.delete(signature);
    const index = this.accessOrder.indexOf(signature);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
  
  getDonorColor(donorId: string): string | undefined {
    return this.donorColors.get(donorId);
  }
  
  setDonorColor(donorId: string, color: string): void {
    this.donorColors.set(donorId, color);
  }
  
  getBoxLotAssignments(boxKey: string): Map<string, number> {
    if (!this.boxLotAssignments.has(boxKey)) {
      this.boxLotAssignments.set(boxKey, new Map());
    }
    return this.boxLotAssignments.get(boxKey)!;
  }
  
  getBoxConditionAssignments(boxKey: string): Map<string, number> {
    if (!this.boxConditionAssignments.has(boxKey)) {
      this.boxConditionAssignments.set(boxKey, new Map());
    }
    return this.boxConditionAssignments.get(boxKey)!;
  }
}

// Global cache instance
const enhancedCache = new EnhancedColorCache();

// Global cache instance for direct use
const globalCache = enhancedCache;

// FNV-1a hash function for superior distribution and collision resistance
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

// Get donor identifier from tube data
function getDonorIdentifier(tubeData: ColorSystemTubeData): string {
  // Check new fields first
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
  } catch (e) {
    return tubeData.donor || 'unknown';
  }
}

// Create unique signature for a tube
function createTubeSignature(tubeData: ColorSystemTubeData): string {
  const donorId = getDonorIdentifier(tubeData);
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback chain, empty string should trigger next option
  const cellType = tubeData.cellType || tubeData.cellLine || '';
  const lotNumber = tubeData.lotNumber ?? '';
  const condition = tubeData.cultureCondition ?? '';

  return `${donorId}|${cellType}|${lotNumber}|${condition}`;
}

// Systematic cell type brightness mapping for predictable color families
const cellTypeBrightnessMap = new Map<string, number>([
  // Primary cell types - base brightness (no offset)
  ['pbmc', 0], ['pbmcs', 0], ['peripheral blood mononuclear cells', 0],
  
  // T cell lineage - lighter shades
  ['t cells', 25], ['t cell', 25], ['cd3+', 25], ['cd4+', 20], ['cd8+', 30],
  ['th1', 15], ['th2', 15], ['th17', 15], ['treg', 15], ['regulatory t', 15],
  
  // B cell lineage - medium-light shades  
  ['b cells', 18], ['b cell', 18], ['cd19+', 18], ['cd20+', 18],
  
  // NK cells - medium shades
  ['nk cells', 10], ['nk cell', 10], ['natural killer', 10], ['cd56+', 10],
  
  // Monocyte/Macrophage lineage - darker shades
  ['monocytes', -15], ['monocyte', -15], ['cd14+', -15], ['cd16+', -10],
  ['macrophages', -20], ['macrophage', -20], ['m1', -25], ['m2', -18],
  
  // Dendritic cells - medium-dark
  ['dendritic cells', -12], ['dc', -12], ['dendritic', -12],
  
  // Stem cells - very light
  ['msc', 35], ['mesenchymal', 35], ['stem cells', 35], ['hsc', 40],
  
  // Cell lines - distinctive offsets
  ['hela', -8], ['jurkat', 22], ['k562', -5], ['u937', -18]
]);

function getCellTypeBrightnessOffset(cellType: string): number {
  if (!cellType) return 0;
  
  const normalized = cellType.toLowerCase().trim();
  
  // Check exact matches first
  if (cellTypeBrightnessMap.has(normalized)) {
    return cellTypeBrightnessMap.get(normalized)!;
  }
  
  // Check partial matches
  for (const [key, offset] of cellTypeBrightnessMap) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return offset;
    }
  }
  
  // Unknown cell types get neutral offset
  return 0;
}

// LAB-based brightness adjustment for perceptually uniform changes
function adjustColorBrightness(color: string, percent: number): string {
  try {
    // Convert to LAB color space
    const lab = rgbStringToLAB(color);
    
    // Adjust lightness in LAB space for perceptually uniform brightness change
    lab.L = Math.max(0, Math.min(100, lab.L + percent));
    
    // Convert back to RGB string
    return labToRGBString(lab);
  } catch (error) {
    // Fallback to original color if conversion fails
    // eslint-disable-next-line no-console -- Warning logging for production monitoring
    console.warn('Color adjustment failed, using original color:', color);
    return color;
  }
}



// Enhanced main function to get tube colors
export function getTubeColor(tubeData: any): ColorResult {
  // Adapt incoming data to color system format
  const adaptedData = adaptTubeDataForColorSystem(tubeData);
  const signature = createTubeSignature(adaptedData);
  
  // Check enhanced cache first
  const cachedColor = globalCache.getTubeColor(signature);
  if (cachedColor) {
    return {
      backgroundColor: cachedColor,
      borderColor: adjustColorBrightness(cachedColor, -20),
      textColor: getOptimalTextColor(cachedColor)
    };
  }
  
  const donorId = getDonorIdentifier(adaptedData);
  
  // Get or assign base color for this donor using enhanced palette
  let baseColor = globalCache.getDonorColor(donorId);
  if (!baseColor) {
    const colorIndex = hashStringToIndex(donorId, donorColorPalette.length);
    baseColor = donorColorPalette[colorIndex];
    globalCache.setDonorColor(donorId, baseColor);
  }
  
  // Apply systematic cell type brightness offset
  const cellTypeBrightnessOffset = getCellTypeBrightnessOffset(adaptedData.cellType || '');
  const finalColor = adjustColorBrightness(baseColor, cellTypeBrightnessOffset);
  
  // Store the color for this exact tube combination
  globalCache.setTubeColor(signature, finalColor);
  
  return {
    backgroundColor: finalColor,
    borderColor: adjustColorBrightness(finalColor, -20),
    textColor: getOptimalTextColor(finalColor)
  };
}

// Cache invalidation helper for tube updates
export function invalidateTubeCache(oldTubeData: any, newTubeData?: Partial<any>): void {
  // Adapt data for color system
  const adaptedOldData = adaptTubeDataForColorSystem(oldTubeData);
  
  // Create old signature to remove from cache
  const oldSignature = createTubeSignature(adaptedOldData);
  globalCache.invalidateTubeColor(oldSignature);
  
  // If new data provided, also invalidate new signature in case of conflicts
  if (newTubeData) {
    const updatedTube = { ...oldTubeData, ...newTubeData };
    const adaptedNewData = adaptTubeDataForColorSystem(updatedTube);
    const newSignature = createTubeSignature(adaptedNewData);
    globalCache.invalidateTubeColor(newSignature);
  }
}

// Global lot style assignment for consistency across all boxes
export function getLotStyleForBox(lotNumber: string | undefined, _rackId: string, _boxId: string): LotStyle | null {
  if (!lotNumber || lotNumber.trim() === '') return null;
  
  const lot = lotNumber.trim();
  
  // Use global assignment - same lot number gets same style everywhere
  const styleIndex = hashStringToIndex(lot, lotIndicatorStyles.length);
  return lotIndicatorStyles[styleIndex];
}

// Global condition style assignment for consistency across all boxes
export function getConditionStyleForBox(condition: string | undefined, _rackId: string, _boxId: string): LotStyle | null {
  if (!condition || condition.trim() === '') return null;
  
  const cond = condition.trim();
  
  // Use global assignment - same condition gets same style everywhere
  const styleIndex = hashStringToIndex(cond, conditionIndicatorStyles.length);
  return conditionIndicatorStyles[styleIndex];
}

// Helper function to format donor ID for grid display (last 5 digits)
export function formatIdForGrid(id: string): string {
  if (!id || id.trim() === '') return '';
  
  const cleanId = id.trim();
  
  // For any ID longer than 5 characters, show last 5 characters with "..." prefix
  if (cleanId.length > 5) {
    return `...${cleanId.substring(cleanId.length - 5)}`;
  }
  
  return cleanId;
}

// Helper function to extract both internal and source IDs from donor data
export function parseDonorInfo(tubeData: any): { internal: string; source: string } {
  const adaptedData = adaptTubeDataForColorSystem(tubeData);

  // Check if we have the new separate fields first
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check if either donor field is present
  if (adaptedData.donorInternalId || adaptedData.donorSourceId) {
    return {
      internal: formatIdForGrid(adaptedData.donorInternalId ?? ''),
      source: formatIdForGrid(adaptedData.donorSourceId ?? '')
    };
  }
  
  // Fallback to legacy donor field
  if (!adaptedData.donor) return { internal: '', source: '' };
  
  try {
    const donorData = JSON.parse(adaptedData.donor);
    const internal = donorData.internal || '';
    const source = donorData.source || '';
    
    return {
      internal: formatIdForGrid(internal),
      source: formatIdForGrid(source)
    };
  } catch (e) {
    // Legacy format or invalid JSON
    const rawDonor = adaptedData.donor || '';
    if (rawDonor.includes('{"internal":') || rawDonor.includes('"source":')) {
      return { internal: '', source: '' }; // Malformed JSON with empty values
    }
    // True legacy format - treat as internal ID
    return {
      internal: formatIdForGrid(rawDonor),
      source: ''
    };
  }
}
