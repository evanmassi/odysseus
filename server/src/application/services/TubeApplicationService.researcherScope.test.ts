/**
 * Tube Researcher Lab-Scoping
 *
 * The write-side hard-block: a tube may be unassigned, but a *set* researcherId must resolve to a
 * researcher in the tube's own lab — on both create and update. Guards against cross-lab references.
 */

import { Researcher } from '@domain/entities/Researcher';
import { Tube } from '@domain/entities/Tube';
import { ValidationError } from '@domain/errors/ValidationError';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { TubePositionService } from '@domain/services/TubePositionService';
import { createTestTube, createTestUser } from '@domain/__tests__/helpers';

import { TubeApplicationService } from './TubeApplicationService';

import type { EventBus } from '@application/contracts/EventBus';
import type { CreateTubeRequest, UpdateTubeRequest } from '@odysseus/shared-schemas';

function makeService(overrides: { researcher?: Researcher | null } = {}) {
  const findResearcher = jest.fn().mockResolvedValue(overrides.researcher ?? null);
  const researcherRepository = { findById: findResearcher } as unknown as ResearcherRepository;
  const personRepository = { findById: jest.fn().mockResolvedValue(null) } as unknown as PersonRepository;

  const save = jest.fn().mockResolvedValue(undefined);
  const saveWithOptimisticLock = jest.fn().mockResolvedValue(1);
  const tubeRepository = { save, saveWithOptimisticLock } as unknown as TubeRepository;

  const storageRepository = {
    getForLab: jest.fn().mockResolvedValue({ tanks: [{ id: 'T1' }] }),
  } as unknown as StorageRepository;

  const accessControlService = {
    requireCanCreateTube: jest.fn().mockResolvedValue(undefined),
  } as unknown as AccessControlService;

  const eventBus = { publish: jest.fn().mockResolvedValue(undefined) } as unknown as EventBus;

  const service = new TubeApplicationService(
    tubeRepository,
    {} as UserRepository,
    researcherRepository,
    personRepository,
    storageRepository,
    {} as TubePositionService,
    accessControlService,
    eventBus
  );

  return { service, findResearcher, save, saveWithOptimisticLock };
}

const user = createTestUser({ labId: 'lab_1' });
const baseCreate: CreateTubeRequest = {
  location: { tankId: 'T1', rackId: 'R1', boxId: 'A', position: 1 },
  sample: { cellType: 'HeLa' },
};
// config: null short-circuits container lookup; positionValidation pre-satisfies the position check.
const createOpts = { config: null, positionValidation: { isValid: true } };

describe('TubeApplicationService researcher lab-scoping', () => {
  describe('createTube', () => {
    it('rejects a researcherId that does not resolve in the lab', async () => {
      const { service, findResearcher } = makeService({ researcher: null });

      await expect(
        service.createTube({ ...baseCreate, researcherId: 'res_foreign' }, user, createOpts)
      ).rejects.toThrow(ValidationError);
      expect(findResearcher).toHaveBeenCalledWith('res_foreign', 'lab_1');
    });

    it('allows an unassigned tube without touching the researcher repo', async () => {
      const { service, findResearcher, save } = makeService();

      await service.createTube(baseCreate, user, createOpts);

      expect(findResearcher).not.toHaveBeenCalled();
      expect(save).toHaveBeenCalled();
    });

    it('allows a researcherId that resolves in the lab', async () => {
      const researcher = Researcher.create('person_1', { labId: 'lab_1', source: 'admin' });
      const { service, save } = makeService({ researcher });

      await service.createTube({ ...baseCreate, researcherId: researcher.id }, user, createOpts);

      expect(save).toHaveBeenCalled();
    });
  });

  describe('updateTube', () => {
    it('rejects setting a researcherId that does not resolve in the lab', async () => {
      const { service, findResearcher } = makeService({ researcher: null });
      const existing = createTestTube({ labId: 'lab_1' });

      await expect(
        service.updateTube(existing.id, { researcherId: 'res_foreign' } as UpdateTubeRequest, user, {
          preloadedTube: existing,
          config: null,
        })
      ).rejects.toThrow(ValidationError);
      expect(findResearcher).toHaveBeenCalledWith('res_foreign', 'lab_1');
    });

    it('allows unassigning the researcher', async () => {
      const { service, findResearcher, saveWithOptimisticLock } = makeService();
      const existing: Tube = createTestTube({ labId: 'lab_1', researcherId: 'res_old' });

      await service.updateTube(existing.id, { researcherId: null } as UpdateTubeRequest, user, {
        preloadedTube: existing,
        config: null,
      });

      expect(findResearcher).not.toHaveBeenCalled();
      expect(saveWithOptimisticLock).toHaveBeenCalled();
    });
  });
});
