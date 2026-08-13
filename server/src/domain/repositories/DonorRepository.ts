/**
 * Donor Repository Interface
 *
 * Data access contract for donor records, collection history, and tube count queries.
 */

import type { Donor } from '@domain/entities/Donor';
import type { DonorCollectionHistory } from '@domain/entities/DonorCollectionHistory';

export interface DonorRepository {
  // Donor CRUD

  findById(id: string, labId: string): Promise<Donor | null>;
  findByLabId(labId: string): Promise<Donor[]>;

  /** Finds a donor matching either source or internal ID within a lab. */
  findByDonorIds(labId: string, sourceId?: string, internalId?: string): Promise<Donor | null>;

  /** Trigram search across source and internal IDs for autocomplete. */
  search(labId: string, query: string, limit?: number): Promise<Donor[]>;

  save(donor: Donor): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  /**
   * Atomically creates a donor stub only if no donor with matching IDs exists.
   * Used by tube auto-creation to prevent duplicates under concurrent writes.
   */
  saveIfNotExists(donor: Donor): Promise<boolean>;

  // Tube count queries

  getTubeCountsForDonors(labId: string, donors: Donor[]): Promise<Map<string, number>>;

  // Collection history

  findCollectionHistory(donorId: string, labId: string): Promise<DonorCollectionHistory[]>;
  findCollectionHistoryById(id: string, labId: string): Promise<DonorCollectionHistory | null>;
  saveCollectionHistory(entry: DonorCollectionHistory): Promise<void>;
  updateCollectionHistory(entry: DonorCollectionHistory, labId: string): Promise<void>;
  deleteCollectionHistory(id: string, labId: string): Promise<boolean>;

  // Lookup value support

  countCollectionEntriesUsingSpecimenType(value: string, labId: string): Promise<number>;
  /** Visitor-created only — the demo creation caps must not be consumed by seeded rows. */
  countNonSeededByLabId(labId: string): Promise<number>;
  renameSpecimenType(oldValue: string, newValue: string, labId: string): Promise<number>;
}
