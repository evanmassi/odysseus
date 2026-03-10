/**
 * Tube Position Service Types
 *
 * Type definitions for tube position validation and box statistics.
 */

import type { Tube } from '@domain/entities/Tube';

export interface PositionValidation {
  isValid: boolean;
  errors: string[];
}

export interface PositionValidationWithWarnings extends PositionValidation {
  warnings?: string[];
}

export interface PositionValidationResult extends PositionValidationWithWarnings {
  conflictingTube?: Tube;
}

export interface PositionConflict {
  tubeId: string;
  location: {
    tankId: string;
    rackId: string;
    boxId: string;
    position: number;
  };
  message: string;
}

export interface BoxStatistics {
  totalCapacity: number;
  occupiedCount: number;
  availableCount: number;
  occupancyRate: number;
  researcherCount: number;
  cellTypeCount: number;
  availablePositions: number[];
  occupiedPositions: number[];
}
