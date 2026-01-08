import { Request, Response } from 'express';
import { TubeApplicationService } from '@application/services/TubeApplicationService';
import { CreateTubeRequest, UpdateTubeRequest, BulkUpdateRequest, TubeSearchRequest } from '@application/dto/TubeDto';
import { ErrorDto } from '@application/dto/ErrorDto';
import { logger } from '@utils/logger';

/**
 * TubeController - HTTP request/response handling for tubes
 * 
 * Pure presentation layer - handles HTTP concerns only.
 * Delegates all business logic to application service.
 */
export class TubeController {
  constructor(private tubeApplicationService: TubeApplicationService) {}

  /**
   * Create new tube(s)
   * POST /api/tubes
   *
   * Accepts both single object and array:
   * - Single: { sample: {...}, location: {...} }
   * - Multiple: [{ sample: {...}, location: {...} }, ...]
   */
  async createTube(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);

      // Handle both single object and array
      const isArray = Array.isArray(req.body);

      if (isArray) {
        // Bulk creation - array of CreateTubeRequest
        const createRequests: CreateTubeRequest[] = req.body;
        const tubes = await this.tubeApplicationService.createTubes(createRequests, authenticatedUser);

        logger.info('Bulk tubes created', {
          count: tubes.length,
          user: req.user?.username
        });

        res.status(201).json(ErrorDto.success(tubes));
      } else {
        // Single creation - CreateTubeRequest object
        const createRequest: CreateTubeRequest = req.body;
        const tube = await this.tubeApplicationService.createTube(createRequest, authenticatedUser);

        logger.info('Tube created', {
          tubeId: tube.id,
          location: `${tube.location.tankId}-${tube.location.rackId}-${tube.location.boxId}-${tube.location.position}`,
          user: req.user?.username
        });

        res.status(201).json(ErrorDto.success(tube));
      }
    } catch (error) {
      this.handleError(error, res, 'Failed to create tube(s)');
    }
  }

  /**
   * Get tube by ID
   * GET /api/tubes/:id
   */
  async getTubeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      const tube = await this.tubeApplicationService.getTubeById(id, authenticatedUser);
      
      res.json(ErrorDto.success(tube));
    } catch (error) {
      this.handleError(error, res, 'Failed to get tube');
    }
  }

  /**
   * Get all tubes with optional filtering
   * GET /api/tubes
   */
  async getAllTubes(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const searchRequest = this.parseSearchQuery(req.query);
      
      const tubes = await this.tubeApplicationService.getAllTubes(authenticatedUser, searchRequest);
      
      res.json(ErrorDto.success(tubes));
    } catch (error) {
      this.handleError(error, res, 'Failed to get tubes');
    }
  }

  /**
   * Update tube
   * PUT /api/tubes/:id
   */
  async updateTube(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateRequest: UpdateTubeRequest = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      const tube = await this.tubeApplicationService.updateTube(id, updateRequest, authenticatedUser);
      
      logger.info('Tube updated', { 
        tubeId: tube.id, 
        user: req.user?.username 
      });
      
      res.json(ErrorDto.success(tube));
    } catch (error) {
      this.handleError(error, res, 'Failed to update tube');
    }
  }

  /**
   * Delete tube
   * DELETE /api/tubes/:id
   */
  async deleteTube(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      await this.tubeApplicationService.deleteTube(id, authenticatedUser);
      
      logger.info('Tube deleted', { 
        tubeId: id, 
        user: req.user?.username 
      });
      
      res.json(ErrorDto.success({ deleted: true }));
    } catch (error) {
      this.handleError(error, res, 'Failed to delete tube');
    }
  }

  /**
   * Bulk update tubes
   * POST /api/tubes/bulk-update
   */
  async bulkUpdateTubes(req: Request, res: Response): Promise<void> {
    try {
      const bulkRequest: BulkUpdateRequest = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      const result = await this.tubeApplicationService.bulkUpdateTubes(bulkRequest, authenticatedUser);
      
      logger.info('Bulk tube update completed', { 
        updated: result.updated, 
        failed: result.failed.length,
        user: req.user?.username 
      });
      
      res.json(ErrorDto.success(result));
    } catch (error) {
      this.handleError(error, res, 'Failed to bulk update tubes');
    }
  }

  /**
   * Get tubes by complete location
   * GET /api/tubes/location?tankId=X&rackId=Y&boxId=Z
   */
  async getTubesByLocation(req: Request, res: Response): Promise<void> {
    try {
      const { tankId, rackId, boxId } = req.query as { tankId: string, rackId: string, boxId: string };
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      const tubes = await this.tubeApplicationService.getTubesByLocation(
        tankId,
        rackId, 
        boxId, 
        authenticatedUser
      );
      
      res.json(ErrorDto.success(tubes));
    } catch (error) {
      this.handleError(error, res, 'Failed to get tubes by location');
    }
  }

  /**
   * ⚠️ LEGACY: Get tubes by rack and box (deprecated - use /location endpoint)
   * GET /api/tubes/rack/:rackId/box/:boxId
   */
  async getTubesByRackAndBox(req: Request, res: Response): Promise<void> {
    try {
      const { rackId, boxId } = req.params;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      const tubes = await this.tubeApplicationService.getTubesByRackAndBox(
        rackId, 
        boxId, 
        authenticatedUser
      );
      
      res.json(ErrorDto.success(tubes));
    } catch (error) {
      this.handleError(error, res, 'Failed to get tubes by location');
    }
  }

  /**
   * Search tubes with text query
   * GET /api/tubes/search
   */
  async searchTubes(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit, offset } = req.query;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      if (!query || typeof query !== 'string') {
        const errorResponse = ErrorDto.customError('Search query is required', 400, 'MISSING_QUERY');
        res.status(errorResponse.status).json(errorResponse.response);
        return;
      }
      
      const tubes = await this.tubeApplicationService.searchTubes(
        {
          query: query as string,
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined
        },
        authenticatedUser
      );
      
      res.json(ErrorDto.success(tubes));
    } catch (error) {
      this.handleError(error, res, 'Failed to search tubes');
    }
  }

  /**
   * Helper: Extract authenticated user from OAuth 2.0 middleware
   */
  private getAuthenticatedUser(req: Request): any {
    const user = req.user;
    if (!user) {
      throw new Error('Authentication required - user not found in request context');
    }
    return user;
  }

  /**
   * Helper: Parse search query parameters
   */
  private parseSearchQuery(query: any): TubeSearchRequest | undefined {
    if (!query || Object.keys(query).length === 0) {
      return undefined;
    }

    return {
      query: query.query as string,
      tankId: query.tankId as string,
      rackId: query.rackId as string,
      boxId: query.boxId as string,
      cellType: query.cellType as string,
      researcherId: query.researcherId as string,
      donorInternalId: query.donorInternalId as string,
      donorSourceId: query.donorSourceId as string,
      dateFrom: query.dateFrom as string,
      dateTo: query.dateTo as string,
      hasConcentration: query.hasConcentration === 'true',
      isComplete: query.isComplete === 'true',
      limit: query.limit ? parseInt(query.limit as string) : undefined,
      offset: query.offset ? parseInt(query.offset as string) : undefined,
      sortBy: query.sortBy as any,
      sortOrder: query.sortOrder as 'asc' | 'desc'
    };
  }

  /**
   * Helper: Handle errors and send appropriate HTTP response
   */
  private handleError(error: any, res: Response, defaultMessage: string): void {
    logger.error(defaultMessage, error);
    
    const errorResponse = ErrorDto.fromDomainError(error);
    res.status(errorResponse.status).json(errorResponse.response);
  }
}
