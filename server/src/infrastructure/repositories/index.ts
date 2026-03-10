import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { TubeRepository as TubeRepositoryImpl } from '@infrastructure/repositories/TubeRepository';
import { UserRepository as UserRepositoryImpl } from '@infrastructure/repositories/UserRepository';
import { ResearcherRepository as ResearcherRepositoryImpl } from '@infrastructure/repositories/ResearcherRepository';
import { PersonRepository as PersonRepositoryImpl } from '@infrastructure/repositories/PersonRepository';
import { StorageRepository as StorageRepositoryImpl } from '@infrastructure/repositories/StorageRepository';
import { RefreshTokenRepository as RefreshTokenRepositoryImpl } from '@infrastructure/repositories/RefreshTokenRepository';
import { UserSessionRepositoryImpl } from '@infrastructure/repositories/UserSessionRepository';
import { AuditRepository as AuditRepositoryImpl } from '@infrastructure/repositories/AuditRepository';
import { LookupValueRepository as LookupValueRepositoryImpl } from '@infrastructure/repositories/LookupValueRepository';
import { LabRepository as LabRepositoryImpl } from '@infrastructure/repositories/LabRepository';
import { InviteCodeRepository as InviteCodeRepositoryImpl } from '@infrastructure/repositories/InviteCodeRepository';

// Repository interfaces
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { StorageRepository } from '@domain/repositories/StorageRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import { AuditRepository } from '@domain/repositories/AuditRepository';
import { LookupValueRepository } from '@domain/repositories/LookupValueRepository';
import { LabRepository } from '@domain/repositories/LabRepository';
import { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';

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
  private storageRepository?: StorageRepository;
  private refreshTokenRepository?: RefreshTokenRepository;
  private userSessionRepository?: UserSessionRepository;
  private auditRepository?: AuditRepository;
  private lookupValueRepository?: LookupValueRepository;
  private labRepository?: LabRepository;
  private inviteCodeRepository?: InviteCodeRepository;

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
      const configRepo = this.getStorageRepository();
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
  getStorageRepository(): StorageRepository {
    if (!this.storageRepository) {
      this.storageRepository = new StorageRepositoryImpl(this.postgresContext);
    }
    return this.storageRepository;
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
      this.userSessionRepository = new UserSessionRepositoryImpl(this.postgresContext);
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

  getLabRepository(): LabRepository {
    if (!this.labRepository) {
      this.labRepository = new LabRepositoryImpl(this.postgresContext);
    }
    return this.labRepository;
  }

  getInviteCodeRepository(): InviteCodeRepository {
    if (!this.inviteCodeRepository) {
      this.inviteCodeRepository = new InviteCodeRepositoryImpl(this.postgresContext);
    }
    return this.inviteCodeRepository;
  }

  getRepositories() {
    return {
      tubes: this.getTubeRepository(),
      users: this.getUserRepository(),
      researchers: this.getResearcherRepository(),
      persons: this.getPersonRepository(),
      storage: this.getStorageRepository(),
      refreshTokens: this.getRefreshTokenRepository(),
      userSessions: this.getUserSessionRepository(),
      audit: this.getAuditRepository(),
      lookupValues: this.getLookupValueRepository(),
      labs: this.getLabRepository(),
      inviteCodes: this.getInviteCodeRepository()
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
        repositories.storage.isHealthy()
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
