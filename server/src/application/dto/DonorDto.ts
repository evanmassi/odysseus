/**
 * Donor Data Transfer Objects
 *
 * Maps between Donor domain entities and HTTP response shapes.
 */

import type { Donor } from '@domain/entities/Donor';
import type { DonorCollectionHistory } from '@domain/entities/DonorCollectionHistory';

import type {
  Donor as DonorData,
  DonorWithTubeCount,
  DonorCollectionHistory as DonorCollectionHistoryData,
} from '@odysseus/shared-schemas';

export type DonorResponse = DonorData;

export type DonorWithTubeCountResponse = DonorWithTubeCount;

export type DonorCollectionHistoryResponse = DonorCollectionHistoryData;

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
      createdAt: donor.createdAt,
      updatedAt: donor.updatedAt,
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
      collectionDate: entry.collectionDate,
      specimenType: entry.specimenType,
      source: entry.source,
      createdAt: entry.createdAt,
    };
  }
}
