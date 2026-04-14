/**
 * Tube Repository Interface
 *
 * Data access contract for tube sample records and location queries.
 */

import type { TubeFilterableField, TubeFilterOptions } from '@odysseus/shared-schemas';

import type { Tube } from '@domain/entities/Tube';
import type { TubeSearchCriteria, TubeSearchResult } from '@domain/types/repository/searchCriteriaTypes';
import type { TubeRepositoryStats } from '@domain/types/repository/statsTypes';
import type { Location } from '@domain/value-objects/Location';

export interface TubeRepository {

  // BASIC CRUD OPERATIONS

  findById(id: string, labId: string): Promise<Tube | null>;
  findByIds(ids: string[], labId: string): Promise<Tube[]>;
  findAllByLabId(labId: string): Promise<Tube[]>;
  save(tube: Tube): Promise<void>;
  saveWithOptimisticLock(tube: Tube, expectedVersion: number): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  // LOCATION-BASED QUERIES

  findByLocation(location: Location, labId: string): Promise<Tube | null>;
  findByCompleteLocation(tankId: string, rackId: string, boxId: string, labId: string): Promise<Tube[]>;
  findByRackAndBox(rackId: string, boxId: string, labId: string): Promise<Tube[]>;
  findByTank(tankId: string, labId: string): Promise<Tube[]>;
  findByTankIds(tankIds: string[], labId: string): Promise<Tube[]>;
  isPositionAvailable(location: Location, labId: string): Promise<boolean>;
  getOccupiedPositions(tankId: string, rackId: string, boxId: string, labId: string): Promise<number[]>;

  // RESEARCHER-BASED QUERIES

  findByResearcher(researcher: string, labId: string): Promise<Tube[]>;

  // LOCK-BASED QUERIES

  findLockedByUser(userId: string, labId: string): Promise<Tube[]>;

  // BUSINESS QUERIES

  countByLabId(labId: string): Promise<number>;
  countByLabIds(labIds: string[]): Promise<Map<string, number>>;
  countByResearcher(researcher: string, labId: string): Promise<number>;
  countByTank(tankId: string, labId: string): Promise<number>;
  countByRack(tankId: string, rackId: string, labId: string): Promise<number>;
  countByBox(tankId: string, rackId: string, boxId: string, labId: string): Promise<number>;
  countGroupedByLocation(labId: string): Promise<Array<{ tankId: string; rackId: string; boxId: string; count: number }>>;
  countGroupedByLocationAllLabs(): Promise<Array<{ labId: string; tankId: string; rackId: string; boxId: string; count: number }>>;

  // SEARCH AND FILTERING

  search(criteria: TubeSearchCriteria, labId: string): Promise<Tube[]>;
  searchWithHighlighting(criteria: TubeSearchCriteria, labId: string): Promise<TubeSearchResult>;
  getFilterOptions(labId: string, fields: TubeFilterableField[], allowedTankIds: string[]): Promise<TubeFilterOptions>;

  // BULK OPERATIONS

  saveMany(tubes: Tube[]): Promise<void>;
  deleteMany(ids: string[], labId: string): Promise<number>;
  deleteByTankIds(tankIds: string[], labId: string): Promise<number>;

  // MAINTENANCE OPERATIONS

  isHealthy(): Promise<boolean>;
  getStats(tankIds?: string[], labId?: string): Promise<TubeRepositoryStats>;
}
