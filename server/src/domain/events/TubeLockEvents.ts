/**
 * Tube Lock Domain Events
 *
 * Events related to tube locking and access sharing.
 * All events are batch-oriented for efficient socket and audit handling.
 */

import { DomainEvent } from '@domain/events/DomainEvent';

export class TubesLockedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly tankIds: string[],
    public readonly lockedBy: string,
    public readonly lockNote: string | undefined,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'TubesLocked';
  }

  getAggregateId(): string {
    return this.tubeIds.length === 1 ? this.tubeIds[0] : `batch-${this.tubeIds.length}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeIds: this.tubeIds,
      tankIds: this.tankIds,
      count: this.tubeIds.length,
      lockedBy: this.lockedBy,
      lockNote: this.lockNote
    };
  }
}

export class TubesUnlockedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly tankIds: string[],
    public readonly unlockedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'TubesUnlocked';
  }

  getAggregateId(): string {
    return this.tubeIds.length === 1 ? this.tubeIds[0] : `batch-${this.tubeIds.length}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeIds: this.tubeIds,
      tankIds: this.tankIds,
      count: this.tubeIds.length,
      unlockedBy: this.unlockedBy
    };
  }
}

export class TubeAccessSharedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly tankIds: string[],
    public readonly addedUserIds: string[],
    public readonly tubeSharedUsers: Array<{ tubeId: string; sharedWithUserIds: string[] }>,
    public readonly sharedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'TubeAccessShared';
  }

  getAggregateId(): string {
    return this.tubeIds.length === 1 ? this.tubeIds[0] : `batch-${this.tubeIds.length}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeIds: this.tubeIds,
      tankIds: this.tankIds,
      addedUserIds: this.addedUserIds,
      tubeSharedUsers: this.tubeSharedUsers,
      sharedBy: this.sharedBy
    };
  }
}

export class TubeAccessRevokedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly tankIds: string[],
    public readonly revokedUserIds: string[],
    public readonly tubeSharedUsers: Array<{ tubeId: string; sharedWithUserIds: string[] }>,
    public readonly revokedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string {
    return 'TubeAccessRevoked';
  }

  getAggregateId(): string {
    return this.tubeIds.length === 1 ? this.tubeIds[0] : `batch-${this.tubeIds.length}`;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeIds: this.tubeIds,
      tankIds: this.tankIds,
      revokedUserIds: this.revokedUserIds,
      tubeSharedUsers: this.tubeSharedUsers,
      revokedBy: this.revokedBy
    };
  }
}
