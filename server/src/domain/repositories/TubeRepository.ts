/**
 * Tube Repository Interface
 *
 * Data access contract for tube sample records and location queries.
 */

import { Tube } from '@domain/entities/Tube';
import { Location } from '@domain/value-objects/Location';
import type { TubeSearchCriteria, TubeSearchResult } from '@domain/types/repository/searchCriteriaTypes';
import type { TubeRepositoryStats } from '@domain/types/repository/statsTypes';

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

  // BUSINESS QUERIES

  countByLabId(labId: string): Promise<number>;
  countByLabIds(labIds: string[]): Promise<Map<string, number>>;
  countByResearcher(researcher: string, labId: string): Promise<number>;
  countByTank(tankId: string, labId: string): Promise<number>;
  countByRack(tankId: string, rackId: string, labId: string): Promise<number>;
  countByBox(tankId: string, rackId: string, boxId: string, labId: string): Promise<number>;

  // SEARCH AND FILTERING

  search(criteria: TubeSearchCriteria, labId: string): Promise<Tube[]>;
  searchWithHighlighting(criteria: TubeSearchCriteria, labId: string): Promise<TubeSearchResult>;

  // BULK OPERATIONS

  saveMany(tubes: Tube[]): Promise<void>;
  deleteMany(ids: string[], labId: string): Promise<number>;
  deleteByTankIds(tankIds: string[], labId: string): Promise<number>;

  // MAINTENANCE OPERATIONS

  isHealthy(): Promise<boolean>;
  getStats(tankIds?: string[], labId?: string): Promise<TubeRepositoryStats>;
}
