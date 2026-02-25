import { Request, Response } from 'express';
import { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import { CreateResearcherRequest } from '@application/dto/ResearcherDto';
import { ErrorDto } from '@application/dto/ErrorDto';
import { handleControllerError } from '@presentation/utilities/ErrorHandler';
import { logger } from '@utils/logger';
import { BaseController } from '@presentation/controllers/BaseController';

/**
 * ResearcherController - HTTP request/response handling for researchers
 * 
 * Pure presentation layer - handles HTTP concerns only.
 * Delegates all business logic to application service.
 */
export class ResearcherController extends BaseController {
  constructor(private researcherApplicationService: ResearcherApplicationService) {
    super();
  }

  /**
   * Get all researchers
   * GET /api/researchers
   * GET /api/researchers?admin=true (includes metadata: tubeCount, linkedUserId, linkedUsername)
   * GET /api/researchers?visible=true (only approved AND active - for dropdowns)
   */
  async getAllResearchers(req: Request, res: Response): Promise<void> {
    try {
      const includeAdminData = req.query.admin === 'true';
      const visibleOnly = req.query.visible === 'true';

      const labId = this.extractLabId(req);

      if (includeAdminData) {
        // Admin data requires authentication
        const userApiKey = this.extractApiKey(req);
        // Returns AdminResearcher[] with metadata
        const researchers = await this.researcherApplicationService.getResearchersWithMetadata(labId, userApiKey);
        res.json(ErrorDto.success({ researchers }));
      } else if (visibleOnly) {
        // Only approved+active researchers (for dropdowns)
        const userApiKey = this.extractOptionalApiKey(req);
        const researchers = await this.researcherApplicationService.getVisibleResearchers(labId, userApiKey);
        res.json(ErrorDto.success(researchers));
      } else {
        // Basic data can be accessed with optional auth
        const userApiKey = this.extractOptionalApiKey(req);
        // Returns Researcher[] without metadata
        const researchers = await this.researcherApplicationService.getAllResearchers(labId, userApiKey);
        res.json(ErrorDto.success(researchers));
      }
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researchers', req.requestId);
    }
  }

  /**
   * Get all researchers with admin metadata (tube counts, linked users)
   * GET /admin/researchers
   * Admin-only endpoint for researcher management
   */
  async getResearchersWithMetadata(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const userApiKey = this.extractApiKey(req);

      const researchers = await this.researcherApplicationService.getResearchersWithMetadata(labId, userApiKey);

      logger.debug('Retrieved researchers with metadata', {
        count: researchers.length,
        requestedBy: req.user?.username,
        requestId: req.requestId
      });

      res.json(ErrorDto.success({ researchers }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researchers with metadata', req.requestId);
    }
  }

  /**
   * Get unlinked researchers (not associated with any user account)
   * GET /admin/researchers/unlinked
   * Admin-only endpoint for user-researcher linking interface
   */
  async getUnlinkedResearchers(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const userApiKey = this.extractApiKey(req);

      const researchers = await this.researcherApplicationService.getUnlinkedResearchers(labId, userApiKey);

      logger.debug('Retrieved unlinked researchers', {
        count: researchers.length,
        requestedBy: req.user?.username,
        requestId: req.requestId
      });

      res.json(ErrorDto.success({ researchers }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get unlinked researchers', req.requestId);
    }
  }

  /**
   * Get researcher by ID
   * GET /api/researchers/:id
   */
  async getResearcherById(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const { id } = req.params;
      const userApiKey = this.extractOptionalApiKey(req);

      const researcher = await this.researcherApplicationService.getResearcherById(labId, id, userApiKey);

      res.json(ErrorDto.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researcher', req.requestId);
    }
  }

  /**
   * Create new researcher
   * POST /api/researchers
   */
  async createResearcher(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const createRequest: CreateResearcherRequest = req.body;
      const userApiKey = this.extractApiKey(req);

      const researcher = await this.researcherApplicationService.createResearcher(labId, createRequest, userApiKey);

      logger.debug('Researcher created', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.status(201).json(ErrorDto.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create researcher', req.requestId);
    }
  }

  /**
   * Update researcher
   * PUT /api/researchers/:id
   */
  async updateResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userApiKey = this.extractApiKey(req);

      const researcher = await this.researcherApplicationService.updateResearcher(id, updates, userApiKey);

      logger.debug('Researcher updated', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        active: researcher.active,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ErrorDto.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update researcher', req.requestId);
    }
  }

  /**
   * Delete researcher
   * DELETE /api/researchers/:id
   */
  async deleteResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { researcherId } = req.params;
      const userApiKey = this.extractApiKey(req);

      await this.researcherApplicationService.deleteResearcher(researcherId, userApiKey);

      logger.debug('Researcher deleted', {
        researcherId: researcherId,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ErrorDto.success({ deleted: true }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete researcher', req.requestId);
    }
  }

  /**
   * Deactivate researcher
   * PUT /api/researchers/:id/deactivate
   */
  async deactivateResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userApiKey = this.extractApiKey(req);

      const researcher = await this.researcherApplicationService.deactivateResearcher(id, userApiKey);

      logger.debug('Researcher deactivated', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ErrorDto.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to deactivate researcher', req.requestId);
    }
  }

  /**
   * Activate researcher
   * PUT /api/researchers/:id/activate
   */
  async activateResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userApiKey = this.extractApiKey(req);

      const researcher = await this.researcherApplicationService.activateResearcher(id, userApiKey);

      logger.debug('Researcher activated', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ErrorDto.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to activate researcher', req.requestId);
    }
  }

  /**
   * Get researcher statistics
   * GET /api/researchers/stats
   */
  async getResearcherStats(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const userApiKey = this.extractApiKey(req);

      const stats = await this.researcherApplicationService.getResearcherStats(labId, userApiKey);
      
      res.json(ErrorDto.success(stats));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researcher stats', req.requestId);
    }
  }

  /**
   * Search researchers by name
   * GET /api/researchers/search
   */
  async searchResearchers(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      const userApiKey = this.extractOptionalApiKey(req);

      if (!query || typeof query !== 'string') {
        const errorResponse = ErrorDto.customError('Search query is required', 400, 'MISSING_QUERY');
        res.status(errorResponse.status).json(errorResponse.response);
        return;
      }

      const labId = this.extractLabId(req);
      const researchers = await this.researcherApplicationService.searchResearchers(labId, query, userApiKey);

      res.json(ErrorDto.success(researchers));
    } catch (error) {
      handleControllerError(error, res, 'Failed to search researchers', req.requestId);
    }
  }

  /**
   * Get tube count for a researcher
   * GET /api/researchers/:id/tubes/count
   */
  async getResearcherTubeCount(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const { id } = req.params;
      const userApiKey = this.extractOptionalApiKey(req);

      const result = await this.researcherApplicationService.getResearcherTubeCount(labId, id, userApiKey);

      res.json(ErrorDto.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researcher tube count', req.requestId);
    }
  }

}
