/**
 * Lab Controller
 *
 * System admin endpoints for lab tenant management.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from './BaseController';
import { ResponseBuilder } from '@presentation/utils/ResponseBuilder';
import type { CreateLabCommandHandler, UpdateLabCommandHandler, DeactivateLabCommandHandler, ActivateLabCommandHandler } from '@application/commands/LabCommands';
import type { UpdateDemoLimitsCommandHandler } from '@application/commands/DemoSeedCommands';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import { DEMO_LIMITS_DEFAULTS } from '@odysseus/shared-schemas';
import { logger } from '@infrastructure/logging/logger';

export class LabController extends BaseController {
  constructor(
    private createLabHandler: CreateLabCommandHandler,
    private updateLabHandler: UpdateLabCommandHandler,
    private deactivateLabHandler: DeactivateLabCommandHandler,
    private activateLabHandler: ActivateLabCommandHandler,
    private updateDemoLimitsHandler: UpdateDemoLimitsCommandHandler,
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private tubeRepository: TubeRepository,
    private configurationRepository: ConfigurationRepository,
    private researcherRepository: ResearcherRepository,
    private personRepository: PersonRepository
  ) {
    super();
  }

  async listLabs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labs = await this.labRepository.findAll();

      const demoLab = labs.find(lab => lab.isDemo);
      let demoIsSeeded = false;
      if (demoLab) {
        const config = await this.configurationRepository.getForLab(demoLab.id);
        demoIsSeeded = config?.hasAnySeededResources() ?? false;
      }

      res.status(200).json(ResponseBuilder.success({
        labs: labs.map(lab => ({
          ...lab.toData(),
          ...(lab.isDemo && { isSeeded: demoIsSeeded }),
        })),
      }));
    } catch (error) {
      next(error);
    }
  }

  async createLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { name, isDemo } = req.body;

      const result = await this.createLabHandler.handle({ userId, name, isDemo });
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

      const userPersonIds = users.map(u => u.personId).filter((id): id is string => !!id);
      const researcherPersonIds = researchers.map(r => r.personId);
      const allPersonIds = [...new Set([...userPersonIds, ...researcherPersonIds])];
      const persons = allPersonIds.length > 0 ? await this.personRepository.findByIds(allPersonIds) : [];
      const personMap = new Map(persons.map(p => [p.id, p]));

      const researcherMap = new Map(researchers.map(r => [r.id, r]));

      const tubeCounts = await Promise.all(
        researchers.map(async r => ({
          researcherId: r.id,
          count: await this.researcherRepository.getTubeCountByResearcher(r.id),
        }))
      );
      const tubeCountMap = new Map(tubeCounts.map(tc => [tc.researcherId, tc.count]));

      const userByResearcherId = new Map(
        users.filter(u => u.researcherId).map(u => [u.researcherId!, u])
      );

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
        users: users.map(u => {
          const person = u.personId ? personMap.get(u.personId) : undefined;
          const researcher = u.researcherId ? researcherMap.get(u.researcherId) : undefined;
          const researcherPerson = researcher?.personId ? personMap.get(researcher.personId) : undefined;

          return {
            id: u.id,
            firstName: person?.firstName ?? null,
            lastName: person?.lastName ?? null,
            username: u.username,
            email: person?.email ?? null,
            role: u.roleString,
            status: u.status,
            isDemo: u.isDemo,
            lastActivity: u.lastActivity.toISOString(),
            researcher: u.researcherId ? {
              name: researcherPerson ? `${researcherPerson.firstName} ${researcherPerson.lastName}` : 'Unknown',
              tubeCount: tubeCountMap.get(u.researcherId) ?? 0,
            } : null,
          };
        }),
        researchers: researchers.map(r => {
          const person = personMap.get(r.personId);
          const linkedUser = userByResearcherId.get(r.id);
          return {
            id: r.id,
            firstName: person?.firstName ?? 'Unknown',
            lastName: person?.lastName ?? '',
            tubeCount: tubeCountMap.get(r.id) ?? 0,
            linkedUser: linkedUser ? { id: linkedUser.id, username: linkedUser.username } : null,
          };
        }),
        researcherCount: researchers.length,
        tubeCount,
        storageSummary: { tankCount, rackCount, boxCount },
        isSeeded: config?.hasAnySeededResources() ?? false,
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

      const usersByLab = new Map<string, { total: number; admins: number }>();
      for (const user of allUsers) {
        if (user.labId) {
          const entry = usersByLab.get(user.labId) ?? { total: 0, admins: 0 };
          entry.total++;
          if (user.roleString === 'lab_admin') entry.admins++;
          usersByLab.set(user.labId, entry);
        }
      }

      const [tubeCounts, configs] = await Promise.all([
        Promise.all(labs.map(lab => this.tubeRepository.countByLabId(lab.id))),
        Promise.all(labs.map(lab => this.configurationRepository.getForLab(lab.id))),
      ]);

      const labStats = labs.map((lab, i) => {
        const userEntry = usersByLab.get(lab.id) ?? { total: 0, admins: 0 };
        let tankCount = 0, rackCount = 0, boxCount = 0;
        if (configs[i]) {
          const configData = configs[i].toData();
          tankCount = configData.tanks.length;
          for (const tank of configData.tanks) {
            rackCount += tank.racks.length;
            for (const rack of tank.racks) {
              boxCount += rack.boxes.length;
            }
          }
        }
        return {
          labId: lab.id,
          labName: lab.name,
          adminCount: userEntry.admins,
          userCount: userEntry.total,
          tubeCount: tubeCounts[i],
          tankCount,
          rackCount,
          boxCount,
        };
      });

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

  async getDemoLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labId = req.params.labId;
      const lab = await this.labRepository.findById(labId);
      if (!lab) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lab not found' } });
        return;
      }

      res.status(200).json(ResponseBuilder.success({
        limits: lab.demoLimits ?? DEMO_LIMITS_DEFAULTS,
      }));
    } catch (error) {
      next(error);
    }
  }

  async updateDemoLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const labId = req.params.labId;

      const limits = await this.updateDemoLimitsHandler.handle({
        userId,
        labId,
        limits: req.body,
      });

      res.status(200).json(ResponseBuilder.success({ limits }));

      logger.info('Demo limits updated', { labId, updatedBy: userId });
    } catch (error) {
      next(error);
    }
  }
}
