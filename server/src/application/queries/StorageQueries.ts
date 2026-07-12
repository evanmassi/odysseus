/**
 * Storage Queries
 *
 * CQRS queries for lab storage configuration read operations.
 */

import type { Storage } from '@domain/entities/Storage';
import { NotFoundError } from '@domain/errors/NotFoundError';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository, StorageHistory } from '@domain/repositories/StorageRepository';

import type { DemoLimits, SystemMetrics } from '@odysseus/shared-schemas';

export interface GetCurrentStorageQuery {
  labId: string;
  /** Demo users get their lab's demo limits grafted onto the response. */
  includeDemoLimits?: boolean;
}

export interface CurrentStorageResult {
  storage: Storage;
  demoLimits?: DemoLimits;
}

export interface GetStorageHistoryQuery {
  labId: string;
  limit?: number;
}

export interface GetStorageByVersionQuery {
  labId: string;
  version: number;
}

export interface GetSystemMetricsQuery {
  labId: string;
}

export interface CheckStorageHealthQuery {
  labId: string;
}

/** Creates default configuration if none exists. */
export class GetCurrentStorageQueryHandler {
  constructor(
    private storageRepository: StorageRepository,
    private labRepository: LabRepository
  ) {}

  async handle(query: GetCurrentStorageQuery): Promise<CurrentStorageResult> {
    let storage = await this.storageRepository.getForLab(query.labId);

    if (!storage) {
      storage = await this.storageRepository.ensureDefaultForLab(query.labId);
    }

    let demoLimits: DemoLimits | undefined;
    if (query.includeDemoLimits) {
      const lab = await this.labRepository.findById(query.labId);
      demoLimits = lab?.demoLimits;
    }

    return { storage, demoLimits };
  }
}

/** Returns historical storage versions for audit trails and rollback. */
export class GetStorageHistoryQueryHandler {
  constructor(private storageRepository: StorageRepository) {}

  async handle(query: GetStorageHistoryQuery): Promise<StorageHistory[]> {
    return this.storageRepository.getHistory(query.labId, query.limit);
  }
}

/** Returns a specific storage version. Throws if not found. */
export class GetStorageByVersionQueryHandler {
  constructor(private storageRepository: StorageRepository) {}

  async handle(query: GetStorageByVersionQuery): Promise<Storage> {
    const configuration = await this.storageRepository.getByVersion(query.labId, query.version);

    if (!configuration) {
      throw NotFoundError.storage();
    }

    return configuration;
  }
}

/** Validates current storage configuration integrity. */
export class CheckStorageHealthQueryHandler {
  constructor(private storageRepository: StorageRepository) {}

  async handle(query: CheckStorageHealthQuery): Promise<StorageHealthReport> {
    try {
      const configuration = await this.storageRepository.getForLab(query.labId);

      if (!configuration) {
        return {
          isHealthy: false,
          issues: ['No configuration found'],
          lastUpdated: null,
          version: 0
        };
      }

      const issues: string[] = [];

      if (configuration.equipment.tanks.length === 0) {
        issues.push('No tanks configured');
      }

      const totalRacks = configuration.equipment.tanks.reduce((sum, tank) => sum + tank.racks.length, 0);
      if (totalRacks === 0) {
        issues.push('No racks configured');
      }

      const totalBoxes = configuration.equipment.tanks.reduce(
        (sum, tank) => sum + tank.racks.reduce((rackSum, rack) => rackSum + rack.boxes.length, 0),
        0
      );
      if (totalBoxes === 0) {
        issues.push('No boxes configured');
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        lastUpdated: configuration.updatedAt,
        version: configuration.version
      };

    } catch (error) {
      return {
        isHealthy: false,
        issues: [`Storage configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        lastUpdated: null,
        version: 0
      };
    }
  }
}

/** Aggregate lab metrics (tube/user/researcher counts, last backup) for the admin dashboard. */
export class GetSystemMetricsQueryHandler {
  constructor(private storageRepository: StorageRepository) {}

  async handle(query: GetSystemMetricsQuery): Promise<SystemMetrics> {
    return this.storageRepository.getSystemMetrics(query.labId);
  }
}

export interface StorageHealthReport {
  isHealthy: boolean;
  issues: string[];
  lastUpdated: Date | null;
  version: number;
}
