/**
 * Domain Repository Interfaces
 * 
 * These interfaces define the contracts for data access operations
 * that the domain layer requires. Infrastructure implementations
 * will provide the concrete implementations of these interfaces.
 * 
 * Key Principles:
 * - Domain-focused: Methods express business needs, not technical details
 * - Technology-agnostic: No database-specific concepts
 * - Rich queries: Support complex business queries efficiently
 * - Type-safe: Full TypeScript support with proper return types
 * - Async by default: All operations return Promises for scalability
 */

// Repository Interfaces
export { TubeRepository, TubeSearchCriteria, TubeRepositoryStats } from './TubeRepository';
export { UserRepository, UserSearchCriteria, UserActivitySummary, UserRepositoryStats } from './UserRepository';
export { ResearcherRepository, ResearcherSearchCriteria, ResearcherUsageStats, ResearcherRepositoryStats, ValidationResult, DuplicateCheckResult } from './ResearcherRepository';
export { ConfigurationRepository, ConfigurationHistory, EquipmentSummary, CapacityInfo, ConfigurationExport, ConfigurationSnapshot, ApiConfigurationResponse, FrontendConfiguration, ConfigurationValidationResult, ConfigurationRepositoryStats, MaintenanceResult } from './ConfigurationRepository';
export { RefreshTokenRepository } from './RefreshTokenRepository';

// Import types for use in interfaces below
import { TubeRepository } from './TubeRepository';
import { UserRepository } from './UserRepository';
import { ResearcherRepository } from './ResearcherRepository';
import { ConfigurationRepository } from './ConfigurationRepository';
import { RefreshTokenRepository } from './RefreshTokenRepository';

/**
 * Repository Factory Interface
 * 
 * Defines how infrastructure layer provides repository implementations
 * to the application layer. This enables dependency injection and
 * makes testing with mock repositories possible.
 */
export interface RepositoryFactory {
  /**
   * Create tube repository instance
   */
  createTubeRepository(): TubeRepository;
  
  /**
   * Create user repository instance
   */
  createUserRepository(): UserRepository;
  
  /**
   * Create researcher repository instance
   */
  createResearcherRepository(): ResearcherRepository;
  
  /**
   * Create configuration repository instance
   */
  createConfigurationRepository(): ConfigurationRepository;
  
  /**
   * Create refresh token repository instance
   */
  createRefreshTokenRepository(): RefreshTokenRepository;
  
  /**
   * Initialize all repositories (setup connections, migrations, etc.)
   */
  initialize(): Promise<void>;
  
  /**
   * Close all repository connections
   */
  close(): Promise<void>;
  
  /**
   * Check if repositories are healthy
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Repository Manager Interface
 * 
 * Provides a unified interface for managing multiple repositories
 * and handling cross-repository operations like transactions.
 */
export interface RepositoryManager {
  // Repository access
  tubes: TubeRepository;
  users: UserRepository;
  researchers: ResearcherRepository;
  configuration: ConfigurationRepository;
  refreshTokens: RefreshTokenRepository;
  
  /**
   * Execute operations within a transaction
   */
  executeTransaction<T>(operation: (repositories: RepositoryManager) => Promise<T>): Promise<T>;
  
  /**
   * Initialize all repositories
   */
  initialize(): Promise<void>;
  
  /**
   * Close all repositories
   */
  close(): Promise<void>;
  
  /**
   * Check health of all repositories
   */
  checkHealth(): Promise<RepositoryHealthReport>;
}

/**
 * Health report for repository system
 */
export interface RepositoryHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  repositories: {
    tubes: 'healthy' | 'unhealthy';
    users: 'healthy' | 'unhealthy';
    researchers: 'healthy' | 'unhealthy';
    configuration: 'healthy' | 'unhealthy';
    refreshTokens: 'healthy' | 'unhealthy';
  };
  details: {
    [key: string]: string; // Error messages or status details
  };
  timestamp: Date;
}
