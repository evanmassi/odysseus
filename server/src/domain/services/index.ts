/**
 * Domain Services
 * 
 * Domain services handle complex business logic that spans multiple aggregates
 * or doesn't naturally belong to a single entity. They coordinate between
 * entities and value objects to implement complex business rules.
 * 
 * Key Principles:
 * - Stateless: Services don't hold state, entities do
 * - Coordinating: Services coordinate between multiple aggregates
 * - Business-focused: Services implement business processes, not technical concerns
 * - Repository-aware: Services use repositories to access data
 * - Domain-pure: No infrastructure dependencies (HTTP, database, etc.)
 */

// Domain Services
export { TubePositionService } from './TubePositionService';
export { AccessControlService } from './AccessControlService';
export { ValidationService } from './ValidationService';

// Service Types (re-exported from centralized locations)
export type { PositionValidation, PositionValidationWithWarnings, PositionValidationResult, BoxStatistics } from '@domain/types/services';
export type { AccessResult, BulkAccessResult, BulkOperation } from '@domain/types/services';
export type { TubeCreationData, TubeUpdateData } from '@domain/types/services';
export type { DomainValidationResult, BulkValidationResult } from '@domain/types/Validation';
export { RolePermissionService, UserRole as UserRoleType, RolePermissionComparison, PermissionAuditReport } from './RolePermissionService';

// Import types for interfaces
import { TubePositionService } from './TubePositionService';
import { AccessControlService } from './AccessControlService';
import { ValidationService } from './ValidationService';

/**
 * Domain Service Factory Interface
 * 
 * Defines how application layer creates and configures domain services
 * with their required dependencies (repositories).
 */
export interface DomainServiceFactory {
  /**
   * Create tube position service with repository dependencies
   */
  createTubePositionService(): TubePositionService;
  
  /**
   * Create access control service with repository dependencies
   */
  createAccessControlService(): AccessControlService;
  
  /**
   * Create validation service with all dependencies
   */
  createValidationService(): ValidationService;
  
  /**
   * Create all domain services as a coordinated set
   */
  createDomainServices(): DomainServices;
}

/**
 * Domain Services Container
 * 
 * Provides a unified interface for accessing all domain services
 * with proper dependency injection and coordination.
 */
export interface DomainServices {
  tubePosition: TubePositionService;
  accessControl: AccessControlService;
  validation: ValidationService;
}

/**
 * Domain Service Configuration
 * 
 * Configuration options for domain services that affect business rules
 * without being tied to infrastructure concerns.
 */
export interface DomainServiceConfig {
  // Tube position service configuration
  position: {
    maxOccupancyWarningThreshold: number; // Warn when box is X% full
    nearbyTubeRadius: number; // Distance to consider tubes "nearby"
    maxBulkOperationSize: number; // Maximum tubes in bulk operation
  };
  
  // Access control service configuration
  accessControl: {
    sessionTimeoutMinutes: number; // Regular session timeout
    adminSessionTimeoutMinutes: number; // Admin session timeout
    maxTubeAgeForUserDeletion: number; // Days after which only admin can delete
    minimumAdminCount: number; // Minimum number of admins required
  };
  
  // Validation service configuration
  validation: {
    maxSampleAgeWarningYears: number; // Warn for samples older than X years
    maxDuplicateDonorWarning: number; // Warn when X+ tubes share donor ID
    requireResearcherValidation: boolean; // Whether to validate researcher exists
  };
}

/**
 * Default domain service configuration
 */
export const DEFAULT_DOMAIN_CONFIG: DomainServiceConfig = {
  position: {
    maxOccupancyWarningThreshold: 0.9, // 90%
    nearbyTubeRadius: 10,
    maxBulkOperationSize: 50
  },
  accessControl: {
    sessionTimeoutMinutes: 60,
    adminSessionTimeoutMinutes: 30,
    maxTubeAgeForUserDeletion: 365, // 1 year
    minimumAdminCount: 1
  },
  validation: {
    maxSampleAgeWarningYears: 5,
    maxDuplicateDonorWarning: 5,
    requireResearcherValidation: false
  }
};

/**
 * Domain Service Manager Interface
 * 
 * Manages the lifecycle and coordination of domain services
 */
export interface DomainServiceManager {
  /**
   * Initialize all domain services with configuration
   */
  initialize(config?: Partial<DomainServiceConfig>): Promise<void>;
  
  /**
   * Get configured domain services
   */
  getServices(): DomainServices;
  
  /**
   * Get current configuration
   */
  getConfig(): DomainServiceConfig;
  
  /**
   * Update configuration (affects business rules)
   */
  updateConfig(updates: Partial<DomainServiceConfig>): Promise<void>;
  
  /**
   * Validate domain service health
   */
  validateHealth(): Promise<DomainServiceHealthReport>;
}

/**
 * Health report for domain services
 */
export interface DomainServiceHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    tubePosition: 'healthy' | 'unhealthy';
    accessControl: 'healthy' | 'unhealthy';
    validation: 'healthy' | 'unhealthy';
  };
  repositoryDependencies: {
    tubes: 'available' | 'unavailable';
    users: 'available' | 'unavailable';
    researchers: 'available' | 'unavailable';
    configuration: 'available' | 'unavailable';
  };
  details: {
    [key: string]: string; // Error messages or status details
  };
  timestamp: Date;
}
