import { Tube } from '@domain/entities/Tube';
import { MediaData } from '@domain/valueObjects/Media';

/**
 * Thin DTOs
 *
 * - No validation (Zod middleware already validated)
 * - No parsing (Zod preprocessor already parsed)
 * - No business logic (domain entities handle that)
 * - Pure structure mapping only
 */
import {
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type TubeData
} from '@odysseus/shared-schemas';

// Re-export for backward compatibility
export type { CreateTubeRequest, UpdateTubeRequest };

// TubeResponse is the same as TubeData from shared schemas
export type TubeResponse = TubeData;

export interface BulkUpdateRequest {
  updates: Array<{
    id: string;
    updates: UpdateTubeRequest;
  }>;
}

export interface TubeSearchRequest {
  query?: string;
  tankId?: string;
  rackId?: string;
  boxId?: string;
  cellType?: string;
  researcherId?: string;
  donorInternalId?: string;
  donorSourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  hasConcentration?: boolean;
  isComplete?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'position' | 'researcherId' | 'cellType';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Enhanced search response with matched terms for highlighting
 *
 * matchedTerms contains all query variants used in the search:
 * - Original query
 * - Normalized form (hyphens split)
 * - Synonym expansions
 * - Individual words
 *
 * Client uses these for accurate result highlighting.
 */
export interface TubeSearchResponse {
  tubes: TubeResponse[];
  matchedTerms: string[];
}

/**
 * DTO Conversion Utilities
 *
 * Thin mappers only
 * - No validation (trust Zod)
 * - No parsing (already done)
 * - No defaults (domain handles)
 * - Just structure mapping
 */
export class TubeDto {
  /**
   * Convert domain entity to API response
   *Direct passthrough via toData()
   */
  static toResponse(tube: Tube): TubeResponse {
    const data = tube.toData();

    // Direct passthrough - researcherId is optional in schema
    return data;
  }

  /**
   * Convert multiple domain entities to API responses
   */
  static toResponseList(tubes: Tube[]): TubeResponse[] {
    return tubes.map(tube => this.toResponse(tube));
  }

  /**
   * Convert create request to data structure for Tube.create()
   *Direct mapping - no transformation
   * - Concentration already number (Zod preprocessed)
   * - Researcher will get default in domain
   * - Media is already object
   */
  static fromCreateRequest(request: CreateTubeRequest): {
    location: { tankId: string; rackId: string; boxId: string; position: number };
    sample: {
      cellType?: string;
      donorInternalId?: string;
      donorSourceId?: string;
      concentration?: number;
      concentrationUnit?: 'c/v' | 'c/mL';
      date?: string;
      media?: MediaData;
      cultureCondition?: string;
      lotNumber?: string;
      species?: string;
      source?: string;
      catalogNumber?: string;
      passageNumber?: number;
      notes?: string;
    };
    researcherId?: string;
  } {
    //Pure structure mapping, no logic
    return {
      location: request.location,
      sample: {
        cellType: request.sample.cellType,
        donorInternalId: request.sample.donorInternalId,
        donorSourceId: request.sample.donorSourceId,
        concentration: request.sample.concentration, // Already number from Zod
        concentrationUnit: request.sample.concentrationUnit,
        date: request.sample.date,
        media: request.sample.media, // Already object from Zod
        cultureCondition: request.sample.cultureCondition,
        lotNumber: request.sample.lotNumber,
        species: request.sample.species,
        source: request.sample.source,
        catalogNumber: request.sample.catalogNumber,
        passageNumber: request.sample.passageNumber,
        notes: request.sample.notes
      },
      researcherId: request.researcherId
    };
  }

  /**
   * Convert update request to update data structure
   *Direct mapping - preserves tri-state PATCH semantics
   * - null = clear field
   * - undefined = no change
   * - value = set field
   */
  static fromUpdateRequest(request: UpdateTubeRequest): {
    location?: Partial<{ tankId: string; rackId: string; boxId: string; position: number }>;
    sample?: {
      cellType?: string;
      donorInternalId?: string | null;
      donorSourceId?: string | null;
      concentration?: number | null;
      concentrationUnit?: 'c/v' | 'c/mL' | null;
      date?: string | null;
      media?: MediaData | null;
      cultureCondition?: string | null;
      lotNumber?: string | null;
      species?: string | null;
      source?: string | null;
      catalogNumber?: string | null;
      passageNumber?: number | null;
      notes?: string | null;
    };
    researcherId?: string | null;
  } {
    const result: {
      location?: Partial<{ tankId: string; rackId: string; boxId: string; position: number }>;
      sample?: {
        cellType?: string;
        donorInternalId?: string | null;
        donorSourceId?: string | null;
        concentration?: number | null;
        concentrationUnit?: 'c/v' | 'c/mL' | null;
        date?: string | null;
        media?: MediaData | null;
        cultureCondition?: string | null;
        lotNumber?: string | null;
        species?: string | null;
        source?: string | null;
        catalogNumber?: string | null;
        passageNumber?: number | null;
        notes?: string | null;
      };
      researcherId?: string | null;
    } = {};

    //Direct passthrough - Zod already validated and parsed
    if (request.location) {
      result.location = request.location;
    }

    if (request.sample) {
      result.sample = {};

      // Direct mapping - no parsing needed
      if (request.sample.cellType !== undefined) result.sample.cellType = request.sample.cellType;
      if (request.sample.donorInternalId !== undefined) result.sample.donorInternalId = request.sample.donorInternalId;
      if (request.sample.donorSourceId !== undefined) result.sample.donorSourceId = request.sample.donorSourceId;
      if (request.sample.concentration !== undefined) result.sample.concentration = request.sample.concentration; // Already number
      if (request.sample.concentrationUnit !== undefined) result.sample.concentrationUnit = request.sample.concentrationUnit;
      if (request.sample.date !== undefined) result.sample.date = request.sample.date;
      if (request.sample.media !== undefined) result.sample.media = request.sample.media; // Already object
      if (request.sample.cultureCondition !== undefined) result.sample.cultureCondition = request.sample.cultureCondition;
      if (request.sample.lotNumber !== undefined) result.sample.lotNumber = request.sample.lotNumber;
      if (request.sample.species !== undefined) result.sample.species = request.sample.species;
      if (request.sample.source !== undefined) result.sample.source = request.sample.source;
      if (request.sample.catalogNumber !== undefined) result.sample.catalogNumber = request.sample.catalogNumber;
      if (request.sample.passageNumber !== undefined) result.sample.passageNumber = request.sample.passageNumber;
      if (request.sample.notes !== undefined) result.sample.notes = request.sample.notes;
    }

    if (request.researcherId !== undefined) {
      result.researcherId = request.researcherId;
    }

    return result;
  }
}
