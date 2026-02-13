import type { Tube } from '@domain/entities/Tube';

/**
 * Repository Search Criteria Types
 *
 * Centralized search criteria interfaces for all repositories.
 */

/**
 * Enhanced search result with matched terms for highlighting
 *
 * The matchedTerms array contains all terms that were used to find results,
 * including normalized forms and synonym expansions. Clients use this for
 * accurate result highlighting.
 */
export interface TubeSearchResult {
  tubes: Tube[];
  matchedTerms: string[];
}

export interface TubeSearchCriteria {
  // Generic query - searches across ALL fields
  query?: string;

  // Location criteria (array-based for multiple selection support)
  tankIds?: string[];
  rackIds?: string[];
  boxIds?: string[];

  // Legacy single-value location filters (kept for backwards compatibility)
  tankId?: string;
  rackId?: string;
  boxId?: string;

  // Position criteria - supports alphanumeric labels (e.g., "C5") or numeric (e.g., "23")
  positionLabel?: string;

  // Sample criteria (array-based for multiple selection support)
  cellTypes?: string[];
  species?: string[];
  sources?: string[];
  lotNumbers?: string[];
  donorInternalIds?: string[];
  donorSourceIds?: string[];
  cultureConditions?: string[];

  // Legacy single-value sample filters (kept for backwards compatibility)
  cellType?: string;
  researcher?: string;
  donorInternalId?: string;
  donorSourceId?: string;

  // Researcher criteria (array-based for multiple selection support)
  researcherIds?: string[];

  // Date range criteria (date-only fields are strings YYYY-MM-DD)
  dateFrom?: string;
  dateTo?: string;
  createdAfter?: Date;
  createdBefore?: Date;

  // Status criteria
  hasConcentration?: boolean;
  isComplete?: boolean;
  isExpired?: boolean;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: 'createdAt' | 'updatedAt' | 'position' | 'researcherId' | 'cellType';
  sortOrder?: 'asc' | 'desc';

  // Grouping
  groupBy?: 'auto' | 'none' | 'donor' | 'cellType' | 'researcher' | 'lotNumber' | 'media' | 'location';
}

export interface ResearcherSearchCriteria {
  // Name criteria
  name?: string;
  namePattern?: string;

  // Status criteria
  isActive?: boolean;

  // Date criteria
  createdAfter?: Date;
  createdBefore?: Date;

  // Integration criteria
  hasTubes?: boolean;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: 'firstName' | 'lastName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UserSearchCriteria {
  // Basic criteria
  username?: string;
  role?: 'admin' | 'user';

  // Date criteria
  createdAfter?: Date;
  createdBefore?: Date;

  // Status criteria
  isLocked?: boolean;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: 'username' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}
