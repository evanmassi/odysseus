import { SearchFilters } from '@odysseus/shared-schemas';
import type { TubeSearchCriteria } from '@domain/types/repository';

/**
 * SearchCriteriaMapper
 *
 * Maps presentation layer filters (SearchFilters from HTTP request)
 * to domain layer criteria (TubeSearchCriteria for repository).
 *
 * Centralized here to prevent duplication across controllers.
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
    const validSortFields = ['createdAt', 'updatedAt', 'position', 'researcherId', 'cellType'] as const;
    const sortBy = baseOptions?.sortBy && (validSortFields as readonly string[]).includes(baseOptions.sortBy)
      ? (baseOptions.sortBy as TubeSearchCriteria['sortBy'])
      : undefined;

    return {
      query: baseOptions?.query,
      limit: baseOptions?.limit,
      offset: baseOptions?.offset,
      sortBy,
      sortOrder: baseOptions?.sortOrder,
      tankIds: filters?.tankIds,
      rackIds: filters?.rackIds,
      boxIds: filters?.boxIds,
      positionLabel: filters?.positionLabel,
      cellTypes: filters?.cellTypes,
      species: filters?.species,
      vendors: filters?.vendors,
      lotNumbers: filters?.lotNumbers,
      donorInternalIds: filters?.donorInternalIds,
      donorSourceIds: filters?.donorSourceIds,
      cultureConditions: filters?.cultureConditions,
      researcherIds: filters?.researcherIds,
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
      species: criteria.species,
      vendors: criteria.vendors,
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
    if (criteria.species?.length) count += criteria.species.length;
    if (criteria.vendors?.length) count += criteria.vendors.length;
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
