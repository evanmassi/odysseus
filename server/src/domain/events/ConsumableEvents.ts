/**
 * Consumable Domain Events
 *
 * Events within the Consumable aggregate for audit logging.
 */

import { DomainEvent } from '@domain/events/DomainEvent';
import type { FieldChange } from '@domain/types/fieldChangeTypes';

// Per-item data interfaces for enriched bulk events

export interface BulkReceiveItemDetail {
  productId: string;
  quantity: number;
  locationId: string;
}

export interface BulkConsumeItemDetail {
  productId: string;
  quantity: number;
  locationId: string;
}

export interface BulkVoidItemDetail {
  transactionId: string;
  productId: string;
  quantityReversed: number;
  locationId: string;
}

// Product events

export class ConsumableProductCreatedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly categoryId: string,
    public readonly createdBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableProductCreated'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return { productId: this.productId, name: this.name, categoryId: this.categoryId, createdBy: this.createdBy };
  }
}

export class ConsumableProductUpdatedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly changes: FieldChange[],
    public readonly updatedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableProductUpdated'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return { productId: this.productId, changes: this.changes, updatedBy: this.updatedBy };
  }
}

export class ConsumableProductArchivedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly archivedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableProductArchived'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return { productId: this.productId, name: this.name, archivedBy: this.archivedBy };
  }
}

export class ConsumableProductDeletedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableProductDeleted'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return { productId: this.productId, name: this.name, deletedBy: this.deletedBy };
  }
}

// Category events

export class ConsumableCategoryCreatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly parentId: string | undefined,
    public readonly createdBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableCategoryCreated'; }
  getAggregateId(): string { return this.categoryId; }

  protected getEventData(): Record<string, unknown> {
    return { categoryId: this.categoryId, name: this.name, parentId: this.parentId, createdBy: this.createdBy };
  }
}

export class ConsumableCategoryUpdatedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly updatedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableCategoryUpdated'; }
  getAggregateId(): string { return this.categoryId; }

  protected getEventData(): Record<string, unknown> {
    return { categoryId: this.categoryId, name: this.name, updatedBy: this.updatedBy };
  }
}

export class ConsumableCategoryDeletedEvent extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly deletedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableCategoryDeleted'; }
  getAggregateId(): string { return this.categoryId; }

  protected getEventData(): Record<string, unknown> {
    return { categoryId: this.categoryId, name: this.name, deletedBy: this.deletedBy };
  }
}

// Document events

export class ConsumableDocumentAddedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly label: string,
    public readonly addedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableDocumentAdded'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return { productId: this.productId, label: this.label, addedBy: this.addedBy };
  }
}

export class ConsumableDocumentRemovedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly removedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableDocumentRemoved'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return { productId: this.productId, removedBy: this.removedBy };
  }
}

// Stock events

export class ConsumableStockReceivedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly locationId: string,
    public readonly receivedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableStockReceived'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return { productId: this.productId, quantity: this.quantity, locationId: this.locationId, receivedBy: this.receivedBy };
  }
}

export class ConsumableStockConsumedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly locationId: string,
    public readonly consumedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableStockConsumed'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return { productId: this.productId, quantity: this.quantity, locationId: this.locationId, consumedBy: this.consumedBy };
  }
}

export class ConsumableStockCountAdjustedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly delta: number,
    public readonly locationId: string,
    public readonly adjustedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableStockCountAdjusted'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return { productId: this.productId, delta: this.delta, locationId: this.locationId, adjustedBy: this.adjustedBy };
  }
}

export class ConsumableStockDisposedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly locationId: string,
    public readonly disposedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableStockDisposed'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return { productId: this.productId, quantity: this.quantity, locationId: this.locationId, disposedBy: this.disposedBy };
  }
}

export class ConsumableStockVoidedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
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

  eventName(): string { return 'ConsumableStockVoided'; }
  getAggregateId(): string { return this.productId; }

  protected getEventData(): Record<string, unknown> {
    return {
      productId: this.productId, originalTransactionId: this.originalTransactionId,
      reversalTransactionId: this.reversalTransactionId, quantityReversed: this.quantityReversed,
      locationId: this.locationId, voidReason: this.voidReason, voidedBy: this.voidedBy,
    };
  }
}

// Bulk events — enriched per-item data for receive/consume/void, simple ID arrays for reassign/archive

export class ConsumableBulkReceivedEvent extends DomainEvent {
  constructor(
    public readonly perItemData: BulkReceiveItemDetail[],
    public readonly receivedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableBulkReceived'; }
  getAggregateId(): string { return `bulk-${this.perItemData.length}`; }

  protected getEventData(): Record<string, unknown> {
    return { perItemData: this.perItemData, receivedBy: this.receivedBy };
  }
}

export class ConsumableBulkConsumedEvent extends DomainEvent {
  constructor(
    public readonly perItemData: BulkConsumeItemDetail[],
    public readonly consumedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableBulkConsumed'; }
  getAggregateId(): string { return `bulk-${this.perItemData.length}`; }

  protected getEventData(): Record<string, unknown> {
    return { perItemData: this.perItemData, consumedBy: this.consumedBy };
  }
}

export class ConsumableBulkCategoryReassignedEvent extends DomainEvent {
  constructor(
    public readonly productIds: string[],
    public readonly categoryId: string,
    public readonly reassignedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableBulkCategoryReassigned'; }
  getAggregateId(): string { return `bulk-${this.productIds.length}`; }

  protected getEventData(): Record<string, unknown> {
    return { productIds: this.productIds, categoryId: this.categoryId, reassignedBy: this.reassignedBy };
  }
}

export class ConsumableBulkArchivedEvent extends DomainEvent {
  constructor(
    public readonly productIds: string[],
    public readonly archivedBy: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableBulkArchived'; }
  getAggregateId(): string { return `bulk-${this.productIds.length}`; }

  protected getEventData(): Record<string, unknown> {
    return { productIds: this.productIds, archivedBy: this.archivedBy };
  }
}

export class ConsumableBulkVoidedEvent extends DomainEvent {
  constructor(
    public readonly perItemData: BulkVoidItemDetail[],
    public readonly voidedBy: string,
    public readonly voidReason: string,
    labId: string
  ) {
    super(1, labId);
  }

  eventName(): string { return 'ConsumableBulkVoided'; }
  getAggregateId(): string { return `bulk-${this.perItemData.length}`; }

  protected getEventData(): Record<string, unknown> {
    return { perItemData: this.perItemData, voidedBy: this.voidedBy, voidReason: this.voidReason };
  }
}
