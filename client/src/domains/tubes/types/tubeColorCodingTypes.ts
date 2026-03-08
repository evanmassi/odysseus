/**
 * Color Coding Types
 *
 * Normalized tube data shape and adapter for the color coding system.
 */

import type { TubeData } from '@odysseus/shared-schemas';

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

export const adaptTubeDataForColorSystem = (tubeData: TubeData): ColorSystemTubeData => {
  const mediaString = tubeData.sample?.mediaType;

  // Handle Date -> string conversion
  const dateString = tubeData.sample?.date
    ? typeof tubeData.sample.date === 'string'
      ? tubeData.sample.date
      : tubeData.sample.date.toISOString()
    : undefined;

  return {
    id: tubeData.id,
    cellType: tubeData.sample?.cellType ?? '',
    researcherId: tubeData.researcherId ?? '',
    position: tubeData.location?.position ?? 0,
    media: mediaString,
    lotNumber: tubeData.sample?.lotNumber,
    date: dateString,
    donorInternalId: tubeData.sample?.donorInternalId,
    donorSourceId: tubeData.sample?.donorSourceId,
    // Use donorInternalId as fallback for legacy 'donor' field
    donor: tubeData.sample?.donorInternalId ?? tubeData.sample?.donorSourceId,
    // Use cellType as cellLine (they're the same in current schema)
    cellLine: tubeData.sample?.cellType,
    cultureCondition: tubeData.sample?.cultureCondition,
  };
};
