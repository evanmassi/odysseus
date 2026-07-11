/**
 * Tube Repository Interface
 *
 * Data access contract for tube sample records and location queries.
 */

import type { Tube } from '@domain/entities/Tube';
import type { TubeSearchCriteria, TubeSearchResult } from '@domain/types/repository/searchCriteriaTypes';
import type { TubeRepositoryStats } from '@domain/types/repository/statsTypes';
import type { Location } from '@domain/value-objects/Location';

import type { TubeFilterableField, TubeFilterOptions } from '@odysseus/shared-schemas';

export interface TubeRepository {

  findById(id: string, labId: string): Promise<Tube | null>;
  findByIds(ids: string[], labId: string): Promise<Tube[]>;
  findAllByLabId(labId: string): Promise<Tube[]>;
  save(tube: Tube): Promise<void>;
  saveWithOptimisticLock(tube: Tube, expectedVersion: number): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  // LOCATION-BASED QUERIES

  findByLocation(location: Location, labId: string): Promise<Tube | null>;
  findByCompleteLocation(tankId: string, rackId: string, boxId: string, labId: string): Promise<Tube[]>;
  findByRack(tankId: string, rackId: string, labId: string): Promise<Tube[]>;
  findByRackAndBox(rackId: string, boxId: string, labId: string): Promise<Tube[]>;
  getOccupiedPositions(tankId: string, rackId: string, boxId: string, labId: string): Promise<number[]>;

  // LOCK-BASED QUERIES

  findLockedByUser(userId: string, labId: string): Promise<Tube[]>;

  countByLabId(labId: string): Promise<number>;
  countByLabIds(labIds: string[]): Promise<Map<string, number>>;
  countByTank(tankId: string, labId: string): Promise<number>;
  countByRack(tankId: string, rackId: string, labId: string): Promise<number>;
  countByBox(tankId: string, rackId: string, boxId: string, labId: string): Promise<number>;
  countGroupedByLocation(labId: string): Promise<Array<{ tankId: string; rackId: string; boxId: string; count: number }>>;
  countGroupedByLocationAllLabs(): Promise<Array<{ labId: string; tankId: string; rackId: string; boxId: string; count: number }>>;

  search(criteria: TubeSearchCriteria, labId: string): Promise<Tube[]>;
  searchWithHighlighting(criteria: TubeSearchCriteria, labId: string): Promise<TubeSearchResult>;
  getFilterOptions(labId: string, fields: TubeFilterableField[], allowedTankIds: string[]): Promise<TubeFilterOptions>;

  deleteMany(ids: string[], labId: string): Promise<number>;
  deleteByTankIds(tankIds: string[], labId: string): Promise<number>;

  isHealthy(): Promise<boolean>;
  getStats(tankIds?: string[], labId?: string): Promise<TubeRepositoryStats>;
}
