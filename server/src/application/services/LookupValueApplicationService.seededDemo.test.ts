/**
 * Lookup Value Seeded-Demo Guard Tests
 *
 * Mutations are locked for demo users once the demo lab is seeded; system admins
 * and non-demo users are exempt.
 */

import type { User } from '@domain/entities/User';
import { ValidationError } from '@domain/errors/ValidationError';
import type { LookupValueRepository } from '@domain/repositories/LookupValueRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';

import { LookupValueApplicationService } from './LookupValueApplicationService';

function makeService(opts: { seeded?: boolean } = {}) {
  const lookupValueRepository = {
    findByCategoryAndValue: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
  } as unknown as LookupValueRepository;
  const storageRepository = {
    getForLab: jest.fn().mockResolvedValue({ hasAnySeededResources: () => opts.seeded ?? false }),
  } as unknown as StorageRepository;

  return new LookupValueApplicationService(lookupValueRepository, undefined, undefined, undefined, storageRepository);
}

const admin = { isSystemAdmin: () => true, isDemo: false } as unknown as User;
const demoUser = { isSystemAdmin: () => false, isDemo: true } as unknown as User;
const normalUser = { isSystemAdmin: () => false, isDemo: false } as unknown as User;

describe('LookupValueApplicationService seeded-demo guard', () => {
  it('blocks a demo user when the catalog is seeded', async () => {
    const service = makeService({ seeded: true });
    await expect(service.create('l1', 'species', 'Human', demoUser)).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows a demo user when the catalog is not seeded', async () => {
    const service = makeService({ seeded: false });
    await expect(service.create('l1', 'species', 'Human', demoUser)).resolves.toBeDefined();
  });

  it('exempts a system admin even when seeded', async () => {
    const service = makeService({ seeded: true });
    await expect(service.create('l1', 'species', 'Human', admin)).resolves.toBeDefined();
  });

  it('does not gate a non-demo user', async () => {
    const service = makeService({ seeded: true });
    await expect(service.create('l1', 'species', 'Human', normalUser)).resolves.toBeDefined();
  });
});
