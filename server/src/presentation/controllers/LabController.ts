/**
 * Lab Controller
 *
 * System admin endpoints for lab tenant management.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from './BaseController';
import { API_ERROR_CODES } from '@odysseus/shared-schemas';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import type { CreateLabCommandHandler, UpdateLabCommandHandler, DeactivateLabCommandHandler, ActivateLabCommandHandler } from '@application/commands/LabCommands';
import type { UpdateDemoLimitsCommandHandler } from '@application/commands/DemoSeedCommands';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import { DEMO_LIMITS_DEFAULTS } from '@odysseus/shared-schemas';
import { logger } from '@infrastructure/logging/logger';

export interface LabControllerDeps {
  createLabHandler: CreateLabCommandHandler;
  updateLabHandler: UpdateLabCommandHandler;
  deactivateLabHandler: DeactivateLabCommandHandler;
  activateLabHandler: ActivateLabCommandHandler;
  updateDemoLimitsHandler: UpdateDemoLimitsCommandHandler;
  labRepository: LabRepository;
  userRepository: UserRepository;
  tubeRepository: TubeRepository;
  storageRepository: StorageRepository;
  researcherRepository: ResearcherRepository;
  personRepository: PersonRepository;
}

export class LabController extends BaseController {
  constructor(private deps: LabControllerDeps) {
    super();
  }

  async listLabs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labs = await this.deps.labRepository.findAll();

      const demoLab = labs.find(lab => lab.isDemo);
      let demoIsSeeded = false;
      if (demoLab) {
        const config = await this.deps.storageRepository.getForLab(demoLab.id);
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

      const result = await this.deps.createLabHandler.handle({ userId, name, isDemo });
      const lab = await this.deps.labRepository.findById(result.labId);

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

      await this.deps.updateLabHandler.handle({ userId, labId, name });
      const lab = await this.deps.labRepository.findById(labId);

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

      await this.deps.deactivateLabHandler.handle({ userId, labId });

      res.status(200).json(ResponseBuilder.success({ labId, deactivated: true }));

      logger.info('Lab deactivated', { labId, deactivatedBy: userId });
    } catch (error) {
      next(error);
    }
  }

  async getLabDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labId = req.params.labId;
      const lab = await this.deps.labRepository.findById(labId);
      if (!lab) {
        res.status(404).json(ResponseBuilder.error(API_ERROR_CODES.RESOURCE_NOT_FOUND, 'Lab not found'));
        return;
      }

      const [users, researchers, tubeCount, config] = await Promise.all([
        this.deps.userRepository.findByLabId(labId),
        this.deps.researcherRepository.findByLabId(labId),
        this.deps.tubeRepository.countByLabId(labId),
        this.deps.storageRepository.getForLab(labId),
      ]);

      const userPersonIds = users.map(u => u.personId).filter((id): id is string => !!id);
      const researcherPersonIds = researchers.map(r => r.personId);
      const allPersonIds = [...new Set([...userPersonIds, ...researcherPersonIds])];
      const persons = allPersonIds.length > 0 ? await this.deps.personRepository.findByIds(allPersonIds) : [];
      const personMap = new Map(persons.map(p => [p.id, p]));

      const researcherMap = new Map(researchers.map(r => [r.id, r]));

      const tubeCounts = await Promise.all(
        researchers.map(async r => ({
          researcherId: r.id,
          count: await this.deps.researcherRepository.getTubeCountByResearcher(r.id),
        }))
      );
      const tubeCountMap = new Map(tubeCounts.map(tc => [tc.researcherId, tc.count]));

      const userByResearcherId = new Map(
        users.filter(u => u.researcherId).map(u => [u.researcherId!, u])
      );

      const storageCounts = this.countStorage(config);

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
        storageSummary: storageCounts,
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

      await this.deps.activateLabHandler.handle({ userId, labId });

      res.status(200).json(ResponseBuilder.success({ labId, activated: true }));

      logger.info('Lab activated', { labId, activatedBy: userId });
    } catch (error) {
      next(error);
    }
  }

  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [labs, allUsers] = await Promise.all([
        this.deps.labRepository.findAll(),
        this.deps.userRepository.findAllWithLastActivity(),
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
        Promise.all(labs.map(lab => this.deps.tubeRepository.countByLabId(lab.id))),
        Promise.all(labs.map(lab => this.deps.storageRepository.getForLab(lab.id))),
      ]);

      const labStats = labs.map((lab, i) => {
        const userEntry = usersByLab.get(lab.id) ?? { total: 0, admins: 0 };
        const { tankCount, rackCount, boxCount } = this.countStorage(configs[i]);
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
      const lab = await this.deps.labRepository.findById(labId);
      if (!lab) {
        res.status(404).json(ResponseBuilder.error(API_ERROR_CODES.RESOURCE_NOT_FOUND, 'Lab not found'));
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

      const limits = await this.deps.updateDemoLimitsHandler.handle({
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

  private countStorage(config: { toData(): { tanks: { racks: { boxes: unknown[] }[] }[] } } | null | undefined): { tankCount: number; rackCount: number; boxCount: number } {
    if (!config) return { tankCount: 0, rackCount: 0, boxCount: 0 };
    const data = config.toData();
    let rackCount = 0, boxCount = 0;
    for (const tank of data.tanks) {
      rackCount += tank.racks.length;
      for (const rack of tank.racks) {
        boxCount += rack.boxes.length;
      }
    }
    return { tankCount: data.tanks.length, rackCount, boxCount };
  }
}
