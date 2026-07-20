/**
 * Researcher Controller
 *
 * HTTP handlers for researcher profile CRUD and metadata queries.
 */

import type { CreateResearcherRequest } from '@application/dto/ResearcherDto';
import type { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
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

  /** `?visible=true` limits results to approved AND active researchers. */
  async getAllResearchers(req: Request, res: Response): Promise<void> {
    try {
      const visibleOnly = req.query.visible === 'true';
      const labId = this.extractLabId(req);

      const researchers = visibleOnly
        ? await this.deps.researcherApplicationService.getVisibleResearchers(labId)
        : await this.deps.researcherApplicationService.getAllResearchers(labId);

      res.json(ResponseBuilder.success(researchers));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researchers', req.requestId);
    }
  }

  /** Admin listing enriched with tube counts and linked user accounts. */
  async getResearchersWithMetadata(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);

      const result = await this.deps.researcherApplicationService.getResearchersWithMetadata(
        labId,
        user
      );

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researchers with metadata', req.requestId);
    }
  }

  /** Researchers without a linked user account, for the user-researcher linking UI. */
  async getUnlinkedResearchers(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);

      const result = await this.deps.researcherApplicationService.getUnlinkedResearchers(
        labId,
        user
      );

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get unlinked researchers', req.requestId);
    }
  }

  async getResearcherById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = this.getAuthenticatedUser(req);

      const researcher = await this.deps.researcherApplicationService.getResearcherById(id, user);

      res.json(ResponseBuilder.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get researcher', req.requestId);
    }
  }

  async createResearcher(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const createRequest: CreateResearcherRequest = req.body;
      const user = this.getAuthenticatedUser(req);

      const researcher = await this.deps.researcherApplicationService.createResearcher(
        labId,
        createRequest,
        user
      );

      res.status(201).json(ResponseBuilder.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create researcher', req.requestId);
    }
  }

  async deleteResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { researcherId } = req.params;
      const user = this.getAuthenticatedUser(req);

      await this.deps.researcherApplicationService.deleteResearcher(researcherId, user);

      res.json(ResponseBuilder.success({ deleted: true }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete researcher', req.requestId);
    }
  }

  async deactivateResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = this.getAuthenticatedUser(req);

      const researcher = await this.deps.researcherApplicationService.deactivateResearcher(
        id,
        user
      );

      res.json(ResponseBuilder.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to deactivate researcher', req.requestId);
    }
  }

  async activateResearcher(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = this.getAuthenticatedUser(req);

      const researcher = await this.deps.researcherApplicationService.activateResearcher(id, user);

      res.json(ResponseBuilder.success(researcher));
    } catch (error) {
      handleControllerError(error, res, 'Failed to activate researcher', req.requestId);
    }
  }
}
