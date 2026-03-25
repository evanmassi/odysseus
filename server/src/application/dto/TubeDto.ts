/**
 * Tube Data Transfer Objects
 *
 * Pure structure mapping — validation is handled by Zod middleware, business logic by domain entities.
 */

import {
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type TubeData
} from '@odysseus/shared-schemas';

import type { Tube } from '@domain/entities/Tube';

export type { CreateTubeRequest, UpdateTubeRequest };

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
 * matchedTerms contains all query variants used in the search (original, normalized,
 * synonym expansions, individual words). Client uses these for result highlighting.
 */
export interface TubeSearchResponse {
  tubes: TubeResponse[];
  matchedTerms: string[];
}

export class TubeDto {
  static toResponse(tube: Tube): TubeResponse {
    const data = tube.toData();
    return {
      ...data,
      timestamps: {
        createdAt: new Date(data.timestamps.createdAt),
        updatedAt: new Date(data.timestamps.updatedAt),
      },
    };
  }

  static toResponseList(tubes: Tube[]): TubeResponse[] {
    return tubes.map(tube => this.toResponse(tube));
  }

  static fromCreateRequest(request: CreateTubeRequest): {
    location: { tankId: string; rackId: string; boxId: string; position: number };
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
      species?: string;
      source?: string;
      catalogNumber?: string;
      passageNumber?: number;
      notes?: string;
    };
    researcherId?: string;
  } {
    return {
      location: request.location,
      sample: {
        cellType: request.sample.cellType,
        donorInternalId: request.sample.donorInternalId,
        donorSourceId: request.sample.donorSourceId,
        concentration: request.sample.concentration,
        concentrationUnit: request.sample.concentrationUnit,
        date: request.sample.date,
        mediaType: request.sample.mediaType,
        mediaSupplements: request.sample.mediaSupplements,
        mediaSelection: request.sample.mediaSelection,
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
   * Tri-state PATCH semantics: null = clear field, undefined = no change, value = set field.
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
      mediaType?: string | null;
      mediaSupplements?: string | null;
      mediaSelection?: string | null;
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
        mediaType?: string | null;
        mediaSupplements?: string | null;
        mediaSelection?: string | null;
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

    if (request.location) {
      result.location = request.location;
    }

    if (request.sample) {
      result.sample = {};

      if (request.sample.cellType !== undefined) result.sample.cellType = request.sample.cellType;
      if (request.sample.donorInternalId !== undefined) result.sample.donorInternalId = request.sample.donorInternalId;
      if (request.sample.donorSourceId !== undefined) result.sample.donorSourceId = request.sample.donorSourceId;
      if (request.sample.concentration !== undefined) result.sample.concentration = request.sample.concentration;
      if (request.sample.concentrationUnit !== undefined) result.sample.concentrationUnit = request.sample.concentrationUnit;
      if (request.sample.date !== undefined) result.sample.date = request.sample.date;
      if (request.sample.mediaType !== undefined) result.sample.mediaType = request.sample.mediaType;
      if (request.sample.mediaSupplements !== undefined) result.sample.mediaSupplements = request.sample.mediaSupplements;
      if (request.sample.mediaSelection !== undefined) result.sample.mediaSelection = request.sample.mediaSelection;
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
