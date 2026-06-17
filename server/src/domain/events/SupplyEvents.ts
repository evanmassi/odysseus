/**
 * Supply Domain Events
 *
 * Events within the Supply aggregate for audit logging.
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import type { FieldChange } from '@domain/types/fieldChangeTypes';

// Per-item data interfaces for enriched bulk events

export interface BulkReceiveItemDetail {
  itemId: string;
  quantity: number;
  locationId: string;
}

export interface BulkIssueItemDetail {
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

export class SupplyItemCreatedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly name: string,
    public readonly categoryId: string,
    public readonly createdBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyItemCreated'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return { itemId: this.itemId, name: this.name, categoryId: this.categoryId, createdBy: this.createdBy };
  }
}

export class SupplyItemUpdatedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly changes: FieldChange[],
    public readonly updatedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyItemUpdated'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return { itemId: this.itemId, changes: this.changes, updatedBy: this.updatedBy };
  }
}

export class SupplyItemArchivedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly name: string,
    public readonly archivedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyItemArchived'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return { itemId: this.itemId, name: this.name, archivedBy: this.archivedBy };
  }
}

export class SupplyItemDeletedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly name: string,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyItemDeleted'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return { itemId: this.itemId, name: this.name, deletedBy: this.deletedBy };
  }
}

// Category events

export class SupplyCategoryCreatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly parentId: string | undefined,
    public readonly createdBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyCategoryCreated'; }
  getAggregateId(): string { return this.categoryId; }

  protected getEventData(): Record<string, unknown> {
    return { categoryId: this.categoryId, name: this.name, parentId: this.parentId, createdBy: this.createdBy };
  }
}

export class SupplyCategoryUpdatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly updatedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyCategoryUpdated'; }
  getAggregateId(): string { return this.categoryId; }

  protected getEventData(): Record<string, unknown> {
    return { categoryId: this.categoryId, name: this.name, updatedBy: this.updatedBy };
  }
}

export class SupplyCategoryDeletedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyCategoryDeleted'; }
  getAggregateId(): string { return this.categoryId; }

  protected getEventData(): Record<string, unknown> {
    return { categoryId: this.categoryId, name: this.name, deletedBy: this.deletedBy };
  }
}

// Document events

export class SupplyDocumentAddedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly label: string,
    public readonly addedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyDocumentAdded'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return { itemId: this.itemId, label: this.label, addedBy: this.addedBy };
  }
}

export class SupplyDocumentRemovedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly removedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyDocumentRemoved'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return { itemId: this.itemId, removedBy: this.removedBy };
  }
}

// Stock events

export class SupplyStockReceivedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly locationId: string,
    public readonly receivedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyStockReceived'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return { itemId: this.itemId, quantity: this.quantity, locationId: this.locationId, receivedBy: this.receivedBy };
  }
}

export class SupplyStockIssuedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly locationId: string,
    public readonly issuedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyStockIssued'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return { itemId: this.itemId, quantity: this.quantity, locationId: this.locationId, issuedBy: this.issuedBy };
  }
}

export class SupplyStockCountAdjustedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly delta: number,
    public readonly locationId: string,
    public readonly adjustedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyStockCountAdjusted'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return { itemId: this.itemId, delta: this.delta, locationId: this.locationId, adjustedBy: this.adjustedBy };
  }
}

export class SupplyStockDisposedEvent extends DomainEvent {
  constructor(
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly locationId: string,
    public readonly disposedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyStockDisposed'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return { itemId: this.itemId, quantity: this.quantity, locationId: this.locationId, disposedBy: this.disposedBy };
  }
}

export class SupplyStockVoidedEvent extends DomainEvent {
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
    super(1, labId);
  }

  eventName(): string { return 'SupplyStockVoided'; }
  getAggregateId(): string { return this.itemId; }

  protected getEventData(): Record<string, unknown> {
    return {
      itemId: this.itemId, originalTransactionId: this.originalTransactionId,
      reversalTransactionId: this.reversalTransactionId, quantityReversed: this.quantityReversed,
      locationId: this.locationId, voidReason: this.voidReason, voidedBy: this.voidedBy,
    };
  }
}

// Bulk events — enriched per-item data for receive/issue/void, simple ID arrays for reassign/archive

export class SupplyBulkReceivedEvent extends DomainEvent {
  constructor(
    public readonly perItemData: BulkReceiveItemDetail[],
    public readonly receivedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyBulkReceived'; }
  getAggregateId(): string { return `bulk-${this.perItemData.length}`; }

  protected getEventData(): Record<string, unknown> {
    return { perItemData: this.perItemData, receivedBy: this.receivedBy };
  }
}

export class SupplyBulkIssuedEvent extends DomainEvent {
  constructor(
    public readonly perItemData: BulkIssueItemDetail[],
    public readonly issuedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyBulkIssued'; }
  getAggregateId(): string { return `bulk-${this.perItemData.length}`; }

  protected getEventData(): Record<string, unknown> {
    return { perItemData: this.perItemData, issuedBy: this.issuedBy };
  }
}

export class SupplyBulkCategoryReassignedEvent extends DomainEvent {
  constructor(
    public readonly itemIds: string[],
    public readonly categoryId: string,
    public readonly reassignedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyBulkCategoryReassigned'; }
  getAggregateId(): string { return `bulk-${this.itemIds.length}`; }

  protected getEventData(): Record<string, unknown> {
    return { itemIds: this.itemIds, categoryId: this.categoryId, reassignedBy: this.reassignedBy };
  }
}

export class SupplyBulkArchivedEvent extends DomainEvent {
  constructor(
    public readonly itemIds: string[],
    public readonly archivedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyBulkArchived'; }
  getAggregateId(): string { return `bulk-${this.itemIds.length}`; }

  protected getEventData(): Record<string, unknown> {
    return { itemIds: this.itemIds, archivedBy: this.archivedBy };
  }
}

export class SupplyBulkVoidedEvent extends DomainEvent {
  constructor(
    public readonly perItemData: BulkVoidItemDetail[],
    public readonly voidedBy: string,
    public readonly voidReason: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'SupplyBulkVoided'; }
  getAggregateId(): string { return `bulk-${this.perItemData.length}`; }

  protected getEventData(): Record<string, unknown> {
    return { perItemData: this.perItemData, voidedBy: this.voidedBy, voidReason: this.voidReason };
  }
}
