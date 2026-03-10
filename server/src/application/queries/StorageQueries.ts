import { Storage } from '@domain/entities/Storage';
import { StorageRepository, StorageHistory } from '@domain/repositories/StorageRepository';
import { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';

// CONFIGURATION QUERY CONTRACTS

/**
 * Get Current Configuration Query
 */
export interface GetCurrentStorageQuery {
  labId: string;
}

/**
 * Get Configuration History Query
 */
export interface GetStorageHistoryQuery {
  labId: string;
  limit?: number;
  offset?: number;
}

/**
 * Get Configuration by Version Query
 */
export interface GetStorageByVersionQuery {
  labId: string;
  version: number;
}

// CONFIGURATION QUERY HANDLERS

/**
 * Get Current Configuration Query Handler
 * 
 * Returns the current active system configuration.
 * Creates default configuration if none exists.
 * 
 * @example
 * const handler = new GetCurrentStorageQueryHandler(configRepository);
 * const config = await handler.handle({});
 */
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

/**
 * Get Configuration for User Query
 */
export interface GetStorageForUserQuery {
  labId: string;
  user: User;
}

/**
 * Get Configuration for User Query Handler
 *
 * Returns the current configuration for the user's lab.
 * Each lab has its own configuration — no cross-lab filtering needed.
 */
export class GetStorageForUserQueryHandler {
  constructor(private storageRepository: StorageRepository) {}

  async handle(query: GetStorageForUserQuery): Promise<Storage> {
    let configuration = await this.storageRepository.getForLab(query.labId);

    if (!configuration) {
      configuration = await this.storageRepository.ensureDefaultForLab(query.labId);
    }

    return configuration;
  }
}

/**
 * Get Configuration History Query Handler
 *
 * Returns historical configuration versions with pagination.
 * Used for audit trails and configuration rollback features.
 *
 * @example
 * const handler = new GetStorageHistoryQueryHandler(configRepository);
 * const history = await handler.handle({ limit: 10, offset: 0 });
 */
export class GetStorageHistoryQueryHandler {
  constructor(private storageRepository: StorageRepository) {}

  async handle(query: GetStorageHistoryQuery): Promise<StorageHistory[]> {
    return this.storageRepository.getHistory(query.labId, query.limit);
  }
}

/**
 * Get Configuration by Version Query Handler
 * 
 * Returns a specific configuration version by number.
 * Used for version comparison and rollback operations.
 * 
 * @example
 * const handler = new GetStorageByVersionQueryHandler(configRepository);
 * const config = await handler.handle({ version: 5 });
 */
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

/**
 * Check Configuration Health Query Handler
 * 
 * Validates current configuration integrity and reports any issues.
 * Used for system health monitoring and diagnostics.
 * 
 * @example
 * const handler = new CheckStorageHealthQueryHandler(configRepository);
 * const health = await handler.handle({});
 */
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

      // Validate configuration business rules
      const issues: string[] = [];

      // Check if equipment configuration is valid
      if (configuration.equipment.tanks.length === 0) {
        issues.push('No tanks configured');
      }

      // Check for racks (now nested in tanks)
      const totalRacks = configuration.equipment.tanks.reduce((sum, tank) => sum + tank.racks.length, 0);
      if (totalRacks === 0) {
        issues.push('No racks configured');
      }

      // Check for boxes (now nested in racks)
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

/**
 * Configuration Health Report
 */
export interface StorageHealthReport {
  isHealthy: boolean;
  issues: string[];
  lastUpdated: Date | null;
  version: number;
}
