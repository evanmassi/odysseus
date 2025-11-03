import { Researcher } from '@domain/entities/Researcher';

/**
 * Researcher Repository Interface
 * Defines the contract for researcher data access operations
 * Infrastructure layer will implement this interface
 */
export interface ResearcherRepository {
  
  // BASIC CRUD OPERATIONS

  /**
   * Find researcher by unique identifier
   */
  findById(id: string): Promise<Researcher | null>;
  
  /**
   * Find researcher by name (case-insensitive)
   */
  findByName(firstName: string, lastName: string): Promise<Researcher | null>;
  
  /**
   * Find all researchers in the system
   */
  findAll(): Promise<Researcher[]>;
  
  /**
   * Save a researcher (create or update)
   * Repository determines if it's create vs update based on existence
   */
  save(researcher: Researcher): Promise<void>;
  
  /**
   * Delete a researcher by ID
   * Returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;
  
  // STATUS-BASED OPERATIONS

  /**
   * Find all active researchers
   */
  findActive(): Promise<Researcher[]>;
  
  /**
   * Find all inactive researchers
   */
  findInactive(): Promise<Researcher[]>;
  
  /**
   * Find researchers by active status
   */
  findByStatus(isActive: boolean): Promise<Researcher[]>;
  
  /**
   * Activate/deactivate researcher
   */
  updateStatus(id: string, isActive: boolean): Promise<boolean>;
  
  /**
   * Bulk activate/deactivate researchers
   */
  updateStatusForMany(ids: string[], isActive: boolean): Promise<number>; // Returns count updated
  
  // SEARCH AND FILTERING

  /**
   * Search researchers by name (partial match, case-insensitive)
   */
  searchByName(namePattern: string): Promise<Researcher[]>;
  
  /**
   * Find researchers with similar names (for duplicate detection)
   */
  findSimilarNames(firstName: string, lastName: string): Promise<Researcher[]>;
  
  /**
   * Check if researcher name exists (for uniqueness validation)
   */
  nameExists(firstName: string, lastName: string): Promise<boolean>;
  
  /**
   * Search researchers by criteria
   */
  search(criteria: ResearcherSearchCriteria): Promise<Researcher[]>;
  
  // BUSINESS QUERIES

  /**
   * Find researchers created within date range
   */
  findByCreationDateRange(startDate: Date, endDate: Date): Promise<Researcher[]>;
  
  /**
   * Get researchers sorted by name
   */
  findAllSortedByName(ascending?: boolean): Promise<Researcher[]>;
  
  /**
   * Count total number of researchers
   */
  count(): Promise<number>;
  
  /**
   * Count researchers by status
   */
  countByStatus(isActive: boolean): Promise<number>;
  
  /**
   * Get researcher names only (for dropdowns/autocomplete)
   */
  getAllNames(): Promise<string[]>;
  
  /**
   * Get active researcher names only
   */
  getActiveNames(): Promise<string[]>;
  
  // BULK OPERATIONS

  /**
   * Save multiple researchers in a single operation
   */
  saveMany(researchers: Researcher[]): Promise<void>;
  
  /**
   * Create researchers from name list (convenience method)
   */
  createFromNames(researchers: Array<{ firstName: string; lastName: string; position?: string; department?: string; email?: string }>): Promise<Researcher[]>;
  
  /**
   * Delete multiple researchers by IDs
   */
  deleteMany(ids: string[]): Promise<number>; // Returns count of deleted researchers
  
  /**
   * Update multiple researchers (bulk edit)
   */
  updateMany(updates: Array<{ id: string; name?: string; active?: boolean }>): Promise<number>;
  
  // INTEGRATION QUERIES

  /**
   * Find researchers who have tubes assigned to them
   * (Integration with tube system)
   */
  findWithAssignedTubes(): Promise<Researcher[]>;
  
  /**
   * Find researchers who have no tubes assigned
   * (Useful for cleanup operations)
   */
  findWithoutTubes(): Promise<Researcher[]>;
  
  /**
   * Get researcher usage statistics
   * (How many tubes each researcher has)
   */
  getUsageStats(): Promise<ResearcherUsageStats[]>;
  
  // VALIDATION OPERATIONS

  /**
   * Validate researcher name format (without creating entity)
   */
  validateName(firstName: string, lastName: string): Promise<ValidationResult>;
  
  /**
   * Check for potential duplicates before creation
   */
  checkForDuplicates(researchers: Array<{ firstName: string; lastName: string }>): Promise<DuplicateCheckResult[]>;
  
  // MAINTENANCE OPERATIONS

  /**
   * Check repository health/connectivity
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * Get repository statistics
   */
  getStats(): Promise<ResearcherRepositoryStats>;
  
  /**
   * Clean up unused/inactive researchers
   */
  cleanupInactive(daysSinceCreation: number): Promise<number>; // Returns count of cleaned up researchers

  // BACKWARD COMPATIBILITY METHODS

  /**
   * @deprecated Use getUsageStats() instead
   * Get tube count for a specific researcher by ID
   */
  getTubeCountByResearcher(researcherId: string): Promise<number>;
  
  /**
   * @deprecated Use getUsageStats() instead  
   * Get most active researchers with tube counts
   */
  getMostActiveResearchers(limit?: number): Promise<Array<{ researcher: Researcher, tubeCount: number }>>;

  /**
   * @deprecated Use findWithAssignedTubes() instead
   * Find researchers who have tubes
   */
  findWithTubes(): Promise<Researcher[]>;

  /**
   * @deprecated Use countByStatus(true) instead
   * Count active researchers
   */
  countActive(): Promise<number>;

  /**
   * @deprecated Use countByStatus(false) instead
   * Count inactive researchers  
   */
  countInactive(): Promise<number>;

  /**
   * @deprecated Use updateStatus(id, true) instead
   * Activate a researcher
   */
  activate(id: string): Promise<boolean>;

  /**
   * @deprecated Use updateStatus(id, false) instead
   * Deactivate a researcher
   */
  deactivate(id: string): Promise<boolean>;

  /**
   * @deprecated Use updateStatusForMany(ids, true) instead
   * Activate multiple researchers
   */
  activateMany(ids: string[]): Promise<number>;

  /**
   * @deprecated Use updateStatusForMany(ids, false) instead
   * Deactivate multiple researchers  
   */
  deactivateMany(ids: string[]): Promise<number>;
}

/**
 * Search criteria for researcher queries
 */
export interface ResearcherSearchCriteria {
  // Name criteria
  name?: string; // Exact match
  namePattern?: string; // Partial match
  
  // Status criteria
  isActive?: boolean;
  
  // Date criteria
  createdAfter?: Date;
  createdBefore?: Date;
  
  // Integration criteria
  hasTubes?: boolean; // Has tubes assigned
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Sorting
  sortBy?: 'name' | 'firstName' | 'lastName' | 'createdAt' | 'active';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Validation result for researcher names
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[]; // Non-blocking issues
}

/**
 * Duplicate check result
 */
export interface DuplicateCheckResult {
  name: string;
  isDuplicate: boolean;
  existingResearcher?: {
    id: string;
    name: string;
    isActive: boolean;
  };
  similarNames: string[]; // Names that are similar but not exact duplicates
}

/**
 * Researcher usage statistics
 */
export interface ResearcherUsageStats {
  researcherId: string;
  researcherName: string;
  isActive: boolean;
  tubeCount: number;
  lastTubeCreated?: Date;
  activeTubes: number; // Non-expired tubes
  expiredTubes: number;
}

/**
 * Repository statistics for researcher management
 */
export interface ResearcherRepositoryStats {
  totalResearchers: number;
  activeResearchers: number;
  inactiveResearchers: number;
  researchersWithTubes: number;
  researchersWithoutTubes: number;
  averageTubesPerResearcher: number;
  mostProductiveResearcher?: {
    id: string;
    name: string;
    tubeCount: number;
  };
  oldestResearcher?: {
    id: string;
    name: string;
    createdAt: Date;
  };
  newestResearcher?: {
    id: string;
    name: string;
    createdAt: Date;
  };
}
