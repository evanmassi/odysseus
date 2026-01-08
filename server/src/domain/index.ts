/**
 * Domain Layer - Complete Export Index
 * 
 * This file exports all domain layer components in a organized manner.
 * The domain layer is the heart of the business logic and contains:
 * - Entities with business behavior
 * - Value objects with validation
 * - Repository interfaces for data access
 * - Domain services for complex business logic
 * - Domain errors for proper error handling
 * 
 * Import hierarchy:
 * 1. Errors (foundation)
 * 2. Value Objects (building blocks)
 * 3. Entities (business logic)
 * 4. Repository Interfaces (data contracts)
 * 5. Domain Services (orchestration)
 */

// Import types for interface definitions
import {
  RepositoryFactory,
  RepositoryManager,
  RepositoryHealthReport
} from './repositories';
import {
  DomainServiceFactory,
  DomainServiceManager,
  DomainServices,
  DomainServiceConfig,
  DEFAULT_DOMAIN_CONFIG,
  DomainServiceHealthReport
} from './services';

// DOMAIN ERRORS

export { DomainError } from './errors/DomainError';
export { ValidationError } from './errors/ValidationError';
export { NotFoundError } from './errors/NotFoundError';
export { PermissionError } from './errors/PermissionError';

// VALUE OBJECTS

export { Location } from './valueObjects/Location';
export { SampleData } from './valueObjects/SampleData';
export { UserRole } from './valueObjects/UserRole';
export { Permission, PermissionKey, PermissionCategory, isPermissionKey } from './valueObjects/Permission';
export { EquipmentConfiguration, Tank, Rack, Box } from './valueObjects/Equipment';

// DOMAIN ENTITIES

export { Tube } from './entities/Tube';
export { User } from './entities/User';
export { Configuration } from './entities/Configuration';
export { Researcher } from './entities/Researcher';

// REPOSITORY INTERFACES

export {
  // Repository Interfaces
  TubeRepository,
  UserRepository,
  ResearcherRepository,
  ConfigurationRepository,
  
  // Factory and Manager Interfaces
  RepositoryFactory,
  RepositoryManager,
  
  // Supporting Types
  TubeSearchCriteria,
  TubeRepositoryStats,
  UserSearchCriteria,
  UserActivitySummary,
  UserRepositoryStats,
  ResearcherSearchCriteria,
  ResearcherUsageStats,
  ResearcherRepositoryStats,
  ResearcherValidationResult as RepositoryValidationResult,
  DuplicateCheckResult,
  ConfigurationHistory,
  EquipmentSummary,
  CapacityInfo,
  ConfigurationExport,
  ConfigurationSnapshot,
  ApiConfigurationResponse,
  FrontendConfiguration,
  ConfigurationValidationResult,
  ConfigurationRepositoryStats,
  MaintenanceResult,
  RepositoryHealthReport
} from './repositories';

// DOMAIN SERVICES

export {
  // Domain Services
  TubePositionService,
  AccessControlService,
  ValidationService,
  RolePermissionService,
  
  // Factory and Manager Interfaces
  DomainServiceFactory,
  DomainServiceManager,
  DomainServices,
  
  // Supporting Types
  PositionValidationResult,
  BoxStatistics,
  AccessResult,
  BulkAccessResult,
  BulkOperation,
  DomainValidationResult,
  BulkValidationResult,
  TubeCreationData,
  TubeUpdateData,
  
  // Configuration
  DomainServiceConfig,
  DEFAULT_DOMAIN_CONFIG,
  DomainServiceHealthReport
} from './services';

/**
 * Domain Layer Factory Interface
 * 
 * Main factory for creating all domain layer components
 * with proper dependency injection and configuration.
 */
export interface DomainLayerFactory {
  /**
   * Create repository factory
   */
  createRepositoryFactory(): RepositoryFactory;
  
  /**
   * Create repository manager with all repositories
   */
  createRepositoryManager(): RepositoryManager;
  
  /**
   * Create domain service factory
   */
  createDomainServiceFactory(): DomainServiceFactory;
  
  /**
   * Create domain service manager
   */
  createDomainServiceManager(): DomainServiceManager;
  
  /**
   * Initialize the entire domain layer
   */
  initialize(config?: Partial<DomainLayerConfig>): Promise<DomainLayer>;
}

/**
 * Complete Domain Layer Interface
 * 
 * Provides unified access to all domain layer components
 * with proper lifecycle management and health monitoring.
 */
export interface DomainLayer {
  // Repository access
  repositories: RepositoryManager;
  
  // Domain service access
  services: DomainServices;
  
  // Configuration
  config: DomainLayerConfig;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Health monitoring
  checkHealth(): Promise<DomainLayerHealthReport>;
  
  // Configuration management
  updateConfig(updates: Partial<DomainLayerConfig>): Promise<void>;
}

/**
 * Domain Layer Configuration
 * 
 * Complete configuration for the domain layer including
 * repository settings and domain service configuration.
 */
export interface DomainLayerConfig {
  // Repository configuration
  repositories: {
    connectionTimeout: number;
    queryTimeout: number;
    enableCaching: boolean;
    cacheTimeout: number;
  };
  
  // Domain service configuration
  services: DomainServiceConfig;
  
  // General domain settings
  general: {
    enableAuditTrail: boolean;
    enablePerformanceMonitoring: boolean;
    maxBulkOperationSize: number;
    defaultSessionTimeout: number;
  };
}

/**
 * Default domain layer configuration
 */
export const DEFAULT_DOMAIN_LAYER_CONFIG: DomainLayerConfig = {
  repositories: {
    connectionTimeout: 30000, // 30 seconds
    queryTimeout: 10000, // 10 seconds
    enableCaching: true,
    cacheTimeout: 300000 // 5 minutes
  },
  services: DEFAULT_DOMAIN_CONFIG,
  general: {
    enableAuditTrail: true,
    enablePerformanceMonitoring: true,
    maxBulkOperationSize: 100,
    defaultSessionTimeout: 3600000 // 1 hour
  }
};

/**
 * Domain Layer Health Report
 * 
 * Comprehensive health status for the entire domain layer
 */
export interface DomainLayerHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  
  // Component health
  repositories: RepositoryHealthReport;
  services: DomainServiceHealthReport;
  
  // Performance metrics
  performance: {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    cacheHitRate: number;
  };
  
  // Resource usage
  resources: {
    memoryUsage: number;
    activeConnections: number;
    queuedOperations: number;
  };
  
  // Error summary
  recentErrors: Array<{
    timestamp: Date;
    component: string;
    error: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Domain Events (for future extension)
 * 
 * Domain events that can be published when important
 * business operations occur in the domain layer.
 */
export interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  timestamp: Date;
  version: number;
  data: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Domain Event Publisher Interface (for future extension)
 */
export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
  unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
}
