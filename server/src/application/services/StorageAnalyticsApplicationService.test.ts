/**
 * Storage Analytics Service Tests
 *
 * Per-lab utilization roll-up (with near-capacity detection) and the cross-lab total.
 */

import type { Storage } from '@domain/entities/Storage';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';

import { StorageAnalyticsApplicationService } from './StorageAnalyticsApplicationService';

/** One tank / one rack / one 10-slot box named "A". */
function oneBoxStorage(): Storage {
  return {
    equipment: {
      getActiveTanks: () => [{ id: 'T1', name: 'Tank 1' }],
      getActiveRacksForTank: (tid: string) => (tid === 'T1' ? [{ id: 'R1', name: 'Rack 1' }] : []),
      getActiveBoxesForRack: (tid: string, rid: string) => (tid === 'T1' && rid === 'R1' ? [{ name: 'A', maxPositions: 10 }] : []),
    },
  } as unknown as Storage;
}

function makeService(opts: Record<string, unknown> = {}) {
  const storageRepository = {
    getForLab: jest.fn().mockResolvedValue(opts.storage ?? null),
    getForLabs: jest.fn().mockResolvedValue(opts.storageMap ?? new Map()),
  } as unknown as StorageRepository;
  const tubeRepository = {
    countGroupedByLocation: jest.fn().mockResolvedValue(opts.counts ?? []),
    countGroupedByLocationAllLabs: jest.fn().mockResolvedValue(opts.allCounts ?? []),
  } as unknown as TubeRepository;
  const labRepository = { findAll: jest.fn().mockResolvedValue(opts.labs ?? []) } as unknown as LabRepository;

  return new StorageAnalyticsApplicationService({ storageRepository, tubeRepository, labRepository });
}

describe('StorageAnalyticsApplicationService.getLabAnalytics', () => {
  it('returns an all-zero shape when the lab has no storage', async () => {
    const result = await makeService({ storage: null }).getLabAnalytics('l1');
    expect(result).toEqual({ totalPositions: 0, totalOccupied: 0, utilizationPercent: 0, tanks: [], nearCapacityBoxes: [] });
  });

  it('rolls up utilization and flags near-capacity boxes', async () => {
    const service = makeService({
      storage: oneBoxStorage(),
      counts: [{ tankId: 'T1', rackId: 'R1', boxId: 'A', count: 9 }],
    });

    const result = await service.getLabAnalytics('l1');

    expect(result).toMatchObject({ totalPositions: 10, totalOccupied: 9, utilizationPercent: 90 });
    expect(result.nearCapacityBoxes).toHaveLength(1);
    expect(result.nearCapacityBoxes[0]).toMatchObject({ boxName: 'A', occupied: 9, maxPositions: 10 });
  });
});

describe('StorageAnalyticsApplicationService.getCrossLabAnalytics', () => {
  it('sums utilization across labs', async () => {
    const service = makeService({
      labs: [{ id: 'l1', name: 'Lab 1' }],
      storageMap: new Map([['l1', oneBoxStorage()]]),
      allCounts: [{ labId: 'l1', tankId: 'T1', rackId: 'R1', boxId: 'A', count: 9 }],
    });

    const result = await service.getCrossLabAnalytics();

    expect(result).toMatchObject({ totalPositions: 10, totalOccupied: 9, utilizationPercent: 90 });
    expect(result.labs[0]).toMatchObject({ labId: 'l1', totalPositions: 10, totalOccupied: 9 });
  });
});
