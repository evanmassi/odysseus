/**
 * Tubes By Rack Service
 *
 * Covers getTubesByRack: the view-permission gate runs first, tanks outside the
 * user's access scope return empty without touching the repository, and matched
 * tubes are projected to the slim RackTube shape (color inputs + box position).
 */

import type { EventBus } from '@application/contracts/EventBus';
import { Tube } from '@domain/entities/Tube';
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

function makeService(options: { allowedTankIds?: string[]; tubes?: Tube[] } = {}) {
  const requireCanViewTubes = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
  const accessControlService = { requireCanViewTubes } as unknown as AccessControlService;

  const getForLab = jest.fn().mockResolvedValue({
    tanks: (options.allowedTankIds ?? ['T1']).map(id => ({ id })),
  });
  const storageRepository = { getForLab } as unknown as StorageRepository;

  const findByRack = jest
    .fn<Promise<Tube[]>, [string, string, string]>()
    .mockResolvedValue(options.tubes ?? []);
  const tubeRepository = { findByRack } as unknown as TubeRepository;

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

  return { service, requireCanViewTubes, findByRack };
}

describe('TubeApplicationService.getTubesByRack', () => {
  const user = createTestUser({ labId: 'lab_1' });

  it('enforces view permission before reading', async () => {
    const { service, requireCanViewTubes } = makeService();

    await service.getTubesByRack('T1', 'R1', user);

    expect(requireCanViewTubes).toHaveBeenCalledWith(user);
  });

  it('returns empty for a tank outside the access scope without querying the repository', async () => {
    const { service, findByRack } = makeService({ allowedTankIds: ['T1'] });

    const result = await service.getTubesByRack('T2', 'R1', user);

    expect(result).toEqual([]);
    expect(findByRack).not.toHaveBeenCalled();
  });

  it('projects matched tubes to the slim RackTube shape, dropping non-color fields', async () => {
    const tube = Tube.create({
      location: { tankId: 'T1', rackId: 'R1', boxId: 'A', position: 5 },
      sample: {
        cellType: 'Jurkat',
        donorInternalId: 'D-100',
        donorSourceId: 'S-200',
        lotNumber: 'L-1',
        cultureCondition: 'suspension',
        species: 'human',
        notes: 'should not cross the wire',
      },
      researcherId: 'res_1',
      labId: 'lab_1',
    });
    const { service, findByRack } = makeService({ allowedTankIds: ['T1'], tubes: [tube] });

    const result = await service.getTubesByRack('T1', 'R1', user);

    expect(findByRack).toHaveBeenCalledWith('T1', 'R1', 'lab_1');
    expect(result).toEqual([
      {
        cellType: 'Jurkat',
        donorInternalId: 'D-100',
        donorSourceId: 'S-200',
        lotNumber: 'L-1',
        cultureCondition: 'suspension',
        boxId: 'A',
        position: 5,
      },
    ]);
  });
});
