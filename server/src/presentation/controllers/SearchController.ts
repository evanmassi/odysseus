/**
 * Search Controller
 *
 * HTTP handlers for tube search operations — advanced, quick, and field-specific.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';


import type { TubeResponse } from '@application/dto/TubeDto';
import type { TubeApplicationService } from '@application/services/TubeApplicationService';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { SearchCriteriaMapper } from '@presentation/mappers/SearchCriteriaMapper';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

interface GroupedResult {
  groupKey: string;
  groupType: string;
  tubes: TubeResponse[];
  primaryLocation: string;
  totalCount: number;
}

export interface SearchControllerDeps {
  tubeApplicationService: TubeApplicationService;
}

export class SearchController extends BaseController {
  constructor(private deps: SearchControllerDeps) {
    super();
  }

  /**
   * POST /api/search/tubes/advanced
   *
   * Returns tubes and matchedTerms for client-side highlighting.
   * matchedTerms includes synonyms and normalized query forms.
   */
  async advancedSearch(req: Request, res: Response): Promise<void> {
    try {
      const { query, filters, limit, offset, sortBy, sortOrder, groupBy } = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);

      const shouldGroup = groupBy !== 'none';

      // When grouping, fetch all matches so groups are complete — LIMIT on individual
      // tubes randomly breaks apart groups that should be whole.
      const searchCriteria = SearchCriteriaMapper.toTubeSearchCriteria(filters, {
        query: query || '',
        limit: shouldGroup ? undefined : (limit || 50),
        offset: shouldGroup ? undefined : (offset || 0),
        sortBy,
        sortOrder
      });

      logger.debug('Searching with criteria', {
        query: searchCriteria.query,
        activeFilters: SearchCriteriaMapper.countActiveFilters(searchCriteria),
        limit: searchCriteria.limit,
        offset: searchCriteria.offset,
      });

      const searchResult = await this.deps.tubeApplicationService.searchTubesWithHighlighting(
        searchCriteria,
        authenticatedUser
      );

      const { tubes, matchedTerms } = searchResult;

      const maxGroups = limit || 50;
      const grouped = shouldGroup ? this.autoGroupTubes(tubes).slice(0, maxGroups) : undefined;

      const result = {
        data: tubes,
        grouped,
        matchedTerms,
        pagination: {
          total: tubes.length,
          limit: shouldGroup ? tubes.length : (limit || 50),
          offset: shouldGroup ? 0 : (offset || 0),
          hasMore: shouldGroup ? false : tubes.length >= (limit || 50),
        },
        metadata: {
          query: query || '',
          searchTime: Date.now(),
          totalMatches: tubes.length
        }
      };

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      logger.error('Search failed:', error);
      handleControllerError(error, res, 'Failed to perform advanced search');
    }
  }

  /** GET /api/search/quick */
  async quickSearch(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit } = req.query;
      const authenticatedUser = this.getAuthenticatedUser(req);

      if (!query || typeof query !== 'string') {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.REQUIRED_FIELD_MISSING, 'Query parameter "q" is required'));
        return;
      }

      const parsedLimit = limit ? parseInt(limit as string) : 20;
      const tubes = await this.deps.tubeApplicationService.searchTubes(
        { query, limit: parsedLimit },
        authenticatedUser
      );

      res.json(this.buildSearchResponse(tubes, query, parsedLimit, 0));
    } catch (error) {
      handleControllerError(error, res, 'Failed to perform quick search');
    }
  }

  /** POST /api/search/field */
  async fieldSearch(req: Request, res: Response): Promise<void> {
    try {
      const { field, value, exact, limit = 50, offset = 0 } = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);

      const fieldQuery = exact ? `${field}:"${value}"` : `${field}:${value}`;
      const tubes = await this.deps.tubeApplicationService.searchTubes(
        { query: fieldQuery, limit, offset },
        authenticatedUser
      );

      res.json(this.buildSearchResponse(tubes, fieldQuery, limit, offset));
    } catch (error) {
      handleControllerError(error, res, 'Failed to perform field search');
    }
  }

  private buildSearchResponse(tubes: TubeResponse[], query: string, limit: number, offset: number) {
    return ResponseBuilder.success({
      data: tubes,
      pagination: {
        total: tubes.length,
        limit,
        offset,
        hasMore: tubes.length >= limit
      },
      metadata: {
        query,
        searchTime: Date.now(),
        totalMatches: tubes.length
      }
    });
  }

  /** Groups tubes by identical properties including box location */
  private autoGroupTubes(tubes: TubeResponse[]): GroupedResult[] {
    if (tubes.length === 0) {
      return [];
    }

    // Box location included so tubes in different boxes form separate groups
    const createBatchKey = (tube: TubeResponse): string => {
      return JSON.stringify({
        cellType: tube.sample?.cellType || '',
        donorInternalId: tube.sample?.donorInternalId || '',
        donorSourceId: tube.sample?.donorSourceId || '',
        lotNumber: tube.sample?.lotNumber || '',
        mediaType: tube.sample?.mediaType || '',
        cultureCondition: tube.sample?.cultureCondition || '',
        concentration: tube.sample?.concentration || '',
        concentrationUnit: tube.sample?.concentrationUnit || '',
        date: tube.sample?.date || '',
        researcherId: tube.researcherId || '',
        tankId: tube.location?.tankId || '',
        rackId: tube.location?.rackId || '',
        boxId: tube.location?.boxId || ''
      });
    };

    const groups = new Map<string, TubeResponse[]>();

    for (const tube of tubes) {
      const batchKey = createBatchKey(tube);
      if (!groups.has(batchKey)) {
        groups.set(batchKey, []);
      }
      groups.get(batchKey)!.push(tube);
    }

    const groupedResults = Array.from(groups.entries()).map(([, groupTubes]) => {
      const firstTube = groupTubes[0];

      const cellType = firstTube.sample?.cellType || 'Unknown';
      const donorInternal = firstTube.sample?.donorInternalId || '';
      const donorSource = firstTube.sample?.donorSourceId || '';
      const donorDisplay = donorInternal || donorSource || 'Unknown Donor';
      const groupKey = `${cellType} • ${donorDisplay}`;

      // Primary location = most common location in the group
      const locationCounts = new Map<string, number>();
      for (const tube of groupTubes) {
        const location = `${tube.location?.tankId}:${tube.location?.rackId}:${tube.location?.boxId}`;
        locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
      }

      const primaryLocation = Array.from(locationCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown:Unknown:Unknown';

      return {
        groupKey,
        groupType: 'batch',
        tubes: groupTubes,
        primaryLocation,
        totalCount: groupTubes.length
      };
    });

    return groupedResults.sort((a, b) => b.totalCount - a.totalCount);
  }
}
