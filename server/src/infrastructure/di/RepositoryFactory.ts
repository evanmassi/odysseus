/**
 * Repository Factory
 *
 * Lazy-singleton wiring for all repository implementations against PostgreSQL.
 */

import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { LookupValueRepository } from '@domain/repositories/LookupValueRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import type { DatabaseConnectionConfig } from '@infrastructure/database/PostgresContext';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { AuditRepository as AuditRepositoryImpl } from '@infrastructure/repositories/AuditRepository';
import { InviteCodeRepository as InviteCodeRepositoryImpl } from '@infrastructure/repositories/InviteCodeRepository';
import { LabRepository as LabRepositoryImpl } from '@infrastructure/repositories/LabRepository';
import { LookupValueRepository as LookupValueRepositoryImpl } from '@infrastructure/repositories/LookupValueRepository';
import { PersonRepository as PersonRepositoryImpl } from '@infrastructure/repositories/PersonRepository';
import { RefreshTokenRepository as RefreshTokenRepositoryImpl } from '@infrastructure/repositories/RefreshTokenRepository';
import { ResearcherRepository as ResearcherRepositoryImpl } from '@infrastructure/repositories/ResearcherRepository';
import { StorageRepository as StorageRepositoryImpl } from '@infrastructure/repositories/StorageRepository';
import { TubeRepository as TubeRepositoryImpl } from '@infrastructure/repositories/TubeRepository';
import { UserRepository as UserRepositoryImpl } from '@infrastructure/repositories/UserRepository';
import { UserSessionRepositoryImpl } from '@infrastructure/repositories/UserSessionRepository';

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

  constructor(databaseConfig: DatabaseConnectionConfig) {
    this.postgresContext = new PostgresContext(databaseConfig);
  }

  async initialize(): Promise<void> {
    await this.postgresContext.initialize();
  }

  getTubeRepository(): TubeRepository {
    if (!this.tubeRepository) {
      const configRepo = this.getStorageRepository();
      this.tubeRepository = new TubeRepositoryImpl(this.postgresContext, configRepo);
    }
    return this.tubeRepository;
  }

  getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepositoryImpl(this.postgresContext);
    }
    return this.userRepository;
  }

  getResearcherRepository(): ResearcherRepository {
    if (!this.researcherRepository) {
      this.researcherRepository = new ResearcherRepositoryImpl(this.postgresContext);
    }
    return this.researcherRepository;
  }

  getPersonRepository(): PersonRepository {
    if (!this.personRepository) {
      this.personRepository = new PersonRepositoryImpl(this.postgresContext);
    }
    return this.personRepository;
  }

  getStorageRepository(): StorageRepository {
    if (!this.storageRepository) {
      this.storageRepository = new StorageRepositoryImpl(this.postgresContext);
    }
    return this.storageRepository;
  }

  getRefreshTokenRepository(): RefreshTokenRepository {
    if (!this.refreshTokenRepository) {
      this.refreshTokenRepository = new RefreshTokenRepositoryImpl(this.postgresContext);
    }
    return this.refreshTokenRepository;
  }

  getUserSessionRepository(): UserSessionRepository {
    if (!this.userSessionRepository) {
      this.userSessionRepository = new UserSessionRepositoryImpl(this.postgresContext);
    }
    return this.userSessionRepository;
  }

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

  async close(): Promise<void> {
    await this.postgresContext.close();
  }

  getPostgresContext(): PostgresContext {
    return this.postgresContext;
  }
}
