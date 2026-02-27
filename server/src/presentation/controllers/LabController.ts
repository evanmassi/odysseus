/**
 * Lab Controller
 *
 * System admin endpoints for lab tenant management.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from './BaseController';
import { ResponseBuilder } from '@presentation/utilities/ResponseBuilder';
import type { CreateLabCommandHandler, UpdateLabCommandHandler, DeactivateLabCommandHandler, ActivateLabCommandHandler } from '@application/commands/LabCommands';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { logger } from '@utils/logger';

export class LabController extends BaseController {
  constructor(
    private createLabHandler: CreateLabCommandHandler,
    private updateLabHandler: UpdateLabCommandHandler,
    private deactivateLabHandler: DeactivateLabCommandHandler,
    private activateLabHandler: ActivateLabCommandHandler,
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private tubeRepository: TubeRepository,
    private configurationRepository: ConfigurationRepository,
    private researcherRepository: ResearcherRepository
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
      const lab = await this.labRepository.findById(result.labId);

      res.status(201).json(ResponseBuilder.success({ lab: lab?.toData() }));

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
      const lab = await this.labRepository.findById(labId);

      res.status(200).json(ResponseBuilder.success({ lab: lab?.toData() }));

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

  async getLabDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labId = req.params.labId;
      const lab = await this.labRepository.findById(labId);
      if (!lab) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lab not found' } });
        return;
      }

      const [users, researchers, tubeCount, config] = await Promise.all([
        this.userRepository.findByLabId(labId),
        this.researcherRepository.findByLabId(labId),
        this.tubeRepository.countByLabId(labId),
        this.configurationRepository.getForLab(labId),
      ]);

      let tankCount = 0, rackCount = 0, boxCount = 0;
      if (config) {
        const configData = config.toData();
        tankCount = configData.tanks.length;
        for (const tank of configData.tanks) {
          rackCount += tank.racks.length;
          for (const rack of tank.racks) {
            boxCount += rack.boxes.length;
          }
        }
      }

      res.status(200).json(ResponseBuilder.success({
        lab: lab.toData(),
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          role: u.roleString,
          status: u.status,
          isDemo: u.isDemo,
          lastActivity: u.lastActivity.toISOString(),
        })),
        researcherCount: researchers.length,
        tubeCount,
        storageSummary: { tankCount, rackCount, boxCount },
      }));
    } catch (error) {
      next(error);
    }
  }

  async activateLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = req.params.id;

      await this.activateLabHandler.handle({ userId, labId });

      res.status(200).json(ResponseBuilder.success({ labId, activated: true }));

      logger.info('Lab activated', { labId, activatedBy: userId });
    } catch (error) {
      next(error);
    }
  }

  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [labs, allUsers] = await Promise.all([
        this.labRepository.findAll(),
        this.userRepository.findAllWithLastActivity(),
      ]);

      const userCountsByLab = new Map<string, number>();
      for (const user of allUsers) {
        if (user.labId) {
          userCountsByLab.set(user.labId, (userCountsByLab.get(user.labId) ?? 0) + 1);
        }
      }

      const tubeCounts = await Promise.all(
        labs.map(lab => this.tubeRepository.countByLabId(lab.id))
      );

      const labStats = labs.map((lab, i) => ({
        labId: lab.id,
        labName: lab.name,
        userCount: userCountsByLab.get(lab.id) ?? 0,
        tubeCount: tubeCounts[i],
      }));

      const totalTubes = tubeCounts.reduce((sum, count) => sum + count, 0);
      const activeLabs = labs.filter(l => l.isActive).length;
      const inactiveLabs = labs.length - activeLabs;
      const pendingApprovals = allUsers.filter(u => u.isPending()).length;

      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const activeUsersLast24h = allUsers.filter(
        u => u.lastActivity && new Date(u.lastActivity).getTime() > oneDayAgo
      ).length;

      res.status(200).json(ResponseBuilder.success({
        totalLabs: labs.length,
        activeLabs,
        inactiveLabs,
        totalUsers: allUsers.length,
        pendingApprovals,
        activeUsersLast24h,
        totalTubes,
        labStats,
      }));
    } catch (error) {
      next(error);
    }
  }
}
