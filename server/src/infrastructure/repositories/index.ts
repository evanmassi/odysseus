import { SQLiteContext } from '@infrastructure/database/SQLiteContext';
import { SQLiteTubeRepository } from '@infrastructure/repositories/SQLiteTubeRepository';
import { SQLiteUserRepository } from '@infrastructure/repositories/SQLiteUserRepository';
import { SQLiteResearcherRepository } from '@infrastructure/repositories/SQLiteResearcherRepository';
import { SQLitePersonRepository } from '@infrastructure/repositories/SQLitePersonRepository';
import { SQLiteConfigurationRepository } from '@infrastructure/repositories/SQLiteConfigurationRepository';
import { SQLiteRefreshTokenRepository } from '@infrastructure/repositories/SQLiteRefreshTokenRepository';
import { SQLiteSessionRepository } from '@infrastructure/repositories/SQLiteSessionRepository';

// Repository interfaces
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';

/**
 * Repository Factory - Dependency injection
 *
 * Creates and manages all repository instances with shared SQLite context.
 * Clean separation of concerns and centralized configuration.
 */
export class RepositoryFactory {
  private sqliteContext: SQLiteContext;
  private tubeRepository?: TubeRepository;
  private userRepository?: UserRepository;
  private researcherRepository?: ResearcherRepository;
  private personRepository?: PersonRepository;
  private configurationRepository?: ConfigurationRepository;
  private refreshTokenRepository?: RefreshTokenRepository;
  private userSessionRepository?: UserSessionRepository;

  constructor(dbPath: string) {
    this.sqliteContext = new SQLiteContext(dbPath);
  }

  /**
   * Initialize database and repositories
   */
  async initialize(): Promise<void> {
    await this.sqliteContext.initialize();
  }

  /**
   * Get tube repository instance
   */
  getTubeRepository(): TubeRepository {
    if (!this.tubeRepository) {
      // Inject ConfigurationRepository for position label parsing
      const configRepo = this.getConfigurationRepository();
      this.tubeRepository = new SQLiteTubeRepository(this.sqliteContext, configRepo);
    }
    return this.tubeRepository;
  }

  /**
   * Get user repository instance
   */
  getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new SQLiteUserRepository(this.sqliteContext);
    }
    return this.userRepository;
  }

  /**
   * Get researcher repository instance
   */
  getResearcherRepository(): ResearcherRepository {
    if (!this.researcherRepository) {
      const personRepo = this.getPersonRepository();
      this.researcherRepository = new SQLiteResearcherRepository(this.sqliteContext, personRepo);
    }
    return this.researcherRepository;
  }

  /**
   * Get person repository instance
   */
  getPersonRepository(): PersonRepository {
    if (!this.personRepository) {
      this.personRepository = new SQLitePersonRepository(this.sqliteContext);
    }
    return this.personRepository;
  }

  /**
   * Get configuration repository instance
   */
  getConfigurationRepository(): ConfigurationRepository {
    if (!this.configurationRepository) {
      this.configurationRepository = new SQLiteConfigurationRepository(this.sqliteContext);
    }
    return this.configurationRepository;
  }

  /**
   * Get refresh token repository instance
   */
  getRefreshTokenRepository(): RefreshTokenRepository {
    if (!this.refreshTokenRepository) {
      this.refreshTokenRepository = new SQLiteRefreshTokenRepository(this.sqliteContext);
    }
    return this.refreshTokenRepository;
  }

  /**
   * Get user session repository instance
   */
  getUserSessionRepository(): UserSessionRepository {
    if (!this.userSessionRepository) {
      this.userSessionRepository = new SQLiteSessionRepository(this.sqliteContext);
    }
    return this.userSessionRepository;
  }

  /**
   * Get SQLite context instance
   */
  getSQLiteContext(): SQLiteContext {
    return this.sqliteContext;
  }

  /**
   * Get all repositories as a single object
   */
  getRepositories() {
    return {
      tubes: this.getTubeRepository(),
      users: this.getUserRepository(),
      researchers: this.getResearcherRepository(),
      persons: this.getPersonRepository(),
      configurations: this.getConfigurationRepository(),
      refreshTokens: this.getRefreshTokenRepository(),
      userSessions: this.getUserSessionRepository()
    };
  }

  /**
   * Check if all repositories are healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const repositories = this.getRepositories();
      const healthChecks = await Promise.all([
        repositories.tubes.isHealthy(),
        repositories.users.isHealthy(),
        repositories.researchers.isHealthy(),
        repositories.configurations.isHealthy()
      ]);
      return healthChecks.every(healthy => healthy);
    } catch {
      return false;
    }
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    await this.sqliteContext.close();
  }
}

/**
 * Global repository factory instance
 * Will be initialized in server startup
 */
export let repositoryFactory: RepositoryFactory;

/**
 * Initialize global repository factory
 */
export function initializeRepositories(dbPath: string): RepositoryFactory {
  repositoryFactory = new RepositoryFactory(dbPath);
  return repositoryFactory;
}

/**
 * Get initialized repository factory
 */
export function getRepositoryFactory(): RepositoryFactory {
  if (!repositoryFactory) {
    throw new Error('Repository factory not initialized. Call initializeRepositories() first.');
  }
  return repositoryFactory;
}
