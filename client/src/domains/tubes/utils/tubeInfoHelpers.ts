/**
 * Utilities for processing tube information display
 */

import { parseDate } from '@odysseus/shared-schemas';

import { getFieldResolverApplicationService } from '@app/services/FieldResolverService';

import { TUBE_FIELD_CONFIG } from '../config/fieldConfig';

import type { CreateTubeRequest, TubeData } from '@shared/types/Tube';

export interface TubeInfo {
  id: string;
  location: {
    tankId: string;
    rackId: string;
    boxId: string;
    position: number;
  };
  sample: {
    cellType?: string;
    donorInternalId?: string;
    donorSourceId?: string;
    concentration?: number;
    concentrationUnit?: 'c/v' | 'c/mL';
    date?: string;
    media?: string;
    cultureCondition?: string;
    lotNumber?: string;
    notes?: string;
  };
  researcherId: string;
  timestamps: {
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface ConflictInfo {
  hasConflicts: boolean;
  conflictingFields: Set<keyof CreateTubeRequest>;
  commonValues: Partial<CreateTubeRequest>;
}

/**
 * Convert TubeData to CreateTubeRequest format
 * CreateTubeRequest doesn't include id (that's generated server-side)
 */
function convertTubeDataToFormData(tubeData: TubeData): Partial<CreateTubeRequest> {
  return {
    // id is not part of CreateTubeRequest - it's generated on creation
    location: tubeData.location,
    sample: {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty cellType is validation failure, show empty for user to fill
      cellType: tubeData.sample.cellType || '',
      donorInternalId: tubeData.sample.donorInternalId,
      donorSourceId: tubeData.sample.donorSourceId,
      concentration: tubeData.sample.concentration,
      concentrationUnit: tubeData.sample.concentrationUnit,
      date: parseDate(tubeData.sample.date),
      media: tubeData.sample.media,
      cultureCondition: tubeData.sample.cultureCondition,
      lotNumber: tubeData.sample.lotNumber,
      notes: tubeData.sample.notes,
    },
    researcherId: tubeData.researcherId,
  };
}

/**
 * Analyze multiple tubes for conflicts and common values
 */
export function analyzeTubeConflicts(tubes: TubeData[]): ConflictInfo {
  if (tubes.length === 0) {
    return {
      hasConflicts: false,
      conflictingFields: new Set(),
      commonValues: {},
    };
  }

  if (tubes.length === 1) {
    return {
      hasConflicts: false,
      conflictingFields: new Set(),
      commonValues: convertTubeDataToFormData(tubes[0]),
    };
  }

  const conflictingFields = new Set<keyof CreateTubeRequest>();
  const commonValues: Partial<CreateTubeRequest> = {};

  // Get all field keys from configuration
  const allFieldKeys = TUBE_FIELD_CONFIG.flatMap(section => section.fields).map(field => field.key);

  // Get field resolver service for accessing nested data
  const fieldResolverService = getFieldResolverApplicationService();
  const fieldResolver = fieldResolverService.getFieldResolver();

  // Check each field for conflicts
  allFieldKeys.forEach(fieldKey => {
    const values = tubes
      .map(tube => {
        // Use field resolver to access nested properties
        try {
          return fieldResolver.getValue(tube as TubeData, fieldKey);
        } catch (error) {
          // If field is not configured in resolver, return undefined
          return undefined;
        }
      })
      .filter(value => value !== undefined && value !== null && value !== '');
    const uniqueValues = [...new Set(values)];

    if (uniqueValues.length === 1 && uniqueValues[0]) {
      // All tubes have the same value for this field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic field assignment to partial object
      (commonValues as any)[fieldKey] = uniqueValues[0];
    } else if (uniqueValues.length > 1) {
      // Conflicting values
      conflictingFields.add(fieldKey as keyof CreateTubeRequest);
    }
    // If uniqueValues.length === 0, field is empty in all tubes - don't add to common
  });

  return {
    hasConflicts: conflictingFields.size > 0,
    conflictingFields,
    commonValues,
  };
}

/**
 * Format position ranges for display
 */
export function formatPositionRanges(tubes: TubeData[]): string {
  if (tubes.length === 0) return '';

  // Remove duplicates and sort positions
  const uniquePositions = [...new Set(tubes.map(t => t.location.position))].sort((a, b) => a - b);
  const ranges: string[] = [];

  let start = uniquePositions[0];
  let end = uniquePositions[0];

  for (let i = 1; i < uniquePositions.length; i++) {
    if (uniquePositions[i] === end + 1) {
      // Consecutive position
      end = uniquePositions[i];
    } else {
      // Gap found, add range
      if (start === end) {
        ranges.push(start.toString());
      } else {
        ranges.push(`${start}-${end}`);
      }
      start = end = uniquePositions[i];
    }
  }

  // Add final range
  if (start === end) {
    ranges.push(start.toString());
  } else {
    ranges.push(`${start}-${end}`);
  }

  return ranges.join(', ');
}

/**
 * Get position summary for tubes
 */
export function getPositionSummary(
  tubes: TubeData[],
  tankName?: string,
  rackName?: string
): string {
  if (tubes.length === 0) return '';

  const firstTube = tubes[0];
  const box = firstTube.location.boxId;
  const positions = formatPositionRanges(tubes);

  const rackDisplay = rackName ?? `Rack ${firstTube.location.rackId}`;

  if (tubes.length === 1) {
    return `${rackDisplay} • Box ${box} • Position ${positions}`;
  } else {
    return `${rackDisplay} • Box ${box} • Positions ${positions}`;
  }
}

/**
 * Get tank name for display
 */
export function getTankName(tubes: TubeData[], customTankName?: string): string {
  if (tubes.length === 0) return '';
  return customTankName ?? `Tank ${tubes[0].location.tankId}`;
}
