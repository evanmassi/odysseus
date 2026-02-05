import { Request, Response } from 'express';
import { TubeApplicationService } from '@application/services/TubeApplicationService';
import { ErrorDto } from '@application/dto/ErrorDto';
import type { TubeResponse } from '@application/dto/TubeDto';
import { handleControllerError } from '@presentation/utilities/ErrorHandler';
import { logger } from '@utils/logger';
import { SearchCriteriaMapper } from '@presentation/mappers/SearchCriteriaMapper';
import { BaseController } from '@presentation/controllers/BaseController';

/** Grouped search result structure for batch display */
interface GroupedResult {
  groupKey: string;
  groupType: string;
  tubes: TubeResponse[];
  primaryLocation: string;
  totalCount: number;
}

/**
 * SearchController - HTTP request/response handling for search operations
 * 
 * Pure presentation layer - handles HTTP concerns only.
 * Delegates all business logic to existing application services.
 */
export class SearchController extends BaseController {
  constructor(private tubeApplicationService: TubeApplicationService) {
    super();
  }

  /**
   * Advanced tube search with filters
   * POST /api/search/tubes/advanced
   *
   * Returns tubes AND matchedTerms for client-side highlighting.
   * matchedTerms includes synonyms and normalized query forms.
   */
  async advancedSearch(req: Request, res: Response): Promise<void> {
    try {
      logger.debug('[SearchController] Received search request');

      const { query, filters, limit, offset, sortBy, sortOrder, groupBy } = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);

      // Map request filters to domain criteria using mapper
      const searchCriteria = SearchCriteriaMapper.toTubeSearchCriteria(filters, {
        query: query || '',
        limit: limit || 50,
        offset: offset || 0,
        sortBy,
        sortOrder
      });

      logger.debug('[SearchController] Searching with criteria', {
        query: searchCriteria.query,
        activeFilters: SearchCriteriaMapper.countActiveFilters(searchCriteria),
        limit: searchCriteria.limit,
        offset: searchCriteria.offset,
      });

      // Use enhanced search that returns matchedTerms for highlighting
      const searchResult = await this.tubeApplicationService.searchTubesWithHighlighting(
        searchCriteria,
        authenticatedUser
      );

      const { tubes, matchedTerms } = searchResult;

      logger.info(`[SearchController] Found ${tubes.length} tubes, ${matchedTerms.length} matched terms`);

      // Determine if we should group results (progressive enhancement)
      const shouldGroup = groupBy !== 'none';
      const grouped = shouldGroup ? this.autoGroupTubes(tubes, groupBy) : undefined;

      logger.debug(`[SearchController] Grouping: ${shouldGroup ? `enabled (${grouped?.length} groups)` : 'disabled'}`);

      // Transform to SearchResultSchema format (with optional grouped field and matchedTerms)
      const result = {
        data: tubes,
        grouped: grouped, // Optional - progressive enhancement for server-side grouping
        matchedTerms: matchedTerms, // Terms for client-side highlighting
        pagination: {
          total: tubes.length,
          limit: limit || 50,
          offset: offset || 0,
          hasMore: tubes.length >= (limit || 50)
        },
        metadata: {
          query: query || '',
          searchTime: Date.now(),
          totalMatches: tubes.length
        }
      };

      logger.debug('[SearchController] Sending response', {
        tubeCount: tubes.length,
        groupCount: grouped?.length || 0,
        matchedTermsCount: matchedTerms.length
      });

      // Wrap in standard success envelope (all API responses use this format)
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('❌ [SearchController] Search failed:', error);
      handleControllerError(error, res, 'Failed to perform advanced search');
    }
  }

  /**
   * Quick search
   * GET /api/search/quick
   */
  async quickSearch(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit } = req.query;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      if (!query || typeof query !== 'string') {
        const errorResponse = ErrorDto.customError('Query parameter "q" is required', 400, 'MISSING_QUERY');
        res.status(errorResponse.status).json(errorResponse.response);
        return;
      }
      
      const tubes = await this.tubeApplicationService.searchTubes(
        {
          query: query as string,
          limit: limit ? parseInt(limit as string) : 20
        },
        authenticatedUser
      );
      
      const result = {
        success: true,
        data: tubes,
        pagination: {
          total: tubes.length,
          limit: limit ? parseInt(limit as string) : 20,
          offset: 0,
          hasMore: false
        },
        metadata: {
          query,
          searchTime: Date.now(),
          totalMatches: tubes.length
        }
      };
      
      res.json(result);
    } catch (error) {
      handleControllerError(error, res, 'Failed to perform quick search');
    }
  }

  /**
   * Field-specific search
   * POST /api/search/field
   */
  async fieldSearch(req: Request, res: Response): Promise<void> {
    try {
      const { field, value, exact, limit, offset } = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      // Use existing search with field-specific query
      const fieldQuery = exact ? `${field}:"${value}"` : `${field}:${value}`;
      const tubes = await this.tubeApplicationService.searchTubes(
        {
          query: fieldQuery,
          limit: limit || 50,
          offset: offset || 0
        },
        authenticatedUser
      );
      
      const result = {
        success: true,
        data: tubes,
        pagination: {
          total: tubes.length,
          limit: limit || 50,
          offset: offset || 0,
          hasMore: tubes.length >= (limit || 50)
        },
        metadata: {
          query: fieldQuery,
          searchTime: Date.now(),
          totalMatches: tubes.length
        }
      };
      
      res.json(result);
    } catch (error) {
      handleControllerError(error, res, 'Failed to perform field search');
    }
  }

  /**
   * Get search suggestions
   * GET /api/search/suggestions
   */
  async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, field } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.json({ success: true, suggestions: [] });
        return;
      }
      
      // Simple suggestions based on query length
      const suggestions: string[] = [];
      if (query.length >= 2) {
        // Basic suggestions - could be enhanced with actual data analysis
        suggestions.push(
          `${query}*`,
          `*${query}*`,
          field ? `${field}:${query}` : query
        );
      }
      
      res.json({ success: true, suggestions });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get search suggestions');
    }
  }

  /**
   * Get saved searches (placeholder)
   * GET /api/search/saved
   */
  async getSavedSearches(req: Request, res: Response): Promise<void> {
    try {
      // Placeholder - return empty array until saved search feature is implemented
      res.json({ 
        success: true, 
        searches: [] 
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get saved searches');
    }
  }

  /**
   * Save search (placeholder)
   * POST /api/search/save
   */
  async saveSearch(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);

      // Demo users cannot save searches
      if (authenticatedUser.isDemo) {
        res.status(403).json({ success: false, error: 'Saving searches is not available in demo mode' });
        return;
      }

      const { name, searchOptions } = req.body;

      // Placeholder - return success until saved search feature is implemented
      res.json({
        success: true,
        searchId: `search_${Date.now()}`
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to save search');
    }
  }

  /**
   * Delete saved search (placeholder)
   * DELETE /api/search/saved/:id
   */
  async deleteSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const { searchId } = req.params;
      
      // Placeholder - return success until saved search feature is implemented
      res.json({ success: true });
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete saved search');
    }
  }

  /**
   * Get filter options
   * GET /api/search/filter-options
   */
  async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      // Get all tubes to extract filter options
      const tubes = await this.tubeApplicationService.searchTubes({ limit: 1000 }, authenticatedUser);
      
      // Extract unique values for filters
      const cellTypes = [...new Set(tubes.map(t => t.sample?.cellType).filter(Boolean))];
      const researchers = [...new Set(tubes.map(t => t.researcherId).filter(Boolean))];
      const mediaTypes = [...new Set(tubes.map(t => t.sample?.media).filter(Boolean))];
      const cultureConditions = [...new Set(tubes.map(t => t.sample?.cultureCondition).filter(Boolean))];
      const rackIds = [...new Set(tubes.map(t => t.location?.rackId).filter(Boolean))];
      const boxIds = [...new Set(tubes.map(t => t.location?.boxId).filter(Boolean))];
      
      res.json({
        success: true,
        options: {
          cellTypes,
          researchers,
          mediaTypes,
          cultureConditions,
          rackIds,
          boxIds
        }
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get filter options');
    }
  }

  /**
   * Batch grouping: Group tubes that are identical in all properties
   * Tubes are grouped by box - each box gets its own group
   */
  private autoGroupTubes(tubes: TubeResponse[], explicitGroupBy?: string): GroupedResult[] {
    if (tubes.length === 0) {
      return [];
    }

    // Create batch key from all tube properties INCLUDING box location
    // This ensures tubes in different boxes are in separate groups
    const createBatchKey = (tube: TubeResponse): string => {
      return JSON.stringify({
        cellType: tube.sample?.cellType || '',
        donorInternalId: tube.sample?.donorInternalId || '',
        donorSourceId: tube.sample?.donorSourceId || '',
        lotNumber: tube.sample?.lotNumber || '',
        mediaType: tube.sample?.media?.type || '', // Only compare media type, not supplements/selection
        cultureCondition: tube.sample?.cultureCondition || '',
        concentration: tube.sample?.concentration || '',
        concentrationUnit: tube.sample?.concentrationUnit || '',
        date: tube.sample?.date || '',
        researcherId: tube.researcherId || '',
        // Include box location so tubes in different boxes are separate groups
        tankId: tube.location?.tankId || '',
        rackId: tube.location?.rackId || '',
        boxId: tube.location?.boxId || ''
      });
    };

    // Group tubes by batch key
    const groups = new Map<string, TubeResponse[]>();

    for (const tube of tubes) {
      const batchKey = createBatchKey(tube);

      if (!groups.has(batchKey)) {
        groups.set(batchKey, []);
      }
      groups.get(batchKey)!.push(tube);
    }

    // Transform to GroupedResult format
    const groupedResults = Array.from(groups.entries()).map(([batchKey, groupTubes]) => {
      const firstTube = groupTubes[0];

      // Create human-readable group key from cell type and donor info
      const cellType = firstTube.sample?.cellType || 'Unknown';
      const donorInternal = firstTube.sample?.donorInternalId || '';
      const donorSource = firstTube.sample?.donorSourceId || '';
      const donorDisplay = donorInternal || donorSource || 'Unknown Donor';

      const groupKey = `${cellType} • ${donorDisplay}`;

      // Find primary location (most common location in the group)
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

    // Sort groups by count (descending)
    return groupedResults.sort((a, b) => b.totalCount - a.totalCount);
  }

}
