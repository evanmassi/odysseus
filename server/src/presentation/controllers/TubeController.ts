import { Request, Response } from 'express';
import { TubeApplicationService } from '@application/services/TubeApplicationService';
import { CreateTubeRequest, UpdateTubeRequest, BulkUpdateRequest, TubeSearchRequest } from '@application/dto/TubeDto';
import { ErrorDto } from '@application/dto/ErrorDto';
import { handleControllerError } from '@presentation/utilities/ErrorHandler';
import { logger } from '@utils/logger';
import type { User } from '@domain/entities/User';

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
        const result = await this.tubeApplicationService.createTubes(createRequests, authenticatedUser);

        logger.debug('Bulk tubes created', {
          created: result.created.length,
          failed: result.failed.length,
          user: req.user?.username,
          requestId: req.requestId
        });

        // Use 207 Multi-Status for partial success, 201 for full success
        const statusCode = result.success ? 201 : 207;
        res.status(statusCode).json(ErrorDto.success({
          success: result.success,
          created: result.created,
          failed: result.failed
        }));
      } else {
        // Single creation - CreateTubeRequest object
        const createRequest: CreateTubeRequest = req.body;
        const tube = await this.tubeApplicationService.createTube(createRequest, authenticatedUser);

        logger.debug('Tube created', {
          tubeId: tube.id,
          location: `${tube.location.tankId}-${tube.location.rackId}-${tube.location.boxId}-${tube.location.position}`,
          user: req.user?.username,
          requestId: req.requestId
        });

        res.status(201).json(ErrorDto.success(tube));
      }
    } catch (error) {
      handleControllerError(error, res, 'Failed to create tube(s)', req.requestId);
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
      handleControllerError(error, res, 'Failed to get tube', req.requestId);
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
      handleControllerError(error, res, 'Failed to get tubes', req.requestId);
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
      
      logger.debug('Tube updated', {
        tubeId: tube.id,
        user: req.user?.username,
        requestId: req.requestId
      });
      
      res.json(ErrorDto.success(tube));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update tube', req.requestId);
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
      
      logger.debug('Tube deleted', {
        tubeId: id,
        user: req.user?.username,
        requestId: req.requestId
      });
      
      res.json(ErrorDto.success({ deleted: true }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete tube', req.requestId);
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
      
      logger.debug('Bulk tube update completed', {
        updated: result.updated,
        failed: result.failed.length,
        user: req.user?.username,
        requestId: req.requestId
      });
      
      res.json(ErrorDto.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk update tubes', req.requestId);
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
      handleControllerError(error, res, 'Failed to get tubes by location', req.requestId);
    }
  }

  /**
   * Get tubes by rack and box
   * GET /api/tubes/rack/:rackId/box/:boxId
   * @deprecated Use /location endpoint instead
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
      handleControllerError(error, res, 'Failed to get tubes by location', req.requestId);
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
      handleControllerError(error, res, 'Failed to search tubes', req.requestId);
    }
  }

  /**
   * Get tube statistics
   * GET /api/tubes/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);

      const stats = await this.tubeApplicationService.getStats(authenticatedUser);

      res.json(ErrorDto.success(stats));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get tube statistics', req.requestId);
    }
  }

  /**
   * Helper: Extract authenticated user from OAuth 2.0 middleware
   */
  private getAuthenticatedUser(req: Request): User {
    const user = req.user;
    if (!user) {
      throw new Error('Authentication required - user not found in request context');
    }
    return user;
  }

  /** Valid sort fields for tube search */
  private static readonly VALID_SORT_FIELDS = ['createdAt', 'updatedAt', 'position', 'researcherId', 'cellType'] as const;

  /** Type guard for valid sort field values */
  private isValidSortField(value: unknown): value is TubeSearchRequest['sortBy'] {
    return typeof value === 'string' &&
      (TubeController.VALID_SORT_FIELDS as readonly string[]).includes(value);
  }

  /**
   * Helper: Parse search query parameters
   */
  private parseSearchQuery(query: Request['query']): TubeSearchRequest | undefined {
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
      sortBy: this.isValidSortField(query.sortBy) ? query.sortBy : undefined,
      sortOrder: query.sortOrder as 'asc' | 'desc'
    };
  }

}
