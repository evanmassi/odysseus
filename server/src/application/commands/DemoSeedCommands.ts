/**
 * Demo Seed CQRS Commands
 *
 * System admin operations for seeding/unseeding demo lab infrastructure
 * and managing demo resource limits.
 */

import { v4 as uuidv4 } from 'uuid';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { LabRepository } from '@domain/repositories/LabRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import { User } from '@domain/entities/User';
import { ValidationError } from '@domain/errors/ValidationError';
import { PermissionError } from '@domain/errors/PermissionError';
import { NotFoundError } from '@domain/errors/NotFoundError';
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

export interface UpdateDemoLimitsCommand {
  userId: string;
  labId: string;
  limits: Partial<DemoLimits>;
}

// COMMAND HANDLERS

export class SeedDemoCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private labRepository: LabRepository,
    private userRepository: UserRepository,
    private auditRepository?: AuditRepository
  ) {}

  async handle(command: SeedDemoCommand): Promise<SeedDemoResponse> {
    await this.requireSystemAdmin(command.userId);

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }
    if (!lab.isDemo) {
      throw new ValidationError('Only demo labs can be seeded');
    }

    const config = await this.configurationRepository.getForLab(command.labId);
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
    await this.configurationRepository.saveWithOptimisticLock(
      config,
      expectedVersion,
      'Seeded demo infrastructure',
      command.userId,
      command.labId
    );

    if (this.auditRepository) {
      await this.seedAuditLogEntries(command.labId);
    }

    return {
      success: true,
      message: `Seeded ${tanks} tanks, ${racks} racks, ${boxes} boxes`,
      seededCount: { tanks, racks, boxes },
    };
  }

  private async seedAuditLogEntries(labId: string): Promise<void> {
    const now = new Date();
    const entries = [
      { action: 'tube_created', entityType: 'tube', username: 'demo_admin', details: { name: 'Sample Tube A-01', location: 'Tank 1 / Rack 1 / Box A' }, hoursAgo: 48 },
      { action: 'tube_created', entityType: 'tube', username: 'demo_admin', details: { name: 'Sample Tube A-02', location: 'Tank 1 / Rack 1 / Box A' }, hoursAgo: 47 },
      { action: 'researcher_created', entityType: 'researcher', username: 'demo_admin', details: { name: 'Dr. Jane Smith' }, hoursAgo: 36 },
      { action: 'tube_updated', entityType: 'tube', username: 'demo_admin', details: { name: 'Sample Tube A-01', changes: 'Updated concentration' }, hoursAgo: 24 },
      { action: 'user_logged_in', entityType: 'user', username: 'demo_admin', details: { method: 'password' }, hoursAgo: 12 },
      { action: 'tube_moved', entityType: 'tube', username: 'demo_admin', details: { name: 'Sample Tube A-02', from: 'Box A / A1', to: 'Box B / B3' }, hoursAgo: 6 },
      { action: 'configuration_updated', entityType: 'configuration', username: 'demo_admin', details: { change: 'Updated lab display settings' }, hoursAgo: 2 },
    ];

    const auditEntries = entries.map(e => ({
      id: uuidv4(),
      userId: uuidv4(),
      username: e.username,
      action: e.action,
      entityType: e.entityType,
      entityId: uuidv4(),
      details: JSON.stringify(e.details),
      timestamp: new Date(now.getTime() - e.hoursAgo * 60 * 60 * 1000),
      ipAddress: undefined,
      userAgent: undefined,
      labId,
    }));

    await this.auditRepository!.saveMany(auditEntries);
  }

  private async requireSystemAdmin(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    if (!user.isSystemAdmin()) {
      throw new PermissionError('Only system admins can seed demo labs', { userId });
    }
    return user;
  }
}

export class UnseedDemoCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private labRepository: LabRepository,
    private userRepository: UserRepository
  ) {}

  async handle(command: UnseedDemoCommand): Promise<UnseedDemoResponse> {
    await this.requireSystemAdmin(command.userId);

    const lab = await this.labRepository.findById(command.labId);
    if (!lab) {
      throw NotFoundError.forEntity('Lab', command.labId);
    }
    if (!lab.isDemo) {
      throw new ValidationError('Only demo labs can be unseeded');
    }

    const config = await this.configurationRepository.getForLab(command.labId);
    if (!config) {
      throw new ValidationError('No configuration found for lab');
    }

    const expectedVersion = config.version;
    config.unseedAll();
    await this.configurationRepository.saveWithOptimisticLock(
      config,
      expectedVersion,
      'Unseeded demo infrastructure',
      command.userId,
      command.labId
    );

    return {
      success: true,
      message: 'Demo infrastructure unseeded',
    };
  }

  private async requireSystemAdmin(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    if (!user.isSystemAdmin()) {
      throw new PermissionError('Only system admins can unseed demo labs', { userId });
    }
    return user;
  }
}

export class UpdateDemoLimitsCommandHandler {
  constructor(
    private labRepository: LabRepository,
    private userRepository: UserRepository
  ) {}

  async handle(command: UpdateDemoLimitsCommand): Promise<DemoLimits> {
    await this.requireSystemAdmin(command.userId);

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

  private async requireSystemAdmin(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError(`User not found: ${userId}`);
    }
    if (!user.isSystemAdmin()) {
      throw new PermissionError('Only system admins can manage demo limits', { userId });
    }
    return user;
  }
}
