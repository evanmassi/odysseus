/**
 * Researcher Controller
 *
 * HTTP handlers for researcher profile CRUD and metadata queries.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';


import type { CreateResearcherRequest } from '@application/dto/ResearcherDto';
import type { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';
export interface ResearcherControllerDeps {
  researcherApplicationService: ResearcherApplicationService;
}

export class ResearcherController extends BaseController {
  constructor(private deps: ResearcherControllerDeps) {
    super();
  }

  /**
   * GET /api/researchers
   * GET /api/researchers?admin=true (includes tubeCount, linkedUserId, linkedUsername)
   * GET /api/researchers?visible=true (only approved AND active)
   */
  async getAllResearchers(req: Request, res: Response): Promise<void> {
    try {
      const includeAdminData = req.query.admin === 'true';
      const visibleOnly = req.query.visible === 'true';

      const labId = this.extractLabId(req);

      if (includeAdminData) {
        const userApiKey = this.extractApiKey(req);
        const result = await this.deps.researcherApplicationService.getResearchersWithMetadata(labId, userApiKey);
        res.json(ResponseBuilder.success(result));
      } else if (visibleOnly) {
        const researchers = await this.deps.researcherApplicationService.getVisibleResearchers(labId);
        res.json(ResponseBuilder.success(researchers));
      } else {
        const researchers = await this.deps.researcherApplicationService.getAllResearchers(labId);
        res.json(ResponseBuilder.success(researchers));
      }
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researchers', req.requestId);
    }
  }

  /** GET /api/admin/researchers (tube counts, linked users) */
  async getResearchersWithMetadata(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const userApiKey = this.extractApiKey(req);

      const result = await this.deps.researcherApplicationService.getResearchersWithMetadata(labId, userApiKey);

      logger.debug('Retrieved researchers with metadata', {
        count: result.researchers.length,
        requestedBy: req.user?.username,
        requestId: req.requestId
      });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researchers with metadata', req.requestId);
    }
  }

  /** GET /api/admin/researchers/unlinked (for user-researcher linking UI) */
  async getUnlinkedResearchers(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const userApiKey = this.extractApiKey(req);

      const result = await this.deps.researcherApplicationService.getUnlinkedResearchers(labId, userApiKey);

      logger.debug('Retrieved unlinked researchers', {
        count: result.researchers.length,
        requestedBy: req.user?.username,
        requestId: req.requestId
      });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get unlinked researchers', req.requestId);
    }
  }

  /** GET /api/researchers/:id */
  async getResearcherById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userApiKey = this.extractApiKey(req);

      const researcher = await this.deps.researcherApplicationService.getResearcherById(id, userApiKey);

      res.json(ResponseBuilder.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researcher', req.requestId);
    }
  }

  /** POST /api/researchers */
  async createResearcher(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const createRequest: CreateResearcherRequest = req.body;
      const userApiKey = this.extractApiKey(req);

      const researcher = await this.deps.researcherApplicationService.createResearcher(labId, createRequest, userApiKey);

      logger.debug('Researcher created', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.status(201).json(ResponseBuilder.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create researcher', req.requestId);
    }
  }

  /** PUT /api/researchers/:id */
  async updateResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userApiKey = this.extractApiKey(req);

      const researcher = await this.deps.researcherApplicationService.updateResearcher(id, updates, userApiKey);

      logger.debug('Researcher updated', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        active: researcher.active,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ResponseBuilder.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update researcher', req.requestId);
    }
  }

  /** DELETE /api/researchers/:id */
  async deleteResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { researcherId } = req.params;
      const userApiKey = this.extractApiKey(req);

      await this.deps.researcherApplicationService.deleteResearcher(researcherId, userApiKey);

      logger.debug('Researcher deleted', {
        researcherId,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ResponseBuilder.success({ deleted: true }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete researcher', req.requestId);
    }
  }

  /** PUT /api/researchers/:id/deactivate */
  async deactivateResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userApiKey = this.extractApiKey(req);

      const researcher = await this.deps.researcherApplicationService.deactivateResearcher(id, userApiKey);

      logger.debug('Researcher deactivated', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ResponseBuilder.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to deactivate researcher', req.requestId);
    }
  }

  /** PUT /api/researchers/:id/activate */
  async activateResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userApiKey = this.extractApiKey(req);

      const researcher = await this.deps.researcherApplicationService.activateResearcher(id, userApiKey);

      logger.debug('Researcher activated', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ResponseBuilder.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to activate researcher', req.requestId);
    }
  }

  /** GET /api/researchers/stats */
  async getResearcherStats(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const userApiKey = this.extractApiKey(req);

      const stats = await this.deps.researcherApplicationService.getResearcherStats(labId, userApiKey);
      
      res.json(ResponseBuilder.success(stats));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researcher stats', req.requestId);
    }
  }

  /** GET /api/researchers/search */
  async searchResearchers(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const { query } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json(ResponseBuilder.error(API_ERROR_CODES.REQUIRED_FIELD_MISSING, 'Search query is required'));
        return;
      }

      const researchers = await this.deps.researcherApplicationService.searchResearchers(labId, query);

      res.json(ResponseBuilder.success(researchers));
    } catch (error) {
      handleControllerError(error, res, 'Failed to search researchers', req.requestId);
    }
  }

  /** GET /api/researchers/:id/tubes/count */
  async getResearcherTubeCount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.deps.researcherApplicationService.getResearcherTubeCount(id);

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researcher tube count', req.requestId);
    }
  }

}
