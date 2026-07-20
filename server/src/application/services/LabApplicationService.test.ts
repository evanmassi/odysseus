/**
 * Lab Management Service Tests
 *
 * Read-side aggregation: lab listing (demo-seeded flag), per-lab detail
 * enrichment, cross-lab overview stats, and demo limits.
 */

import { Person } from '@domain/entities/Person';
import { NotFoundError } from '@domain/errors/NotFoundError';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';

import { LabApplicationService } from './LabApplicationService';

function person(id: string, firstName: string, lastName: string): Person {
  return Person.fromData({
    id,
    firstName,
    lastName,
    email: `${id}@example.com`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeService(opts: Record<string, unknown> = {}) {
  const labRepository = {
    findAll: jest.fn().mockResolvedValue(opts.labs ?? []),
    findById: jest.fn().mockResolvedValue(opts.lab ?? null),
  } as unknown as LabRepository;
  const userRepository = {
    findByLabId: jest.fn().mockResolvedValue(opts.users ?? []),
    findAllWithLastActivity: jest.fn().mockResolvedValue(opts.allUsers ?? []),
  } as unknown as UserRepository;
  const tubeRepository = {
    countByLabId: jest.fn().mockResolvedValue(opts.tubeCount ?? 0),
    countByLabIds: jest.fn().mockResolvedValue(opts.tubeCountMap ?? new Map()),
  } as unknown as TubeRepository;
  const storageRepository = {
    getForLab: jest.fn().mockResolvedValue(opts.config ?? null),
    getForLabs: jest.fn().mockResolvedValue(opts.configMap ?? new Map()),
  } as unknown as StorageRepository;
  const researcherRepository = {
    findByLabId: jest.fn().mockResolvedValue(opts.researchers ?? []),
    getTubeCountsByResearcherIds: jest
      .fn()
      .mockResolvedValue(opts.researcherTubeCounts ?? new Map()),
    countByLabIds: jest.fn().mockResolvedValue(opts.researcherCountMap ?? new Map()),
  } as unknown as ResearcherRepository;
  const personRepository = {
    findByIds: jest.fn().mockResolvedValue(opts.persons ?? []),
  } as unknown as PersonRepository;

  return new LabApplicationService({
    labRepository,
    userRepository,
    tubeRepository,
    storageRepository,
    researcherRepository,
    personRepository,
  });
}

describe('LabApplicationService.getDemoLimits', () => {
  it('throws when the lab is not found', async () => {
    await expect(makeService({ lab: null }).getDemoLimits('l1')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('returns the lab demo limits', async () => {
    const demoLimits = { maxTubes: 10 };
    const result = await makeService({ lab: { demoLimits } }).getDemoLimits('l1');
    expect(result).toEqual({ limits: demoLimits });
  });
});

describe('LabApplicationService.listLabs', () => {
  it('flags the demo lab as seeded and leaves other labs untouched', async () => {
    const service = makeService({
      labs: [
        { id: 'demo', isDemo: true, toData: () => ({ id: 'demo', name: 'Demo', isDemo: true }) },
        { id: 'l1', isDemo: false, toData: () => ({ id: 'l1', name: 'Lab', isDemo: false }) },
      ],
      config: { hasAnySeededResources: () => true },
    });

    const result = await service.listLabs();

    expect(result[0]).toMatchObject({ id: 'demo', isSeeded: true });
    expect(result[1]).not.toHaveProperty('isSeeded');
  });
});

describe('LabApplicationService.getOverview', () => {
  it('aggregates per-lab and system-wide stats', async () => {
    const service = makeService({
      labs: [{ id: 'l1', name: 'Lab 1', isActive: true }],
      allUsers: [
        { labId: 'l1', roleString: 'lab_admin', lastActivity: new Date() },
        { labId: 'l1', roleString: 'user', lastActivity: new Date() },
      ],
      tubeCountMap: new Map([['l1', 7]]),
      researcherCountMap: new Map([['l1', 3]]),
    });

    const result = await service.getOverview();

    expect(result).toMatchObject({
      totalLabs: 1,
      activeLabs: 1,
      inactiveLabs: 0,
      totalUsers: 2,
      totalTubes: 7,
      activeUsersLast24h: 2,
    });
    expect(result.labStats[0]).toMatchObject({
      labId: 'l1',
      adminCount: 1,
      userCount: 2,
      researcherCount: 3,
      tubeCount: 7,
      tankCount: 0,
    });
  });
});

describe('LabApplicationService.getLabDetails', () => {
  it('throws when the lab is not found', async () => {
    await expect(makeService({ lab: null }).getLabDetails('l1')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('enriches users and researchers with linked-person names', async () => {
    const service = makeService({
      lab: { id: 'l1', toData: () => ({ id: 'l1', name: 'Lab' }) },
      users: [
        {
          id: 'u1',
          personId: 'p1',
          researcherId: undefined,
          username: 'alice',
          roleString: 'user',
          status: 'approved',
          isDemo: false,
          lastActivity: new Date('2020-01-01T00:00:00Z'),
        },
      ],
      researchers: [{ id: 'r1', personId: 'pr1', active: true }],
      persons: [person('p1', 'Alice', 'Adams'), person('pr1', 'Bob', 'Brown')],
      tubeCount: 5,
      config: { hasAnySeededResources: () => false, toData: () => ({ tanks: [] }) },
      researcherTubeCounts: new Map([['r1', 2]]),
    });

    const result = await service.getLabDetails('l1');

    expect(result.tubeCount).toBe(5);
    expect(result.researcherCount).toBe(1);
    expect(result.users[0]).toMatchObject({
      id: 'u1',
      firstName: 'Alice',
      username: 'alice',
      researcher: null,
    });
    expect(result.researchers[0]).toMatchObject({
      id: 'r1',
      firstName: 'Bob',
      lastName: 'Brown',
      tubeCount: 2,
      active: true,
    });
    expect(result.storageSummary).toEqual({ tankCount: 0, rackCount: 0, boxCount: 0 });
  });
});
