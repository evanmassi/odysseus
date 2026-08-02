/**
 * Reagent Domain Events
 *
 * Events within the Reagent aggregate for audit logging.
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import type { FieldChange } from '@domain/types/fieldChangeTypes';

// Per-item data interfaces for enriched bulk events

export interface BulkStockItemDetail {
  itemId: string;
  quantity: number;
  locationId: string;
}

export interface BulkVoidItemDetail {
  transactionId: string;
  itemId: string;
  quantityReversed: number;
  locationId: string;
}

// Item events

export class ReagentItemCreatedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly name: string,
    public readonly categoryId: string,
    public readonly createdBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentItemCreated';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

export class ReagentItemUpdatedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly changes: FieldChange[],
    public readonly updatedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentItemUpdated';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

export class ReagentItemArchivedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly name: string,
    public readonly archivedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentItemArchived';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

export class ReagentItemDeletedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly name: string,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentItemDeleted';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

// Category events

export class ReagentCategoryCreatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly parentId: string | undefined,
    public readonly createdBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentCategoryCreated';
  }
  getAggregateId(): string {
    return this.categoryId;
  }
}

export class ReagentCategoryUpdatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly updatedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentCategoryUpdated';
  }
  getAggregateId(): string {
    return this.categoryId;
  }
}

export class ReagentCategoryDeletedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentCategoryDeleted';
  }
  getAggregateId(): string {
    return this.categoryId;
  }
}

// Document events

export class ReagentDocumentAddedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly label: string,
    public readonly addedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentDocumentAdded';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

export class ReagentDocumentRemovedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly removedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentDocumentRemoved';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

// Stock events

export class ReagentStockReceivedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly locationId: string,
    public readonly receivedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentStockReceived';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

export class ReagentStockIssuedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly locationId: string,
    public readonly issuedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentStockIssued';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

export class ReagentStockCountAdjustedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly delta: number,
    public readonly locationId: string,
    public readonly adjustedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentStockCountAdjusted';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

export class ReagentStockDisposedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly locationId: string,
    public readonly disposedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentStockDisposed';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

export class ReagentStockVoidedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly originalTransactionId: string,
    public readonly reversalTransactionId: string,
    public readonly quantityReversed: number,
    public readonly locationId: string,
    public readonly voidReason: string,
    public readonly voidedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentStockVoided';
  }
  getAggregateId(): string {
    return this.itemId;
  }
}

// Bulk events — enriched per-item data for receive/issue/void, simple ID arrays for reassign/archive

export class ReagentBulkReceivedEvent extends DomainEvent {
  constructor(
    public readonly perItemData: BulkStockItemDetail[],
    public readonly receivedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentBulkReceived';
  }
  getAggregateId(): string {
    return `bulk-${this.perItemData.length}`;
  }
}

export class ReagentBulkIssuedEvent extends DomainEvent {
  constructor(
    public readonly perItemData: BulkStockItemDetail[],
    public readonly issuedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentBulkIssued';
  }
  getAggregateId(): string {
    return `bulk-${this.perItemData.length}`;
  }
}

export class ReagentBulkCategoryReassignedEvent extends DomainEvent {
  constructor(
    public readonly itemIds: string[],
    public readonly categoryId: string,
    public readonly reassignedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentBulkCategoryReassigned';
  }
  getAggregateId(): string {
    return `bulk-${this.itemIds.length}`;
  }
}

export class ReagentBulkArchivedEvent extends DomainEvent {
  constructor(
    public readonly itemIds: string[],
    public readonly archivedBy: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentBulkArchived';
  }
  getAggregateId(): string {
    return `bulk-${this.itemIds.length}`;
  }
}

export class ReagentBulkVoidedEvent extends DomainEvent {
  constructor(
    public readonly perItemData: BulkVoidItemDetail[],
    public readonly voidedBy: string,
    public readonly voidReason: string,
    labId: string
  ) {
    super(labId);
  }

  eventName(): string {
    return 'ReagentBulkVoided';
  }
  getAggregateId(): string {
    return `bulk-${this.perItemData.length}`;
  }
}
