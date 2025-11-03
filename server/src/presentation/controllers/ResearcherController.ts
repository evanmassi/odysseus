import { Request, Response } from 'express';
import { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import { CreateResearcherRequest } from '@application/dto/ResearcherDto';
import { ErrorDto } from '@application/dto/ErrorDto';
import { logger } from '@utils/logger';

/**
 * ResearcherController - HTTP request/response handling for researchers
 * 
 * Pure presentation layer - handles HTTP concerns only.
 * Delegates all business logic to application service.
 */
export class ResearcherController {
  constructor(private researcherApplicationService: ResearcherApplicationService) {}

  /**
   * Get all researchers
   * GET /api/researchers
   */
  async getAllResearchers(req: Request, res: Response): Promise<void> {
    try {
      const userApiKey = this.extractOptionalApiKey(req);

      const researchers = await this.researcherApplicationService.getAllResearchers(userApiKey);

      res.json(ErrorDto.success(researchers));
    } catch (error) {
      this.handleError(error, res, 'Failed to get researchers');
    }
  }

  /**
   * Get all researchers with admin metadata (tube counts, linked users)
   * GET /admin/researchers
   * Admin-only endpoint for researcher management
   */
  async getResearchersWithMetadata(req: Request, res: Response): Promise<void> {
    try {
      const userApiKey = this.extractApiKey(req);

      const researchers = await this.researcherApplicationService.getResearchersWithMetadata(userApiKey);

      logger.info('Retrieved researchers with metadata', {
        count: researchers.length,
        requestedBy: (req as any).user?.username
      });

      res.json(ErrorDto.success({ researchers }));
    } catch (error) {
      this.handleError(error, res, 'Failed to get researchers with metadata');
    }
  }

  /**
   * Get unlinked researchers (not associated with any user account)
   * GET /admin/researchers/unlinked
   * Admin-only endpoint for user-researcher linking interface
   */
  async getUnlinkedResearchers(req: Request, res: Response): Promise<void> {
    try {
      const userApiKey = this.extractApiKey(req);

      const researchers = await this.researcherApplicationService.getUnlinkedResearchers(userApiKey);

      logger.info('Retrieved unlinked researchers', {
        count: researchers.length,
        requestedBy: (req as any).user?.username
      });

      res.json(ErrorDto.success({ researchers }));
    } catch (error) {
      this.handleError(error, res, 'Failed to get unlinked researchers');
    }
  }

  /**
   * Get researcher by ID
   * GET /api/researchers/:id
   */
  async getResearcherById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userApiKey = this.extractOptionalApiKey(req);

      const researcher = await this.researcherApplicationService.getResearcherById(id, userApiKey);

      res.json(ErrorDto.success(researcher));
    } catch (error) {
      this.handleError(error, res, 'Failed to get researcher');
    }
  }

  /**
   * Create new researcher
   * POST /api/researchers
   */
  async createResearcher(req: Request, res: Response): Promise<void> {
    try {
      const createRequest: CreateResearcherRequest = req.body;
      const userApiKey = this.extractApiKey(req);
      
      const researcher = await this.researcherApplicationService.createResearcher(createRequest, userApiKey);
      
      logger.info('Researcher created', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        user: (req as any).user?.username
      });
      
      res.status(201).json(ErrorDto.success(researcher));
    } catch (error) {
      this.handleError(error, res, 'Failed to create researcher');
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
      
      logger.info('Researcher updated', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        active: researcher.active,
        user: (req as any).user?.username
      });
      
      res.json(ErrorDto.success(researcher));
    } catch (error) {
      this.handleError(error, res, 'Failed to update researcher');
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

      logger.info('Researcher deleted', {
        researcherId: researcherId,
        user: (req as any).user?.username
      });
      
      res.json(ErrorDto.success({ deleted: true }));
    } catch (error) {
      this.handleError(error, res, 'Failed to delete researcher');
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
      
      logger.info('Researcher deactivated', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        user: (req as any).user?.username
      });
      
      res.json(ErrorDto.success(researcher));
    } catch (error) {
      this.handleError(error, res, 'Failed to deactivate researcher');
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
      
      logger.info('Researcher activated', {
        researcherId: researcher.id,
        name: `${researcher.firstName} ${researcher.lastName}`,
        user: (req as any).user?.username
      });
      
      res.json(ErrorDto.success(researcher));
    } catch (error) {
      this.handleError(error, res, 'Failed to activate researcher');
    }
  }

  /**
   * Get researcher statistics
   * GET /api/researchers/stats
   */
  async getResearcherStats(req: Request, res: Response): Promise<void> {
    try {
      const userApiKey = this.extractApiKey(req);
      
      const stats = await this.researcherApplicationService.getResearcherStats(userApiKey);
      
      res.json(ErrorDto.success(stats));
    } catch (error) {
      this.handleError(error, res, 'Failed to get researcher stats');
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

      const researchers = await this.researcherApplicationService.searchResearchers(query, userApiKey);

      res.json(ErrorDto.success(researchers));
    } catch (error) {
      this.handleError(error, res, 'Failed to search researchers');
    }
  }

  /**
   * Get tube count for a researcher
   * GET /api/researchers/:id/tubes/count
   */
  async getResearcherTubeCount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userApiKey = this.extractOptionalApiKey(req);

      const result = await this.researcherApplicationService.getResearcherTubeCount(id, userApiKey);

      res.json(ErrorDto.success(result));
    } catch (error) {
      this.handleError(error, res, 'Failed to get researcher tube count');
    }
  }

  /**
   * Helper: Extract API key from request (required)
   */
  private extractApiKey(req: Request): string {
    const user = (req as any).user;
    if (!user?.apiKey) {
      throw new Error('Authentication required');
    }
    return user.apiKey;
  }

  /**
   * Helper: Extract API key from request (optional)
   */
  private extractOptionalApiKey(req: Request): string | undefined {
    const user = (req as any).user;
    return user?.apiKey;
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
