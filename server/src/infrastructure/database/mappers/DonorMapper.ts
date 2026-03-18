/**
 * Donor Mapper
 *
 * Converts between Donor domain entities and PostgreSQL rows.
 */

import { Donor } from '@domain/entities/Donor';
import { DonorCollectionHistory } from '@domain/entities/DonorCollectionHistory';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface DonorRow {
  id: string;
  lab_id: string;
  donor_source_id: string | null;
  donor_internal_id: string | null;
  species: string | null;
  age: string | null;
  sex: string | null;
  ethnicity: string | null;
  clinical_status: string | null;
  diagnosis: string | null;
  disease_stage: string | null;
  notes: string | null;
  is_curated: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface DonorCollectionHistoryRow {
  id: string;
  donor_id: string;
  collection_date: Date | string;
  specimen_type: string | null;
  source: string | null;
  created_at: Date | string;
}

export class DonorMapper {

  static toRow(donor: Donor): DonorRow {
    return {
      id: donor.id,
      lab_id: donor.labId,
      donor_source_id: donor.donorSourceId ?? null,
      donor_internal_id: donor.donorInternalId ?? null,
      species: donor.species ?? null,
      age: donor.age ?? null,
      sex: donor.sex ?? null,
      ethnicity: donor.ethnicity ?? null,
      clinical_status: donor.clinicalStatus ?? null,
      diagnosis: donor.diagnosis ?? null,
      disease_stage: donor.diseaseStage ?? null,
      notes: donor.notes ?? null,
      is_curated: donor.isCurated,
      created_at: donor.createdAt,
      updated_at: donor.updatedAt,
    };
  }

  static fromRow(row: DonorRow): Donor {
    return Donor.fromData({
      id: row.id,
      labId: row.lab_id,
      donorSourceId: row.donor_source_id ?? undefined,
      donorInternalId: row.donor_internal_id ?? undefined,
      species: row.species ?? undefined,
      age: row.age ?? undefined,
      sex: row.sex ?? undefined,
      ethnicity: row.ethnicity ?? undefined,
      clinicalStatus: row.clinical_status ?? undefined,
      diagnosis: row.diagnosis ?? undefined,
      diseaseStage: row.disease_stage ?? undefined,
      notes: row.notes ?? undefined,
      isCurated: row.is_curated,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows(rows: DonorRow[]): Donor[] {
    return rows.map(row => this.fromRow(row));
  }

  static historyToRow(entry: DonorCollectionHistory): DonorCollectionHistoryRow {
    return {
      id: entry.id,
      donor_id: entry.donorId,
      collection_date: entry.collectionDate,
      specimen_type: entry.specimenType ?? null,
      source: entry.source ?? null,
      created_at: entry.createdAt,
    };
  }

  static historyFromRow(row: DonorCollectionHistoryRow): DonorCollectionHistory {
    return DonorCollectionHistory.fromData({
      id: row.id,
      donorId: row.donor_id,
      collectionDate: toISOString(row.collection_date),
      specimenType: row.specimen_type ?? undefined,
      source: row.source ?? undefined,
      createdAt: toISOString(row.created_at),
    });
  }

  static historyFromRows(rows: DonorCollectionHistoryRow[]): DonorCollectionHistory[] {
    return rows.map(row => this.historyFromRow(row));
  }
}
