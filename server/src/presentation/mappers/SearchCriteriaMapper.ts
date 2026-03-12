/**
 * Search Criteria Mapper
 *
 * Maps HTTP search filters to domain-layer TubeSearchCriteria.
 */

import { SearchFilters } from '@odysseus/shared-schemas';
import type { TubeSearchCriteria } from '@domain/types/repository';

export class SearchCriteriaMapper {
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
      sources: filters?.sources,
      lotNumbers: filters?.lotNumbers,
      donorInternalIds: filters?.donorInternalIds,
      donorSourceIds: filters?.donorSourceIds,
      cultureConditions: filters?.cultureConditions,
      researcherIds: filters?.researcherIds,
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo
    };
  }

  static countActiveFilters(criteria: TubeSearchCriteria): number {
    let count = 0;

    if (criteria.tankIds?.length) count += criteria.tankIds.length;
    if (criteria.rackIds?.length) count += criteria.rackIds.length;
    if (criteria.boxIds?.length) count += criteria.boxIds.length;
    if (criteria.cellTypes?.length) count += criteria.cellTypes.length;
    if (criteria.species?.length) count += criteria.species.length;
    if (criteria.sources?.length) count += criteria.sources.length;
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
