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
  query?: string;

  // Location
  tankIds?: string[];
  rackIds?: string[];
  boxIds?: string[];

  // Legacy single-value location filters (kept for backwards compatibility)
  tankId?: string;
  rackId?: string;
  boxId?: string;

  // Supports alphanumeric labels (e.g., "C5") or numeric (e.g., "23")
  positionLabel?: string;

  // Sample
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

  // Researcher
  researcherIds?: string[];

  // Date range — date-only fields are strings YYYY-MM-DD
  dateFrom?: string;
  dateTo?: string;
  createdAfter?: Date;
  createdBefore?: Date;

  // Status
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
  name?: string;
  namePattern?: string;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  hasTubes?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'firstName' | 'lastName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UserSearchCriteria {
  username?: string;
  role?: 'admin' | 'user';
  createdAfter?: Date;
  createdBefore?: Date;
  isLocked?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'username' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}
