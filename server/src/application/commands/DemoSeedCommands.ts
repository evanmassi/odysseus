/**
 * Demo Seed CQRS Commands
 *
 * System admin operations for seeding/unseeding demo lab infrastructure
 * and managing demo resource limits.
 */

import { randomUUID } from 'crypto';

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
      await this.auditRepository.deleteByLabId(command.labId);
      const labUsers = await this.userRepository.findByLabId(command.labId);
      await this.seedAuditLogEntries(labUsers, command.labId);
    }

    return {
      message: `Seeded ${tanks} tanks, ${racks} racks, ${boxes} boxes`,
      seededCount: { tanks, racks, boxes },
    };
  }

  private async seedAuditLogEntries(labUsers: User[], labId: string): Promise<void> {
    if (labUsers.length === 0) return;

    const users = labUsers.map(u => ({ id: u.id, username: u.username }));
    const pick = (index: number) => users[index % users.length];

    const now = new Date();
    const entries = [
      {
        actor: pick(0),
        action: 'user_created',
        entityType: 'user',
        details: { username: pick(1).username, role: 'user' },
        hoursAgo: 168,
      },
      {
        actor: pick(0),
        action: 'user_approved',
        entityType: 'user',
        details: { username: pick(1).username, approvedBy: pick(0).username },
        hoursAgo: 167,
      },
      {
        actor: pick(1),
        action: 'user_logged_in',
        entityType: 'user',
        details: { username: pick(1).username },
        hoursAgo: 166,
      },
      {
        actor: pick(0),
        action: 'user_role_changed',
        entityType: 'user',
        details: {
          username: pick(1).username,
          oldRole: 'user',
          newRole: 'lab_admin',
          changedBy: pick(0).username,
        },
        hoursAgo: 144,
      },
      {
        actor: pick(0),
        action: 'researcher_created',
        entityType: 'researcher',
        details: { researcherName: 'Dr. Jane Smith', email: 'jane.smith@lab.org' },
        hoursAgo: 120,
      },
      {
        actor: pick(0),
        action: 'user_linked_to_researcher',
        entityType: 'user',
        details: {
          username: pick(1).username,
          researcherName: 'Dr. Jane Smith',
          linkedBy: pick(0).username,
        },
        hoursAgo: 119,
      },
      {
        actor: pick(1),
        action: 'tube_created',
        entityType: 'tube',
        details: {
          displayLocation: 'Tank 1 · Rack 1 · Box A · A1',
          cellType: 'HEK293',
          donorInternalId: 'D-001',
        },
        hoursAgo: 96,
      },
      {
        actor: pick(1),
        action: 'tube_created',
        entityType: 'tube',
        details: {
          displayLocation: 'Tank 1 · Rack 1 · Box A · A2',
          cellType: 'iPSC',
          donorInternalId: 'D-002',
        },
        hoursAgo: 95,
      },
      {
        actor: pick(0),
        action: 'rack_assigned',
        entityType: 'rack',
        details: {
          tankName: 'Tank 1',
          rackName: 'Rack 1',
          newOwner: { userId: pick(1).id, username: pick(1).username },
          assignedBy: pick(0).username,
        },
        hoursAgo: 72,
      },
      {
        actor: pick(1),
        action: 'tube_updated',
        entityType: 'tube',
        details: {
          displayLocation: 'Tank 1 · Rack 1 · Box A · A1',
          changes: [{ field: 'concentration', oldValue: '1.0', newValue: '2.5' }],
        },
        hoursAgo: 60,
      },
      {
        actor: pick(1),
        action: 'tube_moved',
        entityType: 'tube',
        details: {
          oldDisplayLocation: 'Tank 1 · Rack 1 · Box A · A2',
          displayLocation: 'Tank 1 · Rack 2 · Box B · B3',
        },
        hoursAgo: 48,
      },
      {
        actor: pick(0),
        action: 'tubes_locked',
        entityType: 'tube',
        details: {
          tubeCount: 3,
          tubeIds: [],
          lockNote: 'QC review pending',
          lockedBy: pick(0).username,
        },
        hoursAgo: 36,
      },
      {
        actor: pick(0),
        action: 'tubes_unlocked',
        entityType: 'tube',
        details: { tubeCount: 3, tubeIds: [], unlockedBy: pick(0).username },
        hoursAgo: 30,
      },
      {
        actor: pick(0),
        action: 'box_unassigned',
        entityType: 'box',
        details: {
          tankName: 'Tank 1',
          rackName: 'Rack 2',
          boxName: 'Box C',
          previousOwner: { userId: pick(1).id, username: pick(1).username },
          newOwner: null,
          unassignedBy: pick(0).username,
        },
        hoursAgo: 24,
      },
      {
        actor: pick(1),
        action: 'tube_deleted',
        entityType: 'tube',
        details: {
          displayLocation: 'Tank 1 · Rack 2 · Box B · B3',
          cellType: 'iPSC',
          donorInternalId: 'D-002',
          donorSourceId: '',
        },
        hoursAgo: 18,
      },
      {
        actor: pick(0),
        action: 'user_password_changed',
        entityType: 'user',
        details: { username: pick(1).username, changedBy: pick(0).username },
        hoursAgo: 12,
      },
      {
        actor: pick(0),
        action: 'researcher_deactivated',
        entityType: 'researcher',
        details: {
          researcherName: 'Dr. Jane Smith',
          tubeCount: 2,
          deactivatedBy: pick(0).username,
        },
        hoursAgo: 8,
      },
      {
        actor: pick(0),
        action: 'user_unlinked_from_researcher',
        entityType: 'user',
        details: {
          username: pick(1).username,
          researcherName: 'Dr. Jane Smith',
          unlinkedBy: pick(0).username,
        },
        hoursAgo: 6,
      },
      {
        actor: pick(0),
        action: 'tank_updated',
        entityType: 'tank',
        details: {
          tankName: 'Tank 1',
          changes: [{ field: 'name', oldValue: 'Storage Tank', newValue: 'Tank 1' }],
        },
        hoursAgo: 2,
      },
    ];

    const auditEntries = entries.map(e => ({
      id: randomUUID(),
      userId: e.actor.id,
      username: e.actor.username,
      action: e.action,
      entityType: e.entityType,
      entityId: randomUUID(),
      details: JSON.stringify(e.details),
      timestamp: new Date(now.getTime() - e.hoursAgo * 60 * 60 * 1000),
      ipAddress: undefined,
      userAgent: undefined,
      labId,
    }));

    await this.auditRepository!.saveMany(auditEntries);
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

      const demoUser = await this.resolveDemoUser(repos, labId);
      const restored = await applyDemoDataset(repos, labId, demoUser.id, config);

      return { restored };
    });

    return result;
  }

  /** Seeded transactions need an actor, and `performed_by` is a NOT NULL foreign key. */
  private async resolveDemoUser(repos: Repositories, labId: string): Promise<User> {
    const users = await repos.users.findByLabId(labId);
    const user = users[0];
    if (!user) {
      throw new ValidationError(
        'The demo lab has no user to attribute seeded history to. Create the demo account first.'
      );
    }
    return user;
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
