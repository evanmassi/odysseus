/**
 * Validation Service Types
 *
 * Type definitions for tube validation operations.
 */

/**
 * Tube creation data with nested structure matching shared schemas
 */
export interface TubeCreationData {
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
    mediaType?: string;
    mediaSupplements?: string;
    mediaSelection?: string;
    cultureCondition?: string;
    lotNumber?: string;
    notes?: string;
  };
  researcherId?: string;
}

/**
 * Sample data fields used for business rule validation
 */
interface SampleValidationFields {
  concentration?: number;
  concentrationUnit?: 'c/v' | 'c/mL';
  date?: string;
  donorInternalId?: string;
}

/**
 * Input for tube business rule validation
 * Supports both nested (.sample) and flat sample data access
 */
export interface TubeBusinessRuleInput extends SampleValidationFields {
  sample?: SampleValidationFields;
}

/**
 * Tube update data for PATCH operations
 */
export interface TubeUpdateData {
  location?: {
    tankId?: string;
    rackId?: string;
    boxId?: string;
    position?: number;
  };
  sample?: {
    cellType?: string;
    donorInternalId?: string;
    donorSourceId?: string;
    concentration?: number;
    concentrationUnit?: 'c/v' | 'c/mL';
    date?: string;
    mediaType?: string;
    mediaSupplements?: string;
    mediaSelection?: string;
    cultureCondition?: string;
    lotNumber?: string;
    notes?: string;
  };
  researcherId?: string;
}
