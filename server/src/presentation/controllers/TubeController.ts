/**
 * Tube Management Controller
 *
 * HTTP handlers for tube CRUD, bulk operations, location queries, and search.
 */

import type { TubeFilterableField } from '@odysseus/shared-schemas';

import type { CreateTubeRequest, UpdateTubeRequest, BulkUpdateRequest } from '@application/dto/TubeDto';
import type { TubeApplicationService } from '@application/services/TubeApplicationService';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';
export interface TubeControllerDeps {
  tubeApplicationService: TubeApplicationService;
}

export class TubeController extends BaseController {
  constructor(private deps: TubeControllerDeps) {
    super();
  }

  /**
   * POST /api/tubes
   *
   * Accepts both single object and array:
   * - Single: { sample: {...}, location: {...} }
   * - Multiple: [{ sample: {...}, location: {...} }, ...]
   */
  async createTube(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const isArray = Array.isArray(req.body);

      if (isArray) {
        const createRequests: CreateTubeRequest[] = req.body;
        const result = await this.deps.tubeApplicationService.createTubes(createRequests, authenticatedUser);

        logger.debug('Bulk tubes created', {
          created: result.created.length,
          failed: result.failed.length,
          user: req.user?.username,
          requestId: req.requestId
        });

        // Use 207 Multi-Status for partial success, 201 for full success
        const statusCode = result.failed.length === 0 ? 201 : 207;
        res.status(statusCode).json(ResponseBuilder.success({
          created: result.created,
          failed: result.failed
        }));
      } else {
        const createRequest: CreateTubeRequest = req.body;
        const tube = await this.deps.tubeApplicationService.createTube(createRequest, authenticatedUser);

        logger.debug('Tube created', {
          tubeId: tube.id,
          location: `${tube.location.tankId}-${tube.location.rackId}-${tube.location.boxId}-${tube.location.position}`,
          user: req.user?.username,
          requestId: req.requestId
        });

        res.status(201).json(ResponseBuilder.success(tube));
      }
    } catch (error) {
      handleControllerError(error, res, 'Failed to create tube(s)', req.requestId);
    }
  }

  /** GET /api/tubes/:id */
  async getTubeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      const tube = await this.deps.tubeApplicationService.getTubeById(id, authenticatedUser);
      
      res.json(ResponseBuilder.success(tube));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get tube', req.requestId);
    }
  }

  /** PUT /api/tubes/:id */
  async updateTube(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateRequest: UpdateTubeRequest = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      const tube = await this.deps.tubeApplicationService.updateTube(id, updateRequest, authenticatedUser);
      
      logger.debug('Tube updated', {
        tubeId: tube.id,
        user: req.user?.username,
        requestId: req.requestId
      });
      
      res.json(ResponseBuilder.success(tube));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update tube', req.requestId);
    }
  }

  /** DELETE /api/tubes/:id */
  async deleteTube(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      await this.deps.tubeApplicationService.deleteTube(id, authenticatedUser);
      
      logger.debug('Tube deleted', {
        tubeId: id,
        user: req.user?.username,
        requestId: req.requestId
      });
      
      res.json(ResponseBuilder.success({ deleted: true }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete tube', req.requestId);
    }
  }

  /** POST /api/tubes/bulk-update */
  async bulkUpdateTubes(req: Request, res: Response): Promise<void> {
    try {
      const bulkRequest: BulkUpdateRequest = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      const result = await this.deps.tubeApplicationService.bulkUpdateTubes(bulkRequest, authenticatedUser);
      
      logger.debug('Bulk tube update completed', {
        updated: result.updated,
        failed: result.failed.length,
        user: req.user?.username,
        requestId: req.requestId
      });
      
      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk update tubes', req.requestId);
    }
  }

  /** POST /api/tubes/bulk-delete */
  async bulkDeleteTubes(req: Request, res: Response): Promise<void> {
    try {
      const { tubeIds } = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);

      const result = await this.deps.tubeApplicationService.bulkDeleteTubes(tubeIds, authenticatedUser);

      logger.debug('Bulk tube delete completed', {
        deleted: result.deleted.length,
        failed: result.failed.length,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk delete tubes', req.requestId);
    }
  }

  /** POST /api/tubes/bulk-move */
  async bulkMoveTubes(req: Request, res: Response): Promise<void> {
    try {
      const { moves } = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);

      const result = await this.deps.tubeApplicationService.moveTubes(moves, authenticatedUser);

      logger.debug('Bulk tube move completed', {
        moved: result.moved.length,
        failed: result.failed.length,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk move tubes', req.requestId);
    }
  }

  /** POST /api/tubes/bulk-fetch */
  async bulkFetchTubes(req: Request, res: Response): Promise<void> {
    try {
      const { tubeIds } = req.body;
      const authenticatedUser = this.getAuthenticatedUser(req);

      const tubes = await this.deps.tubeApplicationService.getTubesByIds(tubeIds, authenticatedUser);

      res.json(ResponseBuilder.success(tubes));
    } catch (error) {
      handleControllerError(error, res, 'Failed to bulk fetch tubes', req.requestId);
    }
  }

  /** GET /api/tubes/location?tankId=X&rackId=Y&boxId=Z */
  async getTubesByLocation(req: Request, res: Response): Promise<void> {
    try {
      const { tankId, rackId, boxId } = req.query as { tankId: string, rackId: string, boxId: string };
      const authenticatedUser = this.getAuthenticatedUser(req);
      
      const tubes = await this.deps.tubeApplicationService.getTubesByLocation(
        tankId,
        rackId, 
        boxId, 
        authenticatedUser
      );
      
      res.json(ResponseBuilder.success(tubes));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get tubes by location', req.requestId);
    }
  }

  /** GET /api/tubes/by-rack?tankId=X&rackId=Y */
  async getTubesByRack(req: Request, res: Response): Promise<void> {
    try {
      const { tankId, rackId } = req.query as { tankId: string; rackId: string };
      const authenticatedUser = this.getAuthenticatedUser(req);

      const tubes = await this.deps.tubeApplicationService.getTubesByRack(tankId, rackId, authenticatedUser);

      res.json(ResponseBuilder.success(tubes));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get tubes by rack', req.requestId);
    }
  }

  /** GET /api/tubes/location-counts */
  async getLocationCounts(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);

      const counts = await this.deps.tubeApplicationService.getLocationCounts(authenticatedUser);

      res.json(ResponseBuilder.success(counts));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get tube location counts', req.requestId);
    }
  }

  /** GET /api/tubes/filter-options?fields=tankId,cellType,... */
  async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const labId = this.extractLabId(req);
      const fields = (req.query.fields as unknown) as TubeFilterableField[];

      const options = await this.deps.tubeApplicationService.getFilterOptions(labId, fields, authenticatedUser);

      res.json(ResponseBuilder.success(options));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get tube filter options', req.requestId);
    }
  }

  /** GET /api/tubes/stats */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);

      const stats = await this.deps.tubeApplicationService.getStats(authenticatedUser);

      res.json(ResponseBuilder.success(stats));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get tube statistics', req.requestId);
    }
  }

}
