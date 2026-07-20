/**
 * System Metrics Query Handler Tests
 *
 * Confirms the lab id is threaded through to the repository read.
 */

import type { StorageRepository } from '@domain/repositories/StorageRepository';

import { GetSystemMetricsQueryHandler } from './StorageQueries';

import type { SystemMetrics } from '@odysseus/shared-schemas';

describe('GetSystemMetricsQueryHandler', () => {
  it('forwards the lab id to the repository', async () => {
    const metrics = { totalTubes: 3 } as unknown as SystemMetrics;
    const getSystemMetrics = jest.fn<Promise<SystemMetrics>, [string]>().mockResolvedValue(metrics);
    const storageRepository = { getSystemMetrics } as unknown as StorageRepository;

    const handler = new GetSystemMetricsQueryHandler(storageRepository);
    const result = await handler.handle({ labId: 'lab_1' });

    expect(getSystemMetrics).toHaveBeenCalledWith('lab_1');
    expect(result).toBe(metrics);
  });
});
