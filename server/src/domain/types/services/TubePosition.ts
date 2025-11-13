/**
 * Tube Position Service Types
 *
 * Type definitions for tube position validation and box statistics.
 */

/**
 * Basic position validation result
 */
export interface PositionValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Position validation with optional warnings
 */
export interface PositionValidationWithWarnings extends PositionValidation {
  warnings?: string[];
}

/**
 * Complete position validation result including conflict information
 */
export interface PositionValidationResult extends PositionValidationWithWarnings {
  conflictingTube?: any; // Tube type to avoid circular dependency
}

/**
 * Statistical information about a storage box
 */
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
