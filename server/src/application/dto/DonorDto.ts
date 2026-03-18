/**
 * Donor Data Transfer Objects
 *
 * Maps between Donor domain entities and HTTP response shapes.
 */

import type { Donor } from '@domain/entities/Donor';
import type { DonorCollectionHistory } from '@domain/entities/DonorCollectionHistory';

export interface DonorResponse {
  id: string;
  labId: string;
  donorSourceId?: string;
  donorInternalId?: string;
  species?: string;
  age?: string;
  sex?: string;
  ethnicity?: string;
  clinicalStatus?: string;
  diagnosis?: string;
  diseaseStage?: string;
  notes?: string;
  isCurated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DonorWithTubeCountResponse extends DonorResponse {
  tubeCount: number;
}

export interface DonorCollectionHistoryResponse {
  id: string;
  donorId: string;
  collectionDate: string;
  specimenType?: string;
  source?: string;
  createdAt: string;
}

export class DonorDto {

  static toResponse(donor: Donor): DonorResponse {
    return {
      id: donor.id,
      labId: donor.labId,
      donorSourceId: donor.donorSourceId,
      donorInternalId: donor.donorInternalId,
      species: donor.species,
      age: donor.age,
      sex: donor.sex,
      ethnicity: donor.ethnicity,
      clinicalStatus: donor.clinicalStatus,
      diagnosis: donor.diagnosis,
      diseaseStage: donor.diseaseStage,
      notes: donor.notes,
      isCurated: donor.isCurated,
      createdAt: donor.createdAt.toISOString(),
      updatedAt: donor.updatedAt.toISOString(),
    };
  }

  static toResponseWithTubeCount(donor: Donor, tubeCount: number): DonorWithTubeCountResponse {
    return {
      ...this.toResponse(donor),
      tubeCount,
    };
  }

  static historyToResponse(entry: DonorCollectionHistory): DonorCollectionHistoryResponse {
    return {
      id: entry.id,
      donorId: entry.donorId,
      collectionDate: entry.collectionDate.toISOString(),
      specimenType: entry.specimenType,
      source: entry.source,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
