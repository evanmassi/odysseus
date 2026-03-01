/**
 * Demo Seed CQRS Commands
 *
 * System admin operations for seeding/unseeding demo lab infrastructure
 * and managing demo resource limits.
 */

import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { LabRepository } from '@domain/repositories/LabRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
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
    private userRepository: UserRepository
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

    return {
      success: true,
      message: `Seeded ${tanks} tanks, ${racks} racks, ${boxes} boxes`,
      seededCount: { tanks, racks, boxes },
    };
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
