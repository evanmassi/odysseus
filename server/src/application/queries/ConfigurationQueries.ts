import { Configuration } from '@domain/entities/Configuration';
import { ConfigurationRepository, ConfigurationHistory } from '@domain/repositories/ConfigurationRepository';
import { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';

// CONFIGURATION QUERY CONTRACTS

/**
 * Get Current Configuration Query
 */
export interface GetCurrentConfigurationQuery {
  labId: string;
}

/**
 * Get Configuration History Query
 */
export interface GetConfigurationHistoryQuery {
  labId: string;
  limit?: number;
  offset?: number;
}

/**
 * Get Configuration by Version Query
 */
export interface GetConfigurationByVersionQuery {
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
 * const handler = new GetCurrentConfigurationQueryHandler(configRepository);
 * const config = await handler.handle({});
 */
export class GetCurrentConfigurationQueryHandler {
  constructor(private configurationRepository: ConfigurationRepository) {}

  async handle(query: GetCurrentConfigurationQuery): Promise<Configuration> {
    let configuration = await this.configurationRepository.getForLab(query.labId);

    if (!configuration) {
      configuration = await this.configurationRepository.ensureDefaultForLab(query.labId);
    }

    return configuration;
  }
}

/**
 * Get Configuration for User Query
 */
export interface GetConfigurationForUserQuery {
  labId: string;
  user: User;
}

/**
 * Get Configuration for User Query Handler
 *
 * Returns the current configuration for the user's lab.
 * Each lab has its own configuration — no cross-lab filtering needed.
 */
export class GetConfigurationForUserQueryHandler {
  constructor(private configurationRepository: ConfigurationRepository) {}

  async handle(query: GetConfigurationForUserQuery): Promise<Configuration> {
    let configuration = await this.configurationRepository.getForLab(query.labId);

    if (!configuration) {
      configuration = await this.configurationRepository.ensureDefaultForLab(query.labId);
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
 * const handler = new GetConfigurationHistoryQueryHandler(configRepository);
 * const history = await handler.handle({ limit: 10, offset: 0 });
 */
export class GetConfigurationHistoryQueryHandler {
  constructor(private configurationRepository: ConfigurationRepository) {}

  async handle(query: GetConfigurationHistoryQuery): Promise<ConfigurationHistory[]> {
    return this.configurationRepository.getHistory(query.labId, query.limit);
  }
}

/**
 * Get Configuration by Version Query Handler
 * 
 * Returns a specific configuration version by number.
 * Used for version comparison and rollback operations.
 * 
 * @example
 * const handler = new GetConfigurationByVersionQueryHandler(configRepository);
 * const config = await handler.handle({ version: 5 });
 */
export class GetConfigurationByVersionQueryHandler {
  constructor(private configurationRepository: ConfigurationRepository) {}

  async handle(query: GetConfigurationByVersionQuery): Promise<Configuration> {
    const configuration = await this.configurationRepository.getByVersion(query.labId, query.version);
    
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
 * const handler = new CheckConfigurationHealthQueryHandler(configRepository);
 * const health = await handler.handle({});
 */
export class CheckConfigurationHealthQueryHandler {
  constructor(private configurationRepository: ConfigurationRepository) {}

  async handle(query: { labId: string }): Promise<ConfigurationHealthReport> {
    try {
      const configuration = await this.configurationRepository.getForLab(query.labId);
      
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
        issues: [`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
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
export interface ConfigurationHealthReport {
  isHealthy: boolean;
  issues: string[];
  lastUpdated: Date | null;
  version: number;
}
