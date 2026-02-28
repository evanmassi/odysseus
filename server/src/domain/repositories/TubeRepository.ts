import { Tube } from '@domain/entities/Tube';
import { Location } from '@domain/valueObjects/Location';
import type { TubeSearchCriteria, TubeSearchResult } from '@domain/types/repository/SearchCriteria';
import type { TubeRepositoryStats } from '@domain/types/repository/Stats';

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
  findByTankAndRack(tankId: string, rackId: string, labId: string): Promise<Tube[]>;
  isPositionAvailable(location: Location, labId: string): Promise<boolean>;
  getOccupiedPositions(tankId: string, rackId: string, boxId: string, labId: string): Promise<number[]>;

  // RESEARCHER-BASED QUERIES

  findByResearcher(researcher: string, labId: string): Promise<Tube[]>;
  getActiveResearchers(labId: string): Promise<string[]>;

  // BUSINESS QUERIES

  findExpired(labId: string): Promise<Tube[]>;
  findIncomplete(labId: string): Promise<Tube[]>;
  countByLabId(labId: string): Promise<number>;
  countByResearcher(researcher: string, labId: string): Promise<number>;
  countByTank(tankId: string, labId: string): Promise<number>;
  countByRack(tankId: string, rackId: string, labId: string): Promise<number>;
  countByBox(tankId: string, rackId: string, boxId: string, labId: string): Promise<number>;

  // SEARCH AND FILTERING

  search(criteria: TubeSearchCriteria, labId: string): Promise<Tube[]>;
  searchWithHighlighting(criteria: TubeSearchCriteria, labId: string): Promise<TubeSearchResult>;
  findByCellType(cellType: string, labId: string): Promise<Tube[]>;
  findByDateRange(startDate: string, endDate: string, labId: string): Promise<Tube[]>;
  findWithConcentration(labId: string): Promise<Tube[]>;

  // BULK OPERATIONS

  saveMany(tubes: Tube[]): Promise<void>;
  deleteMany(ids: string[], labId: string): Promise<number>;
  deleteByTankIds(tankIds: string[], labId: string): Promise<number>;
  updateResearcherForMany(tubeIds: string[], newResearcher: string): Promise<number>;

  // MAINTENANCE OPERATIONS

  isHealthy(): Promise<boolean>;
  getStats(tankIds?: string[], labId?: string): Promise<TubeRepositoryStats>;
}
