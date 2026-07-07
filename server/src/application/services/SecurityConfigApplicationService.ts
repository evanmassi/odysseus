/**
 * Security Configuration Service
 *
 * Reads and updates lab security settings; blocks writes from demo accounts.
 */

import type { User } from '@domain/entities/User';
import { PermissionError } from '@domain/errors/PermissionError';
import type { StorageRepository } from '@domain/repositories/StorageRepository';

import type { SecurityConfig } from '@odysseus/shared-schemas';

export interface SecurityConfigApplicationServiceDeps {
  storageRepository: StorageRepository;
}

export class SecurityConfigApplicationService {
  constructor(private deps: SecurityConfigApplicationServiceDeps) {}

  getSecurityConfig(): Promise<SecurityConfig> {
    return this.deps.storageRepository.getSecurityConfig();
  }

  async updateSecurityConfig(updates: Partial<SecurityConfig>, user: User): Promise<SecurityConfig> {
    if (user.isDemo) {
      throw new PermissionError('Security configuration changes are restricted in the demo environment');
    }
    return this.deps.storageRepository.updateSecurityConfig(updates);
  }
}
