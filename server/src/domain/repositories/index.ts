/**
 * Domain Repository Interfaces
 *
 * Barrel file for all repository contracts and supporting types.
 */

// Repository Interfaces
export { AuditRepository } from './AuditRepository';
export { AuditArchiveRepository } from './AuditArchiveRepository';
export { TubeRepository } from './TubeRepository';
export { UserRepository } from './UserRepository';
export { ResearcherRepository, ResearcherValidationResult, DuplicateCheckResult } from './ResearcherRepository';
export { StorageRepository, StorageHistory } from './StorageRepository';
export { LabRepository } from './LabRepository';
export { InviteCodeRepository } from './InviteCodeRepository';
export { RefreshTokenRepository } from './RefreshTokenRepository';

// Repository Types
export type { TubeSearchCriteria, ResearcherSearchCriteria, UserSearchCriteria } from '@domain/types/repository/searchCriteria';
export type { TubeRepositoryStats, ResearcherUsageStats, ResearcherRepositoryStats, UserRepositoryStats, EquipmentSummary, CapacityInfo, StorageRepositoryStats } from '@domain/types/repository/stats';

import { TubeRepository } from './TubeRepository';
import { UserRepository } from './UserRepository';
import { ResearcherRepository } from './ResearcherRepository';
import { StorageRepository } from './StorageRepository';
import { RefreshTokenRepository } from './RefreshTokenRepository';
import { LabRepository } from './LabRepository';
import { InviteCodeRepository } from './InviteCodeRepository';

export interface RepositoryFactory {
  createTubeRepository(): TubeRepository;
  createUserRepository(): UserRepository;
  createResearcherRepository(): ResearcherRepository;
  createStorageRepository(): StorageRepository;
  createRefreshTokenRepository(): RefreshTokenRepository;
  createLabRepository(): LabRepository;
  createInviteCodeRepository(): InviteCodeRepository;
  initialize(): Promise<void>;
  close(): Promise<void>;
  isHealthy(): Promise<boolean>;
}

export interface RepositoryManager {
  tubes: TubeRepository;
  users: UserRepository;
  researchers: ResearcherRepository;
  configuration: StorageRepository;
  refreshTokens: RefreshTokenRepository;
  labs: LabRepository;
  inviteCodes: InviteCodeRepository;

  executeTransaction<T>(operation: (repositories: RepositoryManager) => Promise<T>): Promise<T>;
  initialize(): Promise<void>;
  close(): Promise<void>;
  checkHealth(): Promise<RepositoryHealthReport>;
}

export interface RepositoryHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  repositories: {
    tubes: 'healthy' | 'unhealthy';
    users: 'healthy' | 'unhealthy';
    researchers: 'healthy' | 'unhealthy';
    configuration: 'healthy' | 'unhealthy';
    refreshTokens: 'healthy' | 'unhealthy';
    labs: 'healthy' | 'unhealthy';
    inviteCodes: 'healthy' | 'unhealthy';
  };
  details: {
    [key: string]: string;
  };
  timestamp: Date;
}
