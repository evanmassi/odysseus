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
    public readonly lockedBy: string,
    public readonly lockNote: string | undefined
  ) {
    super(1);
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
      count: this.tubeIds.length,
      lockedBy: this.lockedBy,
      lockNote: this.lockNote
    };
  }
}

export class TubesUnlockedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly unlockedBy: string
  ) {
    super(1);
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
      count: this.tubeIds.length,
      unlockedBy: this.unlockedBy
    };
  }
}

export class TubeAccessSharedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly sharedWithUserIds: string[],
    public readonly sharedBy: string
  ) {
    super(1);
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
      sharedWithUserIds: this.sharedWithUserIds,
      sharedBy: this.sharedBy
    };
  }
}

export class TubeAccessRevokedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly revokedUserIds: string[],
    public readonly revokedBy: string
  ) {
    super(1);
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
      revokedUserIds: this.revokedUserIds,
      revokedBy: this.revokedBy
    };
  }
}
