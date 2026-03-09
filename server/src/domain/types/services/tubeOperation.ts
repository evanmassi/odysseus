/**
 * Tube Operation Types
 *
 * Type definitions for tube creation, update, and validation operations.
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

interface SampleValidationFields {
  concentration?: number;
  concentrationUnit?: 'c/v' | 'c/mL';
  date?: string;
  donorInternalId?: string;
}

/** Supports both nested (.sample) and flat sample data access */
export interface TubeBusinessRuleInput extends SampleValidationFields {
  sample?: SampleValidationFields;
}

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
