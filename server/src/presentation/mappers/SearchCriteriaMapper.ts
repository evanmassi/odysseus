import { SearchFilters } from '@odysseus/shared-schemas';
import { TubeSearchCriteria } from '@domain/repositories/TubeRepository';

/**
 * SearchCriteriaMapper - Maps presentation layer filters to domain criteria
 *
 * Follows Clean Architecture: Presentation layer concerns (SearchFilters from HTTP request)
 * are mapped to domain layer concerns (TubeSearchCriteria for repository).
 *
 * This centralized mapping prevents duplication across controllers and ensures
 * consistent filter handling.
 */
export class SearchCriteriaMapper {
  /**
   * Map SearchFilters (API request) to TubeSearchCriteria (domain)
   *
   * @param filters - Filters from HTTP request body (validated by Zod)
   * @param baseOptions - Additional search options (query, limit, offset, sorting)
   * @returns TubeSearchCriteria for repository
   */
  static toTubeSearchCriteria(
    filters?: SearchFilters,
    baseOptions?: {
      query?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): TubeSearchCriteria {
    // Validate sortBy against allowed values
    const validSortFields = ['createdAt', 'updatedAt', 'position', 'researcherId', 'cellType'] as const;
    const sortBy = baseOptions?.sortBy && validSortFields.includes(baseOptions.sortBy as any)
      ? (baseOptions.sortBy as TubeSearchCriteria['sortBy'])
      : undefined;

    return {
      // Base search options
      query: baseOptions?.query,
      limit: baseOptions?.limit,
      offset: baseOptions?.offset,
      sortBy,
      sortOrder: baseOptions?.sortOrder,

      // Location filters (array-based for multiple selection)
      tankIds: filters?.tankIds,
      rackIds: filters?.rackIds,
      boxIds: filters?.boxIds,

      // Position filter (alphanumeric or numeric label)
      positionLabel: filters?.positionLabel,

      // Sample filters (array-based for multiple selection)
      cellTypes: filters?.cellTypes,
      lotNumbers: filters?.lotNumbers,
      donorInternalIds: filters?.donorInternalIds,
      donorSourceIds: filters?.donorSourceIds,
      cultureConditions: filters?.cultureConditions,

      // Researcher filters (array-based for multiple selection)
      researcherIds: filters?.researcherIds,

      // Date range filters (single values)
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo
    };
  }

  /**
   * Extract only filter-related fields (excludes pagination/sorting)
   * Useful for logging or analytics
   */
  static extractFiltersOnly(criteria: TubeSearchCriteria): Partial<TubeSearchCriteria> {
    return {
      tankIds: criteria.tankIds,
      rackIds: criteria.rackIds,
      boxIds: criteria.boxIds,
      cellTypes: criteria.cellTypes,
      lotNumbers: criteria.lotNumbers,
      donorInternalIds: criteria.donorInternalIds,
      donorSourceIds: criteria.donorSourceIds,
      cultureConditions: criteria.cultureConditions,
      researcherIds: criteria.researcherIds,
      dateFrom: criteria.dateFrom,
      dateTo: criteria.dateTo
    };
  }

  /**
   * Count active filters (for analytics/logging)
   */
  static countActiveFilters(criteria: TubeSearchCriteria): number {
    let count = 0;

    if (criteria.tankIds?.length) count += criteria.tankIds.length;
    if (criteria.rackIds?.length) count += criteria.rackIds.length;
    if (criteria.boxIds?.length) count += criteria.boxIds.length;
    if (criteria.cellTypes?.length) count += criteria.cellTypes.length;
    if (criteria.lotNumbers?.length) count += criteria.lotNumbers.length;
    if (criteria.donorInternalIds?.length) count += criteria.donorInternalIds.length;
    if (criteria.donorSourceIds?.length) count += criteria.donorSourceIds.length;
    if (criteria.cultureConditions?.length) count += criteria.cultureConditions.length;
    if (criteria.researcherIds?.length) count += criteria.researcherIds.length;
    if (criteria.dateFrom) count++;
    if (criteria.dateTo) count++;

    return count;
  }
}
