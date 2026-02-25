/**
 * Lab Controller
 *
 * System admin endpoints for lab tenant management.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from './BaseController';
import { ResponseBuilder } from '@presentation/utilities/ResponseBuilder';
import type { CreateLabCommandHandler, UpdateLabCommandHandler, DeactivateLabCommandHandler } from '@application/commands/LabCommands';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import { logger } from '@utils/logger';

export class LabController extends BaseController {
  constructor(
    private createLabHandler: CreateLabCommandHandler,
    private updateLabHandler: UpdateLabCommandHandler,
    private deactivateLabHandler: DeactivateLabCommandHandler,
    private labRepository: LabRepository,
    private userRepository: UserRepository
  ) {
    super();
  }

  async listLabs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labs = await this.labRepository.findAll();

      res.status(200).json(ResponseBuilder.success({
        labs: labs.map(lab => lab.toData()),
      }));
    } catch (error) {
      next(error);
    }
  }

  async createLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { name } = req.body;

      const result = await this.createLabHandler.handle({ userId, name });

      res.status(201).json(ResponseBuilder.success(result));

      logger.info('Lab created', { labId: result.labId, createdBy: userId });
    } catch (error) {
      next(error);
    }
  }

  async updateLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = req.params.id;
      const { name } = req.body;

      await this.updateLabHandler.handle({ userId, labId, name });

      res.status(200).json(ResponseBuilder.success({ labId }));

      logger.info('Lab updated', { labId, updatedBy: userId });
    } catch (error) {
      next(error);
    }
  }

  async deactivateLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = req.params.id;

      await this.deactivateLabHandler.handle({ userId, labId });

      res.status(200).json(ResponseBuilder.success({ labId, deactivated: true }));

      logger.info('Lab deactivated', { labId, deactivatedBy: userId });
    } catch (error) {
      next(error);
    }
  }

  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [labs, allUsers] = await Promise.all([
        this.labRepository.findAll(),
        this.userRepository.findAll(),
      ]);

      const userCountsByLab = new Map<string, number>();
      for (const user of allUsers) {
        if (user.labId) {
          userCountsByLab.set(user.labId, (userCountsByLab.get(user.labId) ?? 0) + 1);
        }
      }

      const overview = labs.map(lab => ({
        ...lab.toData(),
        userCount: userCountsByLab.get(lab.id) ?? 0,
      }));

      res.status(200).json(ResponseBuilder.success({ labs: overview }));
    } catch (error) {
      next(error);
    }
  }
}
