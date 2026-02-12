import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { TubeRepository as TubeRepositoryImpl } from '@infrastructure/repositories/TubeRepository';
import { UserRepository as UserRepositoryImpl } from '@infrastructure/repositories/UserRepository';
import { ResearcherRepository as ResearcherRepositoryImpl } from '@infrastructure/repositories/ResearcherRepository';
import { PersonRepository as PersonRepositoryImpl } from '@infrastructure/repositories/PersonRepository';
import { ConfigurationRepository as ConfigurationRepositoryImpl } from '@infrastructure/repositories/ConfigurationRepository';
import { RefreshTokenRepository as RefreshTokenRepositoryImpl } from '@infrastructure/repositories/RefreshTokenRepository';
import { SessionRepository as SessionRepositoryImpl } from '@infrastructure/repositories/SessionRepository';
import { AuditRepository as AuditRepositoryImpl } from '@infrastructure/repositories/AuditRepository';
import { LookupValueRepository as LookupValueRepositoryImpl } from '@infrastructure/repositories/LookupValueRepository';

// Repository interfaces
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { AuditRepository } from '@domain/repositories/AuditRepository';
import { LookupValueRepository } from '@domain/repositories/LookupValueRepository';

/**
 * Repository Factory - Dependency injection
 *
 * Creates and manages all repository instances.
 * All repositories use PostgreSQL.
 */
export class RepositoryFactory {
  private postgresContext: PostgresContext;
  private tubeRepository?: TubeRepository;
  private userRepository?: UserRepository;
  private researcherRepository?: ResearcherRepository;
  private personRepository?: PersonRepository;
  private configurationRepository?: ConfigurationRepository;
  private refreshTokenRepository?: RefreshTokenRepository;
  private userSessionRepository?: UserSessionRepository;
  private auditRepository?: AuditRepository;
  private lookupValueRepository?: LookupValueRepository;

  constructor() {
    this.postgresContext = new PostgresContext();
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    await this.postgresContext.initialize();
  }

  /**
   * Get tube repository instance
   */
  getTubeRepository(): TubeRepository {
    if (!this.tubeRepository) {
      const configRepo = this.getConfigurationRepository();
      this.tubeRepository = new TubeRepositoryImpl(this.postgresContext, configRepo);
    }
    return this.tubeRepository;
  }

  /**
   * Get user repository instance
   */
  getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepositoryImpl(this.postgresContext);
    }
    return this.userRepository;
  }

  /**
   * Get researcher repository instance
   */
  getResearcherRepository(): ResearcherRepository {
    if (!this.researcherRepository) {
      const personRepo = this.getPersonRepository();
      this.researcherRepository = new ResearcherRepositoryImpl(this.postgresContext, personRepo);
    }
    return this.researcherRepository;
  }

  /**
   * Get person repository instance
   */
  getPersonRepository(): PersonRepository {
    if (!this.personRepository) {
      this.personRepository = new PersonRepositoryImpl(this.postgresContext);
    }
    return this.personRepository;
  }

  /**
   * Get configuration repository instance
   */
  getConfigurationRepository(): ConfigurationRepository {
    if (!this.configurationRepository) {
      this.configurationRepository = new ConfigurationRepositoryImpl(this.postgresContext);
    }
    return this.configurationRepository;
  }

  /**
   * Get refresh token repository instance
   */
  getRefreshTokenRepository(): RefreshTokenRepository {
    if (!this.refreshTokenRepository) {
      this.refreshTokenRepository = new RefreshTokenRepositoryImpl(this.postgresContext);
    }
    return this.refreshTokenRepository;
  }

  /**
   * Get user session repository instance
   */
  getUserSessionRepository(): UserSessionRepository {
    if (!this.userSessionRepository) {
      this.userSessionRepository = new SessionRepositoryImpl(this.postgresContext);
    }
    return this.userSessionRepository;
  }

  /**
   * Get audit repository instance
   */
  getAuditRepository(): AuditRepository {
    if (!this.auditRepository) {
      this.auditRepository = new AuditRepositoryImpl(this.postgresContext);
    }
    return this.auditRepository;
  }

  getLookupValueRepository(): LookupValueRepository {
    if (!this.lookupValueRepository) {
      this.lookupValueRepository = new LookupValueRepositoryImpl(this.postgresContext);
    }
    return this.lookupValueRepository;
  }

  getRepositories() {
    return {
      tubes: this.getTubeRepository(),
      users: this.getUserRepository(),
      researchers: this.getResearcherRepository(),
      persons: this.getPersonRepository(),
      configurations: this.getConfigurationRepository(),
      refreshTokens: this.getRefreshTokenRepository(),
      userSessions: this.getUserSessionRepository(),
      audit: this.getAuditRepository(),
      lookupValues: this.getLookupValueRepository()
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
   * Close database connection
   */
  async close(): Promise<void> {
    await this.postgresContext.close();
  }

  /**
   * Get PostgreSQL context
   */
  getPostgresContext(): PostgresContext {
    return this.postgresContext;
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
export function initializeRepositories(): RepositoryFactory {
  repositoryFactory = new RepositoryFactory();
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
