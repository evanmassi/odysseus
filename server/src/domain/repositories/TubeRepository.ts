import { Tube } from '@domain/entities/Tube';
import { Location } from '@domain/valueObjects/Location';
import type { TubeSearchCriteria, TubeSearchResult } from '@domain/types/repository/SearchCriteria';
import type { TubeRepositoryStats } from '@domain/types/repository/Stats';

/**
 * Tube Repository Interface
 * Defines the contract for tube data access operations
 * Infrastructure layer will implement this interface
 */
export interface TubeRepository {
  
  // BASIC CRUD OPERATIONS

  /**
   * Find tube by unique identifier
   */
  findById(id: string): Promise<Tube | null>;
  
  /**
   * Find multiple tubes by IDs in a single query
   */
  findByIds(ids: string[]): Promise<Tube[]>;

  /**
   * Find all tubes in the system
   */
  findAll(): Promise<Tube[]>;
  
  /**
   * Save a tube (create or update).
   * Repository determines if it's create vs update based on existence.
   * @throws ValidationError if position already occupied (UNIQUE constraint)
   */
  save(tube: Tube): Promise<void>;

  /**
   * Save with optimistic locking.
   * @throws ConflictError if version mismatch (another user modified the tube)
   * @throws ValidationError if position already occupied (race condition on move)
   */
  saveWithOptimisticLock(tube: Tube, expectedVersion: number): Promise<void>;

  /**
   * Delete a tube by ID
   * Returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;
  
  // LOCATION-BASED QUERIES

  /**
   * Find tube at a specific location
   * Used for position conflict detection
   */
  findByLocation(location: Location): Promise<Tube | null>;
  
  /**
   * Find all tubes in a complete location (tankId + rackId + boxId)
   */
  findByCompleteLocation(tankId: string, rackId: string, boxId: string): Promise<Tube[]>;
  
  /**
   * ⚠️ LEGACY: Find all tubes in a specific rack and box (deprecated)
   */
  findByRackAndBox(rackId: string, boxId: string): Promise<Tube[]>;
  
  /**
   * Find all tubes in a specific tank
   */
  findByTank(tankId: string): Promise<Tube[]>;

  /**
   * Find all tubes in multiple tanks (for demo mode filtering)
   */
  findByTankIds(tankIds: string[]): Promise<Tube[]>;

  /**
   * Find all tubes in a specific rack within a tank
   */
  findByTankAndRack(tankId: string, rackId: string): Promise<Tube[]>;
  
  /**
   * Check if a position is available (no tube exists there)
   */
  isPositionAvailable(location: Location): Promise<boolean>;
  
  /**
   * Get all occupied positions in a specific box
   */
  getOccupiedPositions(tankId: string, rackId: string, boxId: string): Promise<number[]>;
  
  // RESEARCHER-BASED QUERIES

  /**
   * Find all tubes assigned to a specific researcher
   */
  findByResearcher(researcher: string): Promise<Tube[]>;
  
  /**
   * Get list of all researchers who have tubes
   */
  getActiveResearchers(): Promise<string[]>;
  
  // BUSINESS QUERIES

  /**
   * Find tubes that are expired
   */
  findExpired(): Promise<Tube[]>;
  
  /**
   * Find tubes with incomplete sample data
   */
  findIncomplete(): Promise<Tube[]>;
  
  /**
   * Count total number of tubes
   */
  count(): Promise<number>;
  
  /**
   * Count tubes by researcher
   */
  countByResearcher(researcher: string): Promise<number>;
  
  /**
   * Count tubes in a specific location hierarchy
   */
  countByTank(tankId: string): Promise<number>;
  countByRack(tankId: string, rackId: string): Promise<number>;
  countByBox(tankId: string, rackId: string, boxId: string): Promise<number>;
  
  // SEARCH AND FILTERING

  /**
   * Search tubes by various criteria
   */
  search(criteria: TubeSearchCriteria): Promise<Tube[]>;

  /**
   * Search tubes with matched terms for highlighting
   *
   * Returns both tubes and the terms that matched (including synonyms,
   * normalized forms, and fuzzy matches) for client-side highlighting.
   */
  searchWithHighlighting(criteria: TubeSearchCriteria): Promise<TubeSearchResult>;
  
  /**
   * Find tubes by cell type
   */
  findByCellType(cellType: string): Promise<Tube[]>;
  
  /**
   * Find tubes by date range
   * Date-only fields are strings (YYYY-MM-DD) to prevent timezone bugs
   */
  findByDateRange(startDate: string, endDate: string): Promise<Tube[]>;
  
  /**
   * Find tubes with concentration data
   */
  findWithConcentration(): Promise<Tube[]>;
  
  // BULK OPERATIONS

  /**
   * Save multiple tubes in a single operation.
   * Skips optimistic locking - used for imports and seeding where conflicts are pre-validated.
   */
  saveMany(tubes: Tube[]): Promise<void>;
  
  /**
   * Delete multiple tubes by IDs
   */
  deleteMany(ids: string[]): Promise<number>; // Returns count of deleted tubes
  
  /**
   * Update multiple tubes with same researcher
   */
  updateResearcherForMany(tubeIds: string[], newResearcher: string): Promise<number>;
  
  // MAINTENANCE OPERATIONS

  /**
   * Check repository health/connectivity
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * Get repository statistics
   */
  getStats(): Promise<TubeRepositoryStats>;
}
