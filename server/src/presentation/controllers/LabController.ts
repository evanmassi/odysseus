/**
 * Lab Controller
 *
 * System admin endpoints for lab tenant management.
 */

import type { UpdateDemoLimitsCommandHandler } from '@application/commands/DemoSeedCommands';
import type {
  CreateLabCommandHandler,
  UpdateLabCommandHandler,
  DeactivateLabCommandHandler,
  ActivateLabCommandHandler,
} from '@application/commands/LabCommands';
import type { LabApplicationService } from '@application/services/LabApplicationService';
import { logger } from '@infrastructure/logging/logger';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import { BaseController } from './BaseController';

import type { Request, Response } from 'express';

export interface LabControllerDeps {
  createLabHandler: CreateLabCommandHandler;
  updateLabHandler: UpdateLabCommandHandler;
  deactivateLabHandler: DeactivateLabCommandHandler;
  activateLabHandler: ActivateLabCommandHandler;
  updateDemoLimitsHandler: UpdateDemoLimitsCommandHandler;
  labApplicationService: LabApplicationService;
}

export class LabController extends BaseController {
  constructor(private deps: LabControllerDeps) {
    super();
  }

  async listLabs(req: Request, res: Response): Promise<void> {
    try {
      const labs = await this.deps.labApplicationService.listLabs();
      res.status(200).json(ResponseBuilder.success({ labs }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list labs', req.requestId);
    }
  }

  async createLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { name, isDemo } = req.body;

      const lab = await this.deps.createLabHandler.handle({ userId, name, isDemo });

      res.status(201).json(ResponseBuilder.success({ lab: lab.toData() }));

      logger.info('Lab created', { labId: lab.id, createdBy: userId });
    } catch (error) {
      handleControllerError(error, res, 'Failed to create lab', req.requestId);
    }
  }

  async updateLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = req.params.id;
      const { name } = req.body;

      const lab = await this.deps.updateLabHandler.handle({ userId, labId, name });

      res.status(200).json(ResponseBuilder.success({ lab: lab.toData() }));

      logger.info('Lab updated', { labId, updatedBy: userId });
    } catch (error) {
      handleControllerError(error, res, 'Failed to update lab', req.requestId);
    }
  }

  async deactivateLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = req.params.id;

      await this.deps.deactivateLabHandler.handle({ userId, labId });

      res.status(200).json(ResponseBuilder.success({ labId, deactivated: true }));

      logger.info('Lab deactivated', { labId, deactivatedBy: userId });
    } catch (error) {
      handleControllerError(error, res, 'Failed to deactivate lab', req.requestId);
    }
  }

  async getLabDetails(req: Request, res: Response): Promise<void> {
    try {
      const details = await this.deps.labApplicationService.getLabDetails(req.params.labId);
      res.status(200).json(ResponseBuilder.success(details));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get lab details', req.requestId);
    }
  }

  async activateLab(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = req.params.id;

      await this.deps.activateLabHandler.handle({ userId, labId });

      res.status(200).json(ResponseBuilder.success({ labId, activated: true }));

      logger.info('Lab activated', { labId, activatedBy: userId });
    } catch (error) {
      handleControllerError(error, res, 'Failed to activate lab', req.requestId);
    }
  }

  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await this.deps.labApplicationService.getOverview();
      res.status(200).json(ResponseBuilder.success(overview));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get overview', req.requestId);
    }
  }

  async getDemoLimits(req: Request, res: Response): Promise<void> {
    try {
      const demoLimits = await this.deps.labApplicationService.getDemoLimits(req.params.labId);
      res.status(200).json(ResponseBuilder.success(demoLimits));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get demo limits', req.requestId);
    }
  }

  async updateDemoLimits(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = req.params.labId;

      const limits = await this.deps.updateDemoLimitsHandler.handle({
        userId,
        labId,
        limits: req.body,
      });

      res.status(200).json(ResponseBuilder.success({ limits }));

      logger.info('Demo limits updated', { labId, updatedBy: userId });
    } catch (error) {
      handleControllerError(error, res, 'Failed to update demo limits', req.requestId);
    }
  }
}
