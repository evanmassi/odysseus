/**
 * Shared Resource Assignment Flow
 *
 * Common assign/unassign/reassign pipeline behind AssignRackCommandHandler and
 * AssignBoxCommandHandler: validates the target user, no-ops when the owner is
 * unchanged, persists via optimistic lock, and emits the matching
 * Assigned/Unassigned/Reassigned event. Handlers keep their own guards and
 * resource resolution and describe their resource through the descriptor.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { Storage } from '@domain/entities/Storage';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { DomainEvent } from '@domain/events/DomainEvent';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';

type StorageData = ReturnType<Storage['toData']>;

export interface AssignResourceCommand {
  userId: string;
  labId: string;
  assignedUserId: string | null;
}

export interface AssignResourceDeps {
  storageRepository: StorageRepository;
  userRepository: UserRepository;
  eventBus: EventBus;
}

/** Resource-specific pieces of the shared flow; event builders receive resolved usernames. */
export interface ResourceAssignmentDescriptor {
  /** Used in the researcher-profile validation message. */
  resourceType: 'rack' | 'box';
  /** Owner of the resource before this command runs (boxes may carry an explicit null). */
  previousUserId: string | null | undefined;
  /** Writes the new owner onto the mutable config data (undefined = unassigned). */
  applyAssignment: (configData: StorageData, assignedUserId: string | undefined) => void;
  /** Entity-level cleanup run when an owned resource is being unassigned. */
  onUnassign?: () => void;
  buildSaveMessage: (action: 'Reassigned' | 'Assigned' | 'Unassigned') => string;
  buildReassignedEvent: (
    previousUserId: string,
    previousUsername: string,
    newUserId: string,
    newUsername: string
  ) => DomainEvent;
  buildAssignedEvent: (newUserId: string, newUsername: string) => DomainEvent;
  buildUnassignedEvent: (previousUserId: string, previousUsername: string) => DomainEvent;
}

export async function executeResourceAssignment(
  deps: AssignResourceDeps,
  currentConfig: Storage,
  command: AssignResourceCommand,
  descriptor: ResourceAssignmentDescriptor
): Promise<void> {
  let assignedUser: User | null = null;
  if (command.assignedUserId) {
    assignedUser = await deps.userRepository.findById(command.assignedUserId, command.labId);
    if (!assignedUser) {
      throw NotFoundError.forEntity('User', command.assignedUserId);
    }
    if (!assignedUser.hasResearcherProfile()) {
      throw new ValidationError(
        `Cannot assign ${descriptor.resourceType} to a user without a linked researcher profile`
      );
    }
  }

  const { previousUserId } = descriptor;
  const previousUsername = previousUserId
    ? (await deps.userRepository.findById(previousUserId, command.labId))?.username ?? 'Unknown'
    : '';

  if (previousUserId === command.assignedUserId) {
    return;
  }

  const configData = currentConfig.toData();
  descriptor.applyAssignment(configData, command.assignedUserId ?? undefined);

  if (!command.assignedUserId && previousUserId) {
    descriptor.onUnassign?.();
  }

  const expectedVersion = currentConfig.version;
  currentConfig.updateFromData({
    tanks: configData.tanks,
    systemSettings: configData.systemSettings
  });

  const action = command.assignedUserId
    ? (previousUserId ? 'Reassigned' : 'Assigned')
    : 'Unassigned';
  const newVersion = await deps.storageRepository.saveWithOptimisticLock(
    command.labId,
    currentConfig,
    expectedVersion,
    descriptor.buildSaveMessage(action),
    command.userId
  );
  currentConfig.applyPersistedVersion(newVersion);

  if (command.assignedUserId && previousUserId) {
    await deps.eventBus.publish(
      descriptor.buildReassignedEvent(
        previousUserId,
        previousUsername,
        command.assignedUserId,
        assignedUser!.username
      )
    );
  } else if (command.assignedUserId) {
    await deps.eventBus.publish(
      descriptor.buildAssignedEvent(command.assignedUserId, assignedUser!.username)
    );
  } else {
    await deps.eventBus.publish(
      descriptor.buildUnassignedEvent(previousUserId!, previousUsername)
    );
  }
}
