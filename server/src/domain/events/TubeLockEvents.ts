/**
 * Tube Lock Domain Events
 *
 * Events related to tube locking and access sharing.
 */

import { DomainEvent } from '@domain/events/DomainEvent';

export class TubeLockChangedEvent extends DomainEvent {
  constructor(
    public readonly tubeId: string,
    public readonly isLocked: boolean,
    public readonly lockedBy: string | undefined,
    public readonly lockNote: string | undefined,
    public readonly changedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'TubeLockChanged';
  }

  getAggregateId(): string {
    return this.tubeId;
  }

  protected getEventData(): Record<string, unknown> {
    return {
      tubeId: this.tubeId,
      isLocked: this.isLocked,
      lockedBy: this.lockedBy,
      lockNote: this.lockNote,
      changedBy: this.changedBy
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
