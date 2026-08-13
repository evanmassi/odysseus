/**
 * Tube Location Counts Service
 *
 * Covers getLocationCounts: the view-permission gate runs first, and per-box
 * counts are filtered to the user's accessible tanks so a restricted user never
 * sees occupancy for tanks outside their scope.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { TubePositionService } from '@domain/services/TubePositionService';
import { createTestUser } from '@domain/__tests__/helpers';

import { TubeApplicationService } from './TubeApplicationService';

type LocationCountRow = { tankId: string; rackId: string; boxId: string; count: number };

function makeService(options: { allowedTankIds?: string[]; counts?: LocationCountRow[] } = {}) {
  const requireCanViewTubes = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
  const accessControlService = { requireCanViewTubes } as unknown as AccessControlService;

  const getForLab = jest.fn().mockResolvedValue({
    tanks: (options.allowedTankIds ?? ['T1']).map(id => ({ id })),
  });
  const storageRepository = { getForLab } as unknown as StorageRepository;

  const countGroupedByLocation = jest
    .fn<Promise<LocationCountRow[]>, [string]>()
    .mockResolvedValue(options.counts ?? []);
  const tubeRepository = { countGroupedByLocation } as unknown as TubeRepository;

  const service = new TubeApplicationService(
    tubeRepository,
    {} as UserRepository,
    {} as ResearcherRepository,
    {} as PersonRepository,
    storageRepository,
    {} as TubePositionService,
    accessControlService,
    {} as EventBus,
    {} as LabRepository
  );

  return { service, requireCanViewTubes, countGroupedByLocation };
}

describe('TubeApplicationService.getLocationCounts', () => {
  const user = createTestUser({ labId: 'lab_1' });

  it('enforces view permission before reading', async () => {
    const { service, requireCanViewTubes } = makeService();

    await service.getLocationCounts(user);

    expect(requireCanViewTubes).toHaveBeenCalledWith(user);
  });

  it('drops counts for tanks outside the user access scope', async () => {
    const { service, countGroupedByLocation } = makeService({
      allowedTankIds: ['T1'],
      counts: [
        { tankId: 'T1', rackId: 'R1', boxId: 'A', count: 12 },
        { tankId: 'T2', rackId: 'R1', boxId: 'A', count: 7 },
      ],
    });

    const result = await service.getLocationCounts(user);

    expect(countGroupedByLocation).toHaveBeenCalledWith('lab_1');
    expect(result).toEqual([{ tankId: 'T1', rackId: 'R1', boxId: 'A', count: 12 }]);
  });
});
