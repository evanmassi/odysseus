/**
 * Tube Operation Types
 *
 * Type definitions for tube creation, update, and validation operations.
 */

export interface TubeSampleInput {
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
}

export interface TubeCreationData {
  location: {
    tankId: string;
    rackId: string;
    boxId: string;
    position: number;
  };
  sample: TubeSampleInput;
  researcherId?: string;
}

interface SampleValidationFields {
  concentration?: number;
  concentrationUnit?: 'c/v' | 'c/mL';
  date?: string;
  donorInternalId?: string;
}

export interface TubeBusinessRuleInput {
  sample: SampleValidationFields;
}

export interface TubeUpdateData {
  location?: {
    tankId?: string;
    rackId?: string;
    boxId?: string;
    position?: number;
  };
  sample?: TubeSampleInput;
  researcherId?: string;
}
