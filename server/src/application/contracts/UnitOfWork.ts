/**
 * Unit of Work
 *
 * Runs a set of writes across several repositories as one atomic transaction. The repositories
 * handed to the callback are bound to that transaction; every other repository in the system —
 * including the ones event handlers hold — keeps its own connection and commits independently.
 */

import type { EquipmentCategory } from '@domain/entities/EquipmentCategory';
import type { ReagentCategory } from '@domain/entities/ReagentCategory';
import type { SupplyCategory } from '@domain/entities/SupplyCategory';
import type { AttributeRepository } from '@domain/repositories/AttributeRepository';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';
import type { DonorRepository } from '@domain/repositories/DonorRepository';
import type { EquipmentItemRepository } from '@domain/repositories/EquipmentItemRepository';
import type { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { LocationRepository } from '@domain/repositories/LocationRepository';
import type { LookupValueRepository } from '@domain/repositories/LookupValueRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ReagentItemRepository } from '@domain/repositories/ReagentItemRepository';
import type { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { SupplyItemRepository } from '@domain/repositories/SupplyItemRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { UserSessionRepository } from '@domain/repositories/UserSessionRepository';

export interface Repositories {
  tubes: TubeRepository;
  users: UserRepository;
  researchers: ResearcherRepository;
  persons: PersonRepository;
  storage: StorageRepository;
  refreshTokens: RefreshTokenRepository;
  userSessions: UserSessionRepository;
  audit: AuditRepository;
  lookupValues: LookupValueRepository;
  labs: LabRepository;
  inviteCodes: InviteCodeRepository;
  donors: DonorRepository;
  equipmentCategories: CategoryRepository<EquipmentCategory>;
  equipmentItems: EquipmentItemRepository;
  supplyCategories: CategoryRepository<SupplyCategory>;
  supplyItems: SupplyItemRepository;
  attributes: AttributeRepository;
  locations: LocationRepository;
  reagentCategories: CategoryRepository<ReagentCategory>;
  reagentItems: ReagentItemRepository;
}

export interface UnitOfWork {
  /** Commits on return, rolls back on throw. */
  withTransaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}
