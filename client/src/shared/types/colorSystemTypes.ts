/**
 * Color System Types
 */

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
export const adaptTubeDataForColorSystem = (tubeData: any): ColorSystemTubeData => {
  return {
    id: tubeData.id,
    cellType: tubeData.sample?.cellType || '',
    researcherId: tubeData.researcherId || '',
    position: tubeData.location?.position || 0,
    media: tubeData.sample?.media,
    lotNumber: tubeData.sample?.lotNumber,
    date: tubeData.sample?.date,
    donorInternalId: tubeData.sample?.donorInternalId,
    donorSourceId: tubeData.sample?.donorSourceId,
    donor: tubeData.sample?.donor,
    cellLine: tubeData.sample?.cellLine || tubeData.sample?.cellType,
    cultureCondition: tubeData.sample?.cultureCondition
  };
};
