/**
 * Storage Queries
 *
 * CQRS queries for lab storage configuration read operations.
 */

import { Storage } from '@domain/entities/Storage';
import { StorageRepository, StorageHistory } from '@domain/repositories/StorageRepository';
import { NotFoundError } from '@domain/errors/NotFoundError';

// CONFIGURATION QUERY CONTRACTS

export interface GetCurrentStorageQuery {
  labId: string;
}

export interface GetStorageHistoryQuery {
  labId: string;
  limit?: number;
  offset?: number;
}

export interface GetStorageByVersionQuery {
  labId: string;
  version: number;
}

// CONFIGURATION QUERY HANDLERS

/** Creates default configuration if none exists. */
export class GetCurrentStorageQueryHandler {
  constructor(private storageRepository: StorageRepository) {}

  async handle(query: GetCurrentStorageQuery): Promise<Storage> {
    let configuration = await this.storageRepository.getForLab(query.labId);

    if (!configuration) {
      configuration = await this.storageRepository.ensureDefaultForLab(query.labId);
    }

    return configuration;
  }
}


/** Returns historical configuration versions with pagination for audit trails and rollback. */
export class GetStorageHistoryQueryHandler {
  constructor(private storageRepository: StorageRepository) {}

  async handle(query: GetStorageHistoryQuery): Promise<StorageHistory[]> {
    return this.storageRepository.getHistory(query.labId, query.limit);
  }
}

/** Returns a specific configuration version for comparison and rollback operations. */
export class GetStorageByVersionQueryHandler {
  constructor(private storageRepository: StorageRepository) {}

  async handle(query: GetStorageByVersionQuery): Promise<Storage> {
    const configuration = await this.storageRepository.getByVersion(query.labId, query.version);

    if (!configuration) {
      throw NotFoundError.configuration();
    }

    return configuration;
  }
}

/** Validates current configuration integrity for system health monitoring. */
export class CheckStorageHealthQueryHandler {
  constructor(private storageRepository: StorageRepository) {}

  async handle(query: { labId: string }): Promise<StorageHealthReport> {
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

// RESPONSE TYPES

export interface StorageHealthReport {
  isHealthy: boolean;
  issues: string[];
  lastUpdated: Date | null;
  version: number;
}
