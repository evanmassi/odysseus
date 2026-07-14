/**
 * Resource Assignment Flow Tests
 *
 * Characterizes the tri-state a box carries — a user id, null (common), or undefined (inherit
 * from its rack) — through the shared assign pipeline, plus the events each transition emits.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { Storage } from '@domain/entities/Storage';
import type { User } from '@domain/entities/User';
import type { DomainEvent } from '@domain/events/DomainEvent';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';

import { executeResourceAssignment, type ResourceAssignmentDescriptor } from './resourceAssignment';

const researcher = { username: 'alice', hasResearcherProfile: () => true } as unknown as User;

function makeDeps() {
  const findById = jest.fn().mockResolvedValue(researcher);
  const userRepository = { findById } as unknown as UserRepository;

  const saveWithOptimisticLock = jest.fn().mockResolvedValue(2);
  const storageRepository = { saveWithOptimisticLock } as unknown as StorageRepository;

  const publish = jest.fn();
  const eventBus = { publish } as unknown as EventBus;

  const currentConfig = {
    version: 1,
    toData: () => ({ tanks: [], systemSettings: {} }),
    updateFromData: jest.fn(),
    applyPersistedVersion: jest.fn(),
  } as unknown as Storage;

  return { deps: { storageRepository, userRepository, eventBus }, currentConfig, publish };
}

function makeDescriptor(
  previousUserId: string | null | undefined,
  applyAssignment: jest.Mock
): ResourceAssignmentDescriptor {
  return {
    resourceType: 'box',
    previousUserId,
    applyAssignment,
    buildSaveMessage: action => action,
    buildReassignedEvent: () => ({ name: 'Reassigned' }) as unknown as DomainEvent,
    buildAssignedEvent: () => ({ name: 'Assigned' }) as unknown as DomainEvent,
    buildUnassignedEvent: () => ({ name: 'Unassigned' }) as unknown as DomainEvent,
  };
}

describe('executeResourceAssignment', () => {
  const command = { userId: 'admin', labId: 'lab1' };

  it('writes null through unflattened so a box can be made common', async () => {
    const { deps, currentConfig } = makeDeps();
    const applyAssignment = jest.fn();

    await executeResourceAssignment(
      deps,
      currentConfig,
      { ...command, assignedUserId: null },
      makeDescriptor('u1', applyAssignment)
    );

    expect(applyAssignment).toHaveBeenCalledWith(expect.anything(), null);
  });

  it('writes undefined through unflattened so a box can inherit from its rack', async () => {
    const { deps, currentConfig } = makeDeps();
    const applyAssignment = jest.fn();

    await executeResourceAssignment(
      deps,
      currentConfig,
      { ...command, assignedUserId: undefined },
      makeDescriptor('u1', applyAssignment)
    );

    expect(applyAssignment).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('treats common and inherit as distinct states rather than no-opping between them', async () => {
    const { deps, currentConfig } = makeDeps();
    const applyAssignment = jest.fn();

    await executeResourceAssignment(
      deps,
      currentConfig,
      { ...command, assignedUserId: null },
      makeDescriptor(undefined, applyAssignment)
    );

    expect(applyAssignment).toHaveBeenCalledWith(expect.anything(), null);
  });

  it('no-ops when the owner is unchanged', async () => {
    const { deps, currentConfig } = makeDeps();
    const applyAssignment = jest.fn();

    await executeResourceAssignment(
      deps,
      currentConfig,
      { ...command, assignedUserId: null },
      makeDescriptor(null, applyAssignment)
    );

    expect(applyAssignment).not.toHaveBeenCalled();
  });

  it('emits Unassigned only when an assignee actually lost the resource', async () => {
    const owned = makeDeps();
    await executeResourceAssignment(
      owned.deps,
      owned.currentConfig,
      { ...command, assignedUserId: null },
      makeDescriptor('u1', jest.fn())
    );
    expect(owned.publish).toHaveBeenCalledWith(expect.objectContaining({ name: 'Unassigned' }));

    const ownerless = makeDeps();
    await executeResourceAssignment(
      ownerless.deps,
      ownerless.currentConfig,
      { ...command, assignedUserId: null },
      makeDescriptor(undefined, jest.fn())
    );
    expect(ownerless.publish).not.toHaveBeenCalled();
  });
});
