/**
 * User Lookup Service Tests
 *
 * Display-info resolution for the lookup + list endpoints, including the
 * lab-scoped approved-users query and the linked-person name join.
 */

import { Person } from '@domain/entities/Person';
import type { User } from '@domain/entities/User';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';

import { UserApplicationService } from './UserApplicationService';

function fakeUser(id: string, username: string, personId: string | undefined, hasResearcher: boolean): User {
  return {
    toPublicData: () => ({ id, username, personId, researcherId: hasResearcher ? 'r1' : undefined }),
    hasResearcherProfile: () => hasResearcher,
  } as unknown as User;
}

function person(id: string, firstName: string, lastName: string): Person {
  return Person.fromData({ id, firstName, lastName, email: `${id}@example.com`, createdAt: new Date(), updatedAt: new Date() });
}

function makeService(opts: { users?: User[]; persons?: Person[] } = {}) {
  const findByIds = jest.fn().mockResolvedValue(opts.users ?? []);
  const findByStatusInLab = jest.fn().mockResolvedValue(opts.users ?? []);
  const userRepository = { findByIds, findByStatusInLab } as unknown as UserRepository;

  const personFindByIds = jest.fn().mockResolvedValue(opts.persons ?? []);
  const personRepository = { findByIds: personFindByIds } as unknown as PersonRepository;

  const service = new UserApplicationService(userRepository, {} as AccessControlService, personRepository);
  return { service, findByIds, findByStatusInLab, personFindByIds };
}

describe('UserApplicationService.lookupUsers', () => {
  it('resolves display info, joining names from linked persons', async () => {
    const { service, findByIds, personFindByIds } = makeService({
      users: [fakeUser('u1', 'alice', 'p1', false), fakeUser('u2', 'bob', undefined, true)],
      persons: [person('p1', 'Alice', 'Adams')],
    });

    const result = await service.lookupUsers(['u1', 'u2']);

    expect(findByIds).toHaveBeenCalledWith(['u1', 'u2']);
    expect(personFindByIds).toHaveBeenCalledWith(['p1']);
    expect(result).toEqual([
      { id: 'u1', username: 'alice', firstName: 'Alice', lastName: 'Adams', hasResearcher: false },
      { id: 'u2', username: 'bob', firstName: undefined, lastName: undefined, hasResearcher: true },
    ]);
  });
});

describe('UserApplicationService.listActiveUsers', () => {
  it('lists approved users scoped to the lab at the repository', async () => {
    const { service, findByStatusInLab } = makeService({
      users: [fakeUser('u1', 'alice', 'p1', false)],
      persons: [person('p1', 'Alice', 'Adams')],
    });

    const result = await service.listActiveUsers('lab_1');

    expect(findByStatusInLab).toHaveBeenCalledWith('approved', 'lab_1');
    expect(result).toEqual([{ id: 'u1', username: 'alice', firstName: 'Alice', lastName: 'Adams', hasResearcher: false }]);
  });
});
