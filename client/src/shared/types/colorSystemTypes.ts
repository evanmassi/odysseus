/**
 * Color System Types
 */

import type { TubeData } from '@odysseus/shared-schemas';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
}

export interface TubeColor {
  background: string;
  border: string;
  text: string;
  hover?: string;
  selected?: string;
}

export interface ColorTheme {
  name: string;
  colors: ColorPalette;
  tubeColors: {
    default: TubeColor;
    filled: TubeColor;
    selected: TubeColor;
    error: TubeColor;
    warning: TubeColor;
  };
}

export interface LotStyle {
  id: string;
  name: string;
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  pattern?: 'solid' | 'striped' | 'dotted';
}

export interface ColorSystemConfig {
  theme: ColorTheme;
  lotStyles: LotStyle[];
  enableCustomColors: boolean;
  colorBlindAccessibility: boolean;
}

export interface ColorMapping {
  [key: string]: string;
}

export interface ColorSystemState {
  config: ColorSystemConfig;
  customMappings: ColorMapping;
  isDarkMode: boolean;
}

// Additional types for color system
export interface ColorSystemTubeData {
  id: string;
  cellType: string;
  researcherId: string;
  position: number;
  media?: string;
  lotNumber?: string;
  date?: string;
  donorInternalId?: string;
  donorSourceId?: string;
  donor?: string;
  cellLine?: string;
  cultureCondition?: string;
}

// Adapter function for tube data
export const adaptTubeDataForColorSystem = (tubeData: TubeData): ColorSystemTubeData => {
  // Handle media object -> string conversion
  const mediaString = tubeData.sample?.media?.type;

  // Handle Date -> string conversion
  const dateString = tubeData.sample?.date
    ? (typeof tubeData.sample.date === 'string'
        ? tubeData.sample.date
        : tubeData.sample.date.toISOString())
    : undefined;

  return {
    id: tubeData.id,
    cellType: tubeData.sample?.cellType || '',
    researcherId: tubeData.researcherId || '',
    position: tubeData.location?.position || 0,
    media: mediaString,
    lotNumber: tubeData.sample?.lotNumber,
    date: dateString,
    donorInternalId: tubeData.sample?.donorInternalId,
    donorSourceId: tubeData.sample?.donorSourceId,
    // Use donorInternalId as fallback for legacy 'donor' field
    donor: tubeData.sample?.donorInternalId || tubeData.sample?.donorSourceId,
    // Use cellType as cellLine (they're the same in current schema)
    cellLine: tubeData.sample?.cellType,
    cultureCondition: tubeData.sample?.cultureCondition
  };
};
