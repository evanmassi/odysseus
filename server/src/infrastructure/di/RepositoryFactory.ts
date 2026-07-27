/**
 * Repository Factory
 *
 * Lazy-singleton wiring for all repository implementations against PostgreSQL.
 */

import type { Repositories, UnitOfWork } from '@application/contracts/UnitOfWork';
import { EquipmentCategory } from '@domain/entities/EquipmentCategory';
import { ReagentCategory } from '@domain/entities/ReagentCategory';
import { SupplyCategory } from '@domain/entities/SupplyCategory';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';
import type { DonorRepository } from '@domain/repositories/DonorRepository';
import type { EquipmentItemRepository } from '@domain/repositories/EquipmentItemRepository';
import type { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { LookupValueRepository } from '@domain/repositories/LookupValueRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ReagentItemRepository } from '@domain/repositories/ReagentItemRepository';
import type { ReagentLocationRepository } from '@domain/repositories/ReagentLocationRepository';
import type { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { SupplyItemRepository } from '@domain/repositories/SupplyItemRepository';
import type { SupplyLocationRepository } from '@domain/repositories/SupplyLocationRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';
import type { DatabaseConnectionConfig } from '@infrastructure/database/PostgresContext';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';
import { TransactionalContext } from '@infrastructure/database/TransactionalContext';
import { AuditRepository as AuditRepositoryImpl } from '@infrastructure/repositories/AuditRepository';
import {
  CategoryRepository as CategoryRepositoryImpl,
  EQUIPMENT_CATEGORY_TABLES,
  REAGENT_CATEGORY_TABLES,
  SUPPLY_CATEGORY_TABLES,
} from '@infrastructure/repositories/CategoryRepository';
import { DonorRepository as DonorRepositoryImpl } from '@infrastructure/repositories/DonorRepository';
import { EquipmentItemRepository as EquipmentItemRepositoryImpl } from '@infrastructure/repositories/EquipmentItemRepository';
import { InviteCodeRepository as InviteCodeRepositoryImpl } from '@infrastructure/repositories/InviteCodeRepository';
import { LabRepository as LabRepositoryImpl } from '@infrastructure/repositories/LabRepository';
import { LookupValueRepository as LookupValueRepositoryImpl } from '@infrastructure/repositories/LookupValueRepository';
import { PersonRepository as PersonRepositoryImpl } from '@infrastructure/repositories/PersonRepository';
import { ReagentItemRepository as ReagentItemRepositoryImpl } from '@infrastructure/repositories/ReagentItemRepository';
import { ReagentLocationRepository as ReagentLocationRepositoryImpl } from '@infrastructure/repositories/ReagentLocationRepository';
import { RefreshTokenRepository as RefreshTokenRepositoryImpl } from '@infrastructure/repositories/RefreshTokenRepository';
import { ResearcherRepository as ResearcherRepositoryImpl } from '@infrastructure/repositories/ResearcherRepository';
import { StorageRepository as StorageRepositoryImpl } from '@infrastructure/repositories/StorageRepository';
import { SupplyItemRepository as SupplyItemRepositoryImpl } from '@infrastructure/repositories/SupplyItemRepository';
import { SupplyLocationRepository as SupplyLocationRepositoryImpl } from '@infrastructure/repositories/SupplyLocationRepository';
import { TubeRepository as TubeRepositoryImpl } from '@infrastructure/repositories/TubeRepository';
import { UserRepository as UserRepositoryImpl } from '@infrastructure/repositories/UserRepository';
import { UserSessionRepository as UserSessionRepositoryImpl } from '@infrastructure/repositories/UserSessionRepository';

export class RepositoryFactory implements UnitOfWork {
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
  private donorRepository?: DonorRepository;
  private equipmentCategoryRepository?: CategoryRepository<EquipmentCategory>;
  private equipmentItemRepository?: EquipmentItemRepository;
  private supplyCategoryRepository?: CategoryRepository<SupplyCategory>;
  private supplyItemRepository?: SupplyItemRepository;
  private supplyLocationRepository?: SupplyLocationRepository;
  private reagentCategoryRepository?: CategoryRepository<ReagentCategory>;
  private reagentItemRepository?: ReagentItemRepository;
  private reagentLocationRepository?: ReagentLocationRepository;

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

  getDonorRepository(): DonorRepository {
    if (!this.donorRepository) {
      this.donorRepository = new DonorRepositoryImpl(this.postgresContext);
    }
    return this.donorRepository;
  }

  getEquipmentCategoryRepository(): CategoryRepository<EquipmentCategory> {
    if (!this.equipmentCategoryRepository) {
      this.equipmentCategoryRepository = this.buildEquipmentCategoryRepository(
        this.postgresContext
      );
    }
    return this.equipmentCategoryRepository;
  }

  getEquipmentItemRepository(): EquipmentItemRepository {
    if (!this.equipmentItemRepository) {
      this.equipmentItemRepository = new EquipmentItemRepositoryImpl(this.postgresContext);
    }
    return this.equipmentItemRepository;
  }

  getSupplyCategoryRepository(): CategoryRepository<SupplyCategory> {
    if (!this.supplyCategoryRepository) {
      this.supplyCategoryRepository = this.buildSupplyCategoryRepository(this.postgresContext);
    }
    return this.supplyCategoryRepository;
  }

  getSupplyItemRepository(): SupplyItemRepository {
    if (!this.supplyItemRepository) {
      this.supplyItemRepository = new SupplyItemRepositoryImpl(this.postgresContext);
    }
    return this.supplyItemRepository;
  }

  getSupplyLocationRepository(): SupplyLocationRepository {
    if (!this.supplyLocationRepository) {
      this.supplyLocationRepository = new SupplyLocationRepositoryImpl(this.postgresContext);
    }
    return this.supplyLocationRepository;
  }

  getReagentCategoryRepository(): CategoryRepository<ReagentCategory> {
    if (!this.reagentCategoryRepository) {
      this.reagentCategoryRepository = this.buildReagentCategoryRepository(this.postgresContext);
    }
    return this.reagentCategoryRepository;
  }

  getReagentItemRepository(): ReagentItemRepository {
    if (!this.reagentItemRepository) {
      this.reagentItemRepository = new ReagentItemRepositoryImpl(this.postgresContext);
    }
    return this.reagentItemRepository;
  }

  getReagentLocationRepository(): ReagentLocationRepository {
    if (!this.reagentLocationRepository) {
      this.reagentLocationRepository = new ReagentLocationRepositoryImpl(this.postgresContext);
    }
    return this.reagentLocationRepository;
  }

  getRepositories(): Repositories {
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
      inviteCodes: this.getInviteCodeRepository(),
      donors: this.getDonorRepository(),
      equipmentCategories: this.getEquipmentCategoryRepository(),
      equipmentItems: this.getEquipmentItemRepository(),
      supplyCategories: this.getSupplyCategoryRepository(),
      supplyItems: this.getSupplyItemRepository(),
      supplyLocations: this.getSupplyLocationRepository(),
      reagentCategories: this.getReagentCategoryRepository(),
      reagentItems: this.getReagentItemRepository(),
      reagentLocations: this.getReagentLocationRepository(),
    };
  }

  /**
   * Runs `work` inside one transaction. The repositories passed to it are freshly bound to that
   * transaction's client — distinct from the pool-backed singletons above, which is what keeps
   * event-handler writes (audit) out of the caller's transaction and safe from its rollback.
   */
  async withTransaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return this.postgresContext.transaction(async client => {
      return work(this.buildRepositories(new TransactionalContext(client)));
    });
  }

  private buildEquipmentCategoryRepository(db: Queryable): CategoryRepository<EquipmentCategory> {
    return new CategoryRepositoryImpl(db, EQUIPMENT_CATEGORY_TABLES, data =>
      EquipmentCategory.fromData(data)
    );
  }

  private buildSupplyCategoryRepository(db: Queryable): CategoryRepository<SupplyCategory> {
    return new CategoryRepositoryImpl(db, SUPPLY_CATEGORY_TABLES, data =>
      SupplyCategory.fromData(data)
    );
  }

  private buildReagentCategoryRepository(db: Queryable): CategoryRepository<ReagentCategory> {
    return new CategoryRepositoryImpl(db, REAGENT_CATEGORY_TABLES, data =>
      ReagentCategory.fromData(data)
    );
  }

  private buildRepositories(db: Queryable): Repositories {
    const storage = new StorageRepositoryImpl(db);

    return {
      tubes: new TubeRepositoryImpl(db, storage),
      users: new UserRepositoryImpl(db),
      researchers: new ResearcherRepositoryImpl(db),
      persons: new PersonRepositoryImpl(db),
      storage,
      refreshTokens: new RefreshTokenRepositoryImpl(db),
      userSessions: new UserSessionRepositoryImpl(db),
      audit: new AuditRepositoryImpl(db),
      lookupValues: new LookupValueRepositoryImpl(db),
      labs: new LabRepositoryImpl(db),
      inviteCodes: new InviteCodeRepositoryImpl(db),
      donors: new DonorRepositoryImpl(db),
      equipmentCategories: this.buildEquipmentCategoryRepository(db),
      equipmentItems: new EquipmentItemRepositoryImpl(db),
      supplyCategories: this.buildSupplyCategoryRepository(db),
      supplyItems: new SupplyItemRepositoryImpl(db),
      supplyLocations: new SupplyLocationRepositoryImpl(db),
      reagentCategories: this.buildReagentCategoryRepository(db),
      reagentItems: new ReagentItemRepositoryImpl(db),
      reagentLocations: new ReagentLocationRepositoryImpl(db),
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const repositories = this.getRepositories();
      const healthChecks = await Promise.all([
        repositories.tubes.isHealthy(),
        repositories.users.isHealthy(),
        repositories.researchers.isHealthy(),
        repositories.storage.isHealthy(),
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
