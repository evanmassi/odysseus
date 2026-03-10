/**
 * Researcher Repository Interface
 *
 * Data access contract for researcher records and tube assignment queries.
 */

import { Researcher } from '@domain/entities/Researcher';
import type { ResearcherSearchCriteria } from '@domain/types/repository/searchCriteria';
import type { ResearcherUsageStats, ResearcherRepositoryStats } from '@domain/types/repository/stats';

export interface ResearcherRepository {

  // BASIC CRUD OPERATIONS

  findById(id: string): Promise<Researcher | null>;
  findByName(firstName: string, lastName: string): Promise<Researcher | null>;
  findByPersonId(personId: string): Promise<Researcher | null>;
  findAll(): Promise<Researcher[]>;
  findByLabId(labId: string): Promise<Researcher[]>;
  findActiveByLabId(labId: string): Promise<Researcher[]>;

  /** Returns only found researchers — no errors for missing IDs. */
  findByIds(ids: string[]): Promise<Researcher[]>;

  /** Create vs update determined by existence. */
  save(researcher: Researcher): Promise<void>;

  delete(id: string): Promise<boolean>;

  // STATUS-BASED OPERATIONS

  findActive(): Promise<Researcher[]>;
  findInactive(): Promise<Researcher[]>;
  findByStatus(isActive: boolean): Promise<Researcher[]>;

  /** Both approved AND active (visible to users). */
  findApprovedAndActive(): Promise<Researcher[]>;

  updateStatus(id: string, isActive: boolean): Promise<boolean>;
  updateStatusForMany(ids: string[], isActive: boolean): Promise<number>;

  // SEARCH AND FILTERING

  searchByName(namePattern: string): Promise<Researcher[]>;

  /** For duplicate detection. */
  findSimilarNames(firstName: string, lastName: string): Promise<Researcher[]>;

  nameExists(firstName: string, lastName: string): Promise<boolean>;
  search(criteria: ResearcherSearchCriteria): Promise<Researcher[]>;

  // BUSINESS QUERIES

  findByCreationDateRange(startDate: Date, endDate: Date): Promise<Researcher[]>;
  findAllSortedByName(ascending?: boolean): Promise<Researcher[]>;
  count(): Promise<number>;
  countByStatus(isActive: boolean): Promise<number>;
  getAllNames(): Promise<string[]>;
  getActiveNames(): Promise<string[]>;

  // BULK OPERATIONS

  saveMany(researchers: Researcher[]): Promise<void>;
  createFromNames(researchers: Array<{ firstName: string; lastName: string; position?: string; department?: string; email?: string }>): Promise<Researcher[]>;
  deleteMany(ids: string[]): Promise<number>;
  updateMany(updates: Array<{ id: string; name?: string; active?: boolean }>): Promise<number>;

  // INTEGRATION QUERIES

  findWithAssignedTubes(): Promise<Researcher[]>;
  findWithoutTubes(): Promise<Researcher[]>;
  getUsageStats(): Promise<ResearcherUsageStats[]>;
  getTubeCountByResearcher(researcherId: string): Promise<number>;
  getMostActiveResearchers(limit?: number): Promise<Array<{ researcher: Researcher, tubeCount: number }>>;

  // VALIDATION OPERATIONS

  validateName(firstName: string, lastName: string): Promise<ResearcherValidationResult>;
  checkForDuplicates(researchers: Array<{ firstName: string; lastName: string }>): Promise<DuplicateCheckResult[]>;

  // MAINTENANCE OPERATIONS

  isHealthy(): Promise<boolean>;
  getStats(): Promise<ResearcherRepositoryStats>;
  cleanupInactive(daysSinceCreation: number): Promise<number>;
}

export interface ResearcherValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface DuplicateCheckResult {
  name: string;
  isDuplicate: boolean;
  existingResearcher?: {
    id: string;
    name: string;
    isActive: boolean;
  };
  similarNames: string[];
}
