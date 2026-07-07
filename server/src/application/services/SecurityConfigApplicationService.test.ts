/**
 * Security Configuration Service Tests
 *
 * Reads pass through to the repo; writes are blocked for demo accounts.
 */

import type { User } from '@domain/entities/User';
import { PermissionError } from '@domain/errors/PermissionError';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import { createTestUser } from '@domain/__tests__/helpers';

import { SecurityConfigApplicationService } from './SecurityConfigApplicationService';

import type { SecurityConfig } from '@odysseus/shared-schemas';

const CONFIG = { passwordMinLength: 8 } as unknown as SecurityConfig;

function makeService() {
  const getSecurityConfig = jest.fn<Promise<SecurityConfig>, []>().mockResolvedValue(CONFIG);
  const updateSecurityConfig = jest.fn<Promise<SecurityConfig>, [Partial<SecurityConfig>]>()
    .mockImplementation(async (updates) => ({ ...CONFIG, ...updates }));
  const storageRepository = { getSecurityConfig, updateSecurityConfig } as unknown as StorageRepository;

  const service = new SecurityConfigApplicationService({ storageRepository });
  return { service, getSecurityConfig, updateSecurityConfig };
}

describe('SecurityConfigApplicationService', () => {
  it('returns the stored security config', async () => {
    const { service, getSecurityConfig } = makeService();

    const result = await service.getSecurityConfig();

    expect(getSecurityConfig).toHaveBeenCalled();
    expect(result).toBe(CONFIG);
  });

  it('forwards updates to the repo for a non-demo user', async () => {
    const { service, updateSecurityConfig } = makeService();
    const user = createTestUser({ labId: 'lab_1' }); // isDemo === false

    const result = await service.updateSecurityConfig({ passwordMinLength: 12 }, user);

    expect(updateSecurityConfig).toHaveBeenCalledWith({ passwordMinLength: 12 });
    expect(result.passwordMinLength).toBe(12);
  });

  it('rejects updates from a demo user without touching the repo', async () => {
    const { service, updateSecurityConfig } = makeService();
    const demoUser = { isDemo: true } as unknown as User;

    await expect(
      service.updateSecurityConfig({ passwordMinLength: 12 }, demoUser)
    ).rejects.toBeInstanceOf(PermissionError);
    expect(updateSecurityConfig).not.toHaveBeenCalled();
  });
});
