/**
 * Tube Position Service Types
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
