/**
 * Demo Seed CQRS Commands
 *
 * System admin operations for seeding/unseeding demo lab infrastructure
 * and managing demo resource limits.
 */

import { applyDemoAuditLog } from '@application/commands/applyDemoAuditLog';
import {
  applyDemoDataset,
  type ApplyDemoDatasetResult,
} from '@application/commands/applyDemoDataset';
import type { Repositories, UnitOfWork } from '@application/contracts/UnitOfWork';
import { requireSystemAdmin } from '@application/guards/UserGuards';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import { logger } from '@infrastructure/logging/logger';

import type { DemoLimits, SeedDemoResponse, UnseedDemoResponse } from '@odysseus/shared-schemas';

// COMMAND INTERFACES

export interface SeedDemoCommand {
  userId: string;
  labId: string;
}

export interface UnseedDemoCommand {
  userId: string;
  labId: string;
}

export interface ResetDemoDataCommand {
  userId: string;
  labId: string;
}

export interface UpdateDemoLimitsCommand {
  userId: string;
  labId: string;
  limits: Partial<DemoLimits>;
}

// COMMAND HANDLERS

export class SeedDemoCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private auditRepository?: AuditRepository
  ) {}

  async handle(command: SeedDemoCommand): Promise<SeedDemoResponse> {
    await requireSystemAdmin(this.userRepository, command.userId);

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }
    if (!lab.isDemo) {
      throw new ValidationError('Only demo labs can be seeded');
    }

    const config = await this.storageRepository.getForLab(command.labId);
    if (!config) {
      throw new ValidationError('No configuration found for lab');
    }

    let tanks = 0;
    let racks = 0;
    let boxes = 0;
    for (const tank of config.tanks) {
      tanks++;
      for (const rack of tank.racks) {
        racks++;
        boxes += rack.boxes.length;
      }
    }

    const expectedVersion = config.version;
    config.seedAll();
    await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      config,
      expectedVersion,
      'Seeded demo infrastructure',
      command.userId
    );

    if (this.auditRepository) {
      const labUsers = await this.userRepository.findByLabId(command.labId);
      await applyDemoAuditLog(this.auditRepository, labUsers, command.labId);
    }

    return {
      message: `Seeded ${tanks} tanks, ${racks} racks, ${boxes} boxes`,
      seededCount: { tanks, racks, boxes },
    };
  }
}

/** What a reset put back, so the caller can report the restore rather than the wipe. */
export interface ResetDemoDataResult {
  restored: ApplyDemoDatasetResult;
}

/**
 * Wipes everything a demo visitor can create, leaving the lab ready to be repopulated.
 *
 * One transaction: a reset that failed part-way would leave the demo lab in a state no visitor
 * should see. Deletion order is dictated by foreign keys, not preference — see the sequence below.
 *
 * Never touches `users`: the demo account is what the whole feature depends on, and nothing
 * recreates it.
 */
export class ResetDemoDataCommandHandler {
  constructor(
    private unitOfWork: UnitOfWork,
    private userRepository: UserRepository
  ) {}

  /** Triggered from the admin UI by a signed-in system admin. */
  async handle(command: ResetDemoDataCommand): Promise<ResetDemoDataResult> {
    await requireSystemAdmin(this.userRepository, command.userId);
    return this.runReset(command.labId, command.userId);
  }

  /**
   * Triggered by the nightly job, which has no session — the caller proves its authority with the
   * reset key and by confirming the lab is a demo before calling. Authorization deliberately lives
   * with each entry point rather than here, so neither path can inherit the other's assumptions.
   */
  async handleUnattended(labId: string, actorId: string): Promise<ResetDemoDataResult> {
    return this.runReset(labId, actorId);
  }

  private async runReset(labId: string, actorId: string): Promise<ResetDemoDataResult> {
    const result = await this.unitOfWork.withTransaction(async repos => {
      const config = await repos.storage.getForLab(labId);
      if (!config) {
        throw new ValidationError('No configuration found.');
      }

      // Both catalogs clear their own ledger first — those foreign keys are NO ACTION, so an item
      // cannot go while a transaction still points at it. Everything else cascades from the item.
      const deletedReagents = await repos.reagentItems.deleteAllForLab(labId);
      const deletedSupplies = await repos.supplyItems.deleteAllForLab(labId);
      const deletedEquipment = await repos.equipmentItems.deleteAllForLab(labId);

      const tankIds = config.tanks.map(t => t.id);
      const deletedTubes =
        tankIds.length > 0 ? await repos.tubes.deleteByTankIds(tankIds, labId) : 0;

      await repos.donors.deleteAllForLab(labId);

      logger.info('Demo reset cleared existing content', {
        labId: labId,
        deletedTubes,
        deletedReagents,
        deletedSupplies,
        deletedEquipment,
      });

      // Visitor-added storage goes; seeded storage stays. Skipped entirely when nothing is
      // seeded, so an unseeded lab's tanks are never silently thrown away.
      if (config.hasAnySeededResources()) {
        const expectedVersion = config.version;
        config.removeNonSeededEquipment();
        await repos.storage.saveWithOptimisticLock(
          labId,
          config,
          expectedVersion,
          'Removed non-seeded equipment during demo reset',
          actorId
        );
      }

      const seedActor = await this.resolveSeedActor(repos, labId);
      const restored = await applyDemoDataset(repos, labId, seedActor.id, config);

      // Rebuilt with the data so the history stays as recent as the lab it describes.
      await applyDemoAuditLog(repos.audit, await repos.users.findByLabId(labId), labId);

      return { restored };
    });

    return result;
  }

  /** Seeded transactions need an actor, and `performed_by` is a NOT NULL foreign key. */
  /**
   * Who seeded transactions and maintenance entries are attributed to. Picks the lab's admin
   * account rather than whichever user comes back first, so adding people to the demo lab cannot
   * silently reassign its history; sorted by id to stay stable across runs.
   */
  private async resolveSeedActor(repos: Repositories, labId: string): Promise<User> {
    const users = await repos.users.findByLabId(labId);
    const ordered = [...users].sort((a, b) => a.id.localeCompare(b.id));
    const actor = ordered.find(u => u.isLabAdmin()) ?? ordered[0];

    if (!actor) {
      throw new ValidationError(
        'The demo lab has no user to attribute seeded history to. Create the demo account first.'
      );
    }
    return actor;
  }
}

export class UnseedDemoCommandHandler {
  constructor(
    private storageRepository: StorageRepository,
    private labRepository: LabRepository,
    private userRepository: UserRepository
  ) {}

  async handle(command: UnseedDemoCommand): Promise<UnseedDemoResponse> {
    await requireSystemAdmin(this.userRepository, command.userId);

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }
    if (!lab.isDemo) {
      throw new ValidationError('Only demo labs can be unseeded');
    }

    const config = await this.storageRepository.getForLab(command.labId);
    if (!config) {
      throw new ValidationError('No configuration found for lab');
    }

    const expectedVersion = config.version;
    config.unseedAll();
    await this.storageRepository.saveWithOptimisticLock(
      command.labId,
      config,
      expectedVersion,
      'Unseeded demo infrastructure',
      command.userId
    );

    return {
      message: 'Demo infrastructure unseeded',
    };
  }
}

export class UpdateDemoLimitsCommandHandler {
  constructor(
    private labRepository: LabRepository,
    private userRepository: UserRepository
  ) {}

  async handle(command: UpdateDemoLimitsCommand): Promise<DemoLimits> {
    await requireSystemAdmin(this.userRepository, command.userId);

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }
    if (!lab.isDemo) {
      throw new ValidationError('Demo limits can only be set on demo labs');
    }

    lab.updateDemoLimits(command.limits);
    await this.labRepository.save(lab);

    return lab.demoLimits!;
  }
}
