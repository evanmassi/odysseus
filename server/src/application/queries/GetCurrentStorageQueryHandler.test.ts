/**
 * Current Storage Query Tests
 *
 * The lab read for demo limits happens only when explicitly requested.
 */

import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';

import { GetCurrentStorageQueryHandler } from './StorageQueries';

function makeHandler(opts: { demoLimits?: unknown } = {}) {
  const storage = { version: 1 };
  const storageRepository = {
    getForLab: jest.fn().mockResolvedValue(storage),
    ensureDefaultForLab: jest.fn(),
  } as unknown as StorageRepository;
  const findById = jest.fn().mockResolvedValue({ demoLimits: opts.demoLimits });
  const labRepository = { findById } as unknown as LabRepository;

  return {
    handler: new GetCurrentStorageQueryHandler(storageRepository, labRepository),
    storage,
    findById,
  };
}

describe('GetCurrentStorageQueryHandler', () => {
  it('grafts demo limits when requested', async () => {
    const { handler, storage, findById } = makeHandler({ demoLimits: { maxTubes: 5 } });

    const result = await handler.handle({ labId: 'l1', includeDemoLimits: true });

    expect(result.storage).toBe(storage);
    expect(result.demoLimits).toEqual({ maxTubes: 5 });
    expect(findById).toHaveBeenCalledWith('l1');
  });

  it('skips the lab read when demo limits are not requested', async () => {
    const { handler, findById } = makeHandler({ demoLimits: { maxTubes: 5 } });

    const result = await handler.handle({ labId: 'l1' });

    expect(result.demoLimits).toBeUndefined();
    expect(findById).not.toHaveBeenCalled();
  });
});
