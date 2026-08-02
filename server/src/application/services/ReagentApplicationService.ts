/**
 * Reagent Application Service
 *
 * Orchestrates reagent business logic: item CRUD with barcode auto-generation,
 * per-lot stock operations with FEFO consumption, category/location/document
 * management, and bulk operations.
 */

import type { EventBus } from '@application/contracts/EventBus';
import { AttributeDto } from '@application/dto/AttributeDto';
import {
  ReagentDto,
  type ReagentCategoryResponse,
  type ReagentItemResponse,
  type ReagentItemWithStockResponse,
  type ReagentItemDetailResponse,
  type ReagentDocumentResponse,
  type ReagentBarcodeResponse,
  type ReagentTransactionResponse,
  type ReagentLotResponse,
  type ReagentPackagingLevelResponse,
} from '@application/dto/ReagentDto';
import { requireUnusedBarcodeValue } from '@application/guards/BarcodeGuards';
import { validateHierarchyDepth } from '@application/guards/HierarchyGuards';
import { ReagentCategory } from '@domain/entities/ReagentCategory';
import { ReagentDocument } from '@domain/entities/ReagentDocument';
import { ReagentItem } from '@domain/entities/ReagentItem';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { DomainEvent } from '@domain/events/DomainEvent';
import {
  ReagentItemCreatedEvent,
  ReagentItemUpdatedEvent,
  ReagentItemArchivedEvent,
  ReagentItemDeletedEvent,
  ReagentCategoryCreatedEvent,
  ReagentCategoryUpdatedEvent,
  ReagentCategoryDeletedEvent,
  ReagentDocumentAddedEvent,
  ReagentDocumentRemovedEvent,
  ReagentStockReceivedEvent,
  ReagentStockIssuedEvent,
  ReagentStockCountAdjustedEvent,
  ReagentStockDisposedEvent,
  ReagentStockVoidedEvent,
  ReagentBulkReceivedEvent,
  ReagentBulkIssuedEvent,
  ReagentBulkCategoryReassignedEvent,
  ReagentBulkArchivedEvent,
  ReagentBulkVoidedEvent,
  type BulkVoidItemDetail,
} from '@domain/events/ReagentEvents';
import type {
  AttributeRepository,
  AttributeValueRow,
} from '@domain/repositories/AttributeRepository';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';
import type {
  ReagentItemRepository,
  ReagentBarcodeRow,
  ReagentTransactionRow,
} from '@domain/repositories/ReagentItemRepository';
import type { SupplyItemRepository } from '@domain/repositories/SupplyItemRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { FieldChange } from '@domain/types/fieldChangeTypes';
import { generateInternalBarcodeValue } from '@domain/utils/barcodeValue';
import { generateId } from '@domain/utils/generateId';
import { isUniqueConstraintError } from '@infrastructure/database/DatabaseErrors';
import { logger } from '@infrastructure/logging/logger';

import { executeBulk } from './executeBulk';
import { trackFieldChanges } from './trackFieldChanges';

import type {
  CreateReagentCategoryRequest,
  UpdateReagentCategoryRequest,
  CreateReagentItemRequest,
  UpdateReagentItemRequest,
  CreateReagentBarcodeRequest,
  UpdateReagentBarcodeRequest,
  CreateReagentDocumentRequest,
  UpdateReagentDocumentRequest,
  CreateReagentPackagingLevelRequest,
  UpdateReagentLotRequest,
  RecordReagentTransactionRequest,
  SetAttributeValueRequest,
  AttributeValue,
  RecordReagentStockCountRequest,
  ReagentBulkReceiveRequest,
  ReagentBulkIssueRequest,
  VoidReagentTransactionRequest,
  ReagentBulkVoidRequest,
  ReagentBulkResponse,
  ReagentBulkBarcodesResponse,
  ReagentBulkLotLabelsResponse,
} from '@odysseus/shared-schemas';

/** The ledger types that carry a stock delta; a void publishes its own event instead. */
type StockEventType = 'received' | 'issued' | 'count_adjustment' | 'disposed';

export class ReagentApplicationService {
  constructor(
    private categoryRepository: CategoryRepository<ReagentCategory>,
    private itemRepository: ReagentItemRepository,
    private supplyItemRepository: SupplyItemRepository,
    private attributeRepository: AttributeRepository,
    private accessControlService: AccessControlService,
    private eventBus: EventBus
  ) {}

  // Categories

  async listCategories(labId: string): Promise<ReagentCategoryResponse[]> {
    const categories = await this.categoryRepository.findByLabId(labId);
    return categories.map(ReagentDto.categoryToResponse);
  }

  async createCategory(
    labId: string,
    data: CreateReagentCategoryRequest,
    user: User
  ): Promise<ReagentCategoryResponse> {
    await this.accessControlService.requireAdminAccess(user);

    await validateHierarchyDepth(this.categoryRepository, { labId, parentId: data.parentId });

    const category = ReagentCategory.create({
      labId,
      name: data.name,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    });
    await this.categoryRepository.save(category);
    await this.eventBus.publish(
      new ReagentCategoryCreatedEvent(category.id, category.name, category.parentId, user.id, labId)
    );
    return ReagentDto.categoryToResponse(category);
  }

  async updateCategory(
    labId: string,
    id: string,
    data: UpdateReagentCategoryRequest,
    user: User
  ): Promise<ReagentCategoryResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const category = await this.getCategoryOrThrow(id, labId);

    // Only a change of parent can violate the depth rule.
    if (data.parentId !== undefined && data.parentId !== category.parentId) {
      await validateHierarchyDepth(this.categoryRepository, {
        labId,
        parentId: data.parentId,
        movingNodeId: id,
      });
    }

    category.update({ name: data.name, parentId: data.parentId, sortOrder: data.sortOrder });
    await this.categoryRepository.save(category);
    await this.eventBus.publish(
      new ReagentCategoryUpdatedEvent(category.id, category.name, user.id, labId)
    );
    return ReagentDto.categoryToResponse(category);
  }

  async deleteCategory(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const category = await this.getCategoryOrThrow(id, labId);

    const hasItems = await this.categoryRepository.hasItemsIncludingChildren(id, labId);
    if (hasItems)
      throw new ValidationError(
        'Cannot delete category — reagent items are still assigned to it or its subcategories'
      );

    const hasChildren = await this.categoryRepository.hasChildren(id, labId);
    if (hasChildren) {
      const allCategories = await this.categoryRepository.findByLabId(labId);
      const childIds = allCategories.filter(c => c.parentId === id).map(c => c.id);
      for (const childId of childIds) {
        await this.categoryRepository.delete(childId, labId);
      }
    }

    await this.categoryRepository.delete(id, labId);
    await this.eventBus.publish(new ReagentCategoryDeletedEvent(id, category.name, user.id, labId));
  }

  // Items

  async listItems(labId: string): Promise<ReagentItemWithStockResponse[]> {
    const itemsWithStock = await this.itemRepository.findByLabIdWithStock(labId);
    // One query for the lab's values, grouped in memory — per-item fetches would be an N+1.
    const values = await this.itemRepository.findAttributeValuesByLabId(labId);
    const byItem = new Map<string, AttributeValueRow[]>();
    for (const value of values) {
      const bucket = byItem.get(value.itemId) ?? [];
      bucket.push(value);
      byItem.set(value.itemId, bucket);
    }

    return itemsWithStock.map(withStock =>
      ReagentDto.itemWithStockToResponse(
        withStock,
        (byItem.get(withStock.item.id) ?? []).map(AttributeDto.summaryToResponse)
      )
    );
  }

  async getItem(labId: string, id: string): Promise<ReagentItemDetailResponse> {
    const item = await this.getItemOrThrow(id, labId);
    const [lots, documents, barcodes, packagingLevels, attributeValues] = await Promise.all([
      this.itemRepository.findLotsByItemId(id),
      this.itemRepository.findDocumentsByItemId(id),
      this.itemRepository.findBarcodesByItemId(id),
      this.itemRepository.findPackagingLevelsByItemId(id),
      this.itemRepository.findAttributeValuesByItemId(id),
    ]);
    return ReagentDto.itemDetailToResponse(
      item,
      lots,
      documents,
      barcodes,
      packagingLevels,
      attributeValues.map(AttributeDto.valueToResponse)
    );
  }

  async createItem(
    labId: string,
    data: CreateReagentItemRequest,
    user: User
  ): Promise<ReagentItemResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const category = await this.categoryRepository.findById(data.categoryId, labId);
    if (!category) throw new NotFoundError('Category not found');

    const item = ReagentItem.create({ labId, ...data });
    await this.itemRepository.save(item);

    await this.generateInternalBarcode(item.id);

    await this.eventBus.publish(
      new ReagentItemCreatedEvent(item.id, item.name, item.categoryId, user.id, labId)
    );
    return ReagentDto.itemToResponse(item);
  }

  async updateItem(
    labId: string,
    id: string,
    data: UpdateReagentItemRequest,
    user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<ReagentItemResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(id, labId);

    if (data.categoryId && data.categoryId !== item.categoryId) {
      const category = await this.categoryRepository.findById(data.categoryId, labId);
      if (!category) throw new NotFoundError('Category not found');
    }

    const changes = this.trackItemChanges(item, data);
    item.update(data);
    await this.itemRepository.save(item);

    if (changes.length > 0) {
      const event = new ReagentItemUpdatedEvent(item.id, changes, user.id, labId);
      if (options?.bulkOperation) event.partOfBulkOperation = true;
      await this.eventBus.publish(event);
    }

    return ReagentDto.itemToResponse(item);
  }

  async archiveItem(
    labId: string,
    id: string,
    user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(id, labId);

    const hasTransactions = await this.itemRepository.hasTransactions(id);
    if (hasTransactions) {
      item.archive();
      await this.itemRepository.save(item);
      const event = new ReagentItemArchivedEvent(item.id, item.name, user.id, labId);
      if (options?.bulkOperation) event.partOfBulkOperation = true;
      await this.eventBus.publish(event);
    } else {
      await this.deleteItem(labId, id, user);
    }
  }

  async deleteItem(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(id, labId);
    await this.itemRepository.delete(id, labId);
    await this.eventBus.publish(new ReagentItemDeletedEvent(id, item.name, user.id, labId));
  }

  // Attribute values

  async setAttributeValue(
    labId: string,
    itemId: string,
    data: SetAttributeValueRequest,
    user: User
  ): Promise<AttributeValue[]> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);

    const definition = await this.attributeRepository.findDefinitionById(data.definitionId, labId);
    if (!definition) {
      throw new NotFoundError('This attribute could not be found.', {
        definitionId: data.definitionId,
      });
    }

    const rows = definition.usesOptions
      ? (data.valueOptionIds ?? []).map(valueOptionId => ({
          id: generateId('ratv'),
          itemId,
          definitionId: definition.id,
          valueOptionId,
        }))
      : this.scalarAttributeRows(itemId, definition.id, data);

    if (definition.valueType === 'select' && rows.length > 1) {
      throw new ValidationError(`"${definition.name}" accepts a single value`);
    }

    await this.itemRepository.replaceAttributeValues(itemId, definition.id, rows);
    const stored = await this.itemRepository.findAttributeValuesByItemId(itemId);
    return stored
      .filter(row => row.definitionId === definition.id)
      .map(AttributeDto.valueToResponse);
  }

  private scalarAttributeRows(
    itemId: string,
    definitionId: string,
    data: SetAttributeValueRequest
  ): AttributeValueRow[] {
    const isEmpty = data.valueText === undefined && data.valueNumber === undefined;
    if (isEmpty) return [];
    return [
      {
        id: generateId('ratv'),
        itemId,
        definitionId,
        valueText: data.valueText,
        valueNumber: data.valueNumber,
      },
    ];
  }

  // Documents

  async addDocument(
    labId: string,
    itemId: string,
    data: CreateReagentDocumentRequest,
    user: User
  ): Promise<ReagentDocumentResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);
    const document = ReagentDocument.create({
      itemId,
      label: data.label,
      url: data.url,
      notes: data.notes,
      docType: data.docType,
    });
    await this.itemRepository.saveDocument(document);
    await this.eventBus.publish(new ReagentDocumentAddedEvent(itemId, data.label, user.id, labId));
    return ReagentDto.documentToResponse(document);
  }

  async updateDocument(
    labId: string,
    itemId: string,
    docId: string,
    data: UpdateReagentDocumentRequest,
    user: User
  ): Promise<ReagentDocumentResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);
    const updated = await this.itemRepository.updateDocument(docId, itemId, {
      label: data.label,
      url: data.url,
      notes: data.notes,
      docType: data.docType,
    });
    if (!updated) throw new NotFoundError('This document could not be found.');
    return ReagentDto.documentToResponse(updated);
  }

  async removeDocument(labId: string, itemId: string, docId: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);
    const deleted = await this.itemRepository.deleteDocument(docId, itemId);
    if (!deleted) throw new NotFoundError('This document could not be found.');
    await this.eventBus.publish(new ReagentDocumentRemovedEvent(itemId, user.id, labId));
  }

  // Barcodes

  async addBarcode(
    labId: string,
    itemId: string,
    data: CreateReagentBarcodeRequest,
    user: User
  ): Promise<ReagentBarcodeResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);

    await requireUnusedBarcodeValue(data.barcodeValue, [
      this.itemRepository,
      this.supplyItemRepository,
    ]);

    const barcode: ReagentBarcodeRow = {
      id: generateId('rbcd'),
      itemId,
      lotId: data.lotId,
      barcodeValue: data.barcodeValue,
      barcodeType: data.barcodeType,
      isPrimary: data.isPrimary ?? false,
      label: data.label,
    };
    await this.itemRepository.saveBarcode(barcode);
    return ReagentDto.barcodeToResponse(barcode);
  }

  async updateBarcode(
    labId: string,
    itemId: string,
    barcodeId: string,
    data: UpdateReagentBarcodeRequest,
    user: User
  ): Promise<ReagentBarcodeResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);
    const updated = await this.itemRepository.updateBarcode(barcodeId, itemId, {
      label: data.label,
      isPrimary: data.isPrimary,
    });
    if (!updated) throw new NotFoundError('This barcode could not be found.');
    return ReagentDto.barcodeToResponse(updated);
  }

  async removeBarcode(labId: string, itemId: string, barcodeId: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);
    const deleted = await this.itemRepository.deleteBarcode(barcodeId, itemId);
    if (!deleted) throw new NotFoundError('This barcode could not be found.');
  }

  async getBulkBarcodes(
    labId: string,
    itemIds: string[]
  ): Promise<ReagentBulkBarcodesResponse['barcodes']> {
    if (itemIds.length === 0) return [];

    const uniqueIds = [...new Set(itemIds)];
    const rows = await this.itemRepository.findPrimaryBarcodesByItemIds(uniqueIds, labId);
    const valueByItemId = new Map<string, string>();
    for (const row of rows) {
      valueByItemId.set(row.itemId, row.barcodeValue);
    }

    return uniqueIds.map(itemId => ({
      itemId,
      barcodeValue: valueByItemId.get(itemId) ?? null,
    }));
  }

  async getBulkLotLabels(
    labId: string,
    itemIds: string[]
  ): Promise<ReagentBulkLotLabelsResponse['lotLabels']> {
    if (itemIds.length === 0) return [];
    return this.itemRepository.findLotLabelsByItemIds([...new Set(itemIds)], labId);
  }

  async regenerateInternalBarcode(
    labId: string,
    itemId: string,
    user: User
  ): Promise<ReagentBarcodeResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);

    const barcodes = await this.itemRepository.findBarcodesByItemId(itemId);
    const existingInternal = barcodes.find(b => b.barcodeType === 'internal' && !b.lotId);
    if (existingInternal) {
      await this.itemRepository.deleteBarcode(existingInternal.id, itemId);
    }

    const barcode: ReagentBarcodeRow = {
      id: generateId('rbcd'),
      itemId,
      barcodeValue: generateInternalBarcodeValue('reagentItem'),
      barcodeType: 'internal',
      isPrimary: true,
    };
    await this.itemRepository.saveBarcode(barcode);
    return ReagentDto.barcodeToResponse(barcode);
  }

  // Packaging levels

  async addPackagingLevel(
    labId: string,
    itemId: string,
    data: CreateReagentPackagingLevelRequest,
    user: User
  ): Promise<ReagentPackagingLevelResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);

    const existing = await this.itemRepository.findPackagingLevelsByItemId(itemId);
    if (existing.some(l => l.unitName === data.unitName)) {
      throw new ValidationError(
        `A packaging level for "${data.unitName}" already exists on this item`
      );
    }
    if (data.parentUnit !== null && !existing.some(l => l.unitName === data.parentUnit)) {
      throw new ValidationError(
        `Parent unit "${data.parentUnit}" does not exist in the packaging chain`
      );
    }

    const level = {
      id: generateId('rpkg'),
      itemId,
      unitName: data.unitName,
      quantity: data.quantity,
      parentUnit: data.parentUnit ?? undefined,
    };
    await this.itemRepository.savePackagingLevel(level);
    return ReagentDto.packagingLevelToResponse(level);
  }

  async removePackagingLevel(
    labId: string,
    itemId: string,
    levelId: string,
    user: User
  ): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);

    const levels = await this.itemRepository.findPackagingLevelsByItemId(itemId);
    const level = levels.find(l => l.id === levelId);
    if (!level) throw new NotFoundError('Packaging level not found');

    const hasChildren = levels.some(l => l.parentUnit === level.unitName);
    if (hasChildren) {
      throw new ValidationError(
        `Cannot delete "${level.unitName}" — other levels reference it as a parent. Delete from the top of the chain down.`
      );
    }

    await this.itemRepository.deletePackagingLevel(levelId);
  }

  // Lots

  async updateLot(
    labId: string,
    itemId: string,
    lotId: string,
    data: UpdateReagentLotRequest,
    user: User
  ): Promise<ReagentLotResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);
    const updated = await this.itemRepository.updateLot(lotId, itemId, {
      openedDate: data.openedDate,
      expirationDate: data.expirationDate,
    });
    if (!updated) throw new NotFoundError('This lot could not be found.');
    return ReagentDto.lotToResponse(updated);
  }

  // Stock operations

  async recordTransaction(
    labId: string,
    data: RecordReagentTransactionRequest,
    user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<ReagentTransactionResponse[]> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(data.itemId, labId);

    const txns = await this.itemRepository.recordTransaction({
      itemId: data.itemId,
      locationId: data.locationId,
      labId,
      type: data.type,
      performedBy: user.id,
      quantity: data.quantity,
      lotId: data.lotId,
      lotNumber: data.lotNumber,
      expirationDate: data.expirationDate,
      openedDate: data.openedDate,
      receivedDate: data.receivedDate,
      concentration: data.concentration,
      concentrationUnit: data.concentrationUnit,
      includeExpired: data.includeExpired,
      poNumber: data.poNumber,
      cost: data.cost,
      notes: data.notes,
    });

    await this.publishStockEvent(txns, data.type, data.itemId, data.locationId, user.id, labId, options);
    return txns.map(ReagentDto.transactionToResponse);
  }

  async recordStockCount(
    labId: string,
    data: RecordReagentStockCountRequest,
    user: User
  ): Promise<ReagentTransactionResponse[]> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(data.itemId, labId);

    const txns = await this.itemRepository.recordTransaction({
      itemId: data.itemId,
      locationId: data.locationId,
      labId,
      type: 'count_adjustment',
      performedBy: user.id,
      actualCount: data.actualCount,
      lotId: data.lotId,
      notes: data.notes,
    });

    await this.publishStockEvent(txns, 'count_adjustment', data.itemId, data.locationId, user.id, labId);
    return txns.map(ReagentDto.transactionToResponse);
  }

  async getTransactionHistory(
    labId: string,
    itemId: string
  ): Promise<ReagentTransactionResponse[]> {
    await this.getItemOrThrow(itemId, labId);
    const txns = await this.itemRepository.findTransactionsByItemId(itemId);
    return txns.map(ReagentDto.transactionToResponse);
  }

  async voidTransaction(
    labId: string,
    transactionId: string,
    data: VoidReagentTransactionRequest,
    user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<{ original: ReagentTransactionResponse; reversal: ReagentTransactionResponse }> {
    await this.accessControlService.requireAdminAccess(user);

    const existing = await this.itemRepository.findTransactionById(transactionId, labId);
    if (!existing) {
      throw new NotFoundError('This transaction could not be found.');
    }
    if (existing.voidedAt) {
      throw new ValidationError('Transaction has already been voided');
    }
    if (existing.type === 'void_reversal') {
      throw new ValidationError('Cannot void a void reversal transaction');
    }

    const { original, reversal } = await this.itemRepository.voidTransaction({
      transactionId,
      labId,
      voidedBy: user.id,
      voidReason: data.reason,
    });

    const event = new ReagentStockVoidedEvent(
      original.itemId,
      original.id,
      reversal.id,
      reversal.quantityChange,
      original.locationId,
      data.reason,
      user.id,
      labId
    );
    if (options?.bulkOperation) event.partOfBulkOperation = true;
    await this.eventBus.publish(event);

    return {
      original: ReagentDto.transactionToResponse(original),
      reversal: ReagentDto.transactionToResponse(reversal),
    };
  }

  // Bulk operations

  async bulkReceive(
    labId: string,
    data: ReagentBulkReceiveRequest,
    user: User
  ): Promise<ReagentBulkResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const result = await executeBulk(
      data.items,
      async item => {
        await this.recordTransaction(
          labId,
          {
            itemId: item.itemId,
            locationId: item.locationId,
            type: 'received',
            quantity: item.quantity,
            lotNumber: item.lotNumber,
            expirationDate: item.expirationDate,
            receivedDate: item.receivedDate,
            poNumber: item.poNumber,
            cost: item.cost,
          },
          user,
          { bulkOperation: true }
        );
        return item.itemId;
      },
      (item, _index, error) => ({ id: item.itemId, error })
    );

    if (result.succeeded.length > 0) {
      const perItemData = data.items
        .filter(item => result.succeeded.includes(item.itemId))
        .map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          locationId: item.locationId,
        }));
      await this.eventBus.publish(new ReagentBulkReceivedEvent(perItemData, user.id, labId));
    }

    return result;
  }

  async bulkIssue(
    labId: string,
    data: ReagentBulkIssueRequest,
    user: User
  ): Promise<ReagentBulkResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const result = await executeBulk(
      data.items,
      async item => {
        await this.recordTransaction(
          labId,
          {
            itemId: item.itemId,
            locationId: item.locationId,
            type: 'issued',
            quantity: item.quantity,
          },
          user,
          { bulkOperation: true }
        );
        return item.itemId;
      },
      (item, _index, error) => ({ id: item.itemId, error })
    );

    if (result.succeeded.length > 0) {
      const perItemData = data.items
        .filter(item => result.succeeded.includes(item.itemId))
        .map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          locationId: item.locationId,
        }));
      await this.eventBus.publish(new ReagentBulkIssuedEvent(perItemData, user.id, labId));
    }

    return result;
  }

  async bulkReassignCategory(
    labId: string,
    itemIds: string[],
    categoryId: string,
    user: User
  ): Promise<ReagentBulkResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const category = await this.categoryRepository.findById(categoryId, labId);
    if (!category) throw new NotFoundError('Target category not found');

    const result = await executeBulk(
      itemIds,
      async itemId => {
        await this.updateItem(labId, itemId, { categoryId }, user, { bulkOperation: true });
        return itemId;
      },
      (itemId, _index, error) => ({ id: itemId, error })
    );

    if (result.succeeded.length > 0) {
      await this.eventBus.publish(
        new ReagentBulkCategoryReassignedEvent(result.succeeded, categoryId, user.id, labId)
      );
    }

    return result;
  }

  async bulkArchive(labId: string, itemIds: string[], user: User): Promise<ReagentBulkResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const result = await executeBulk(
      itemIds,
      async itemId => {
        await this.archiveItem(labId, itemId, user, { bulkOperation: true });
        return itemId;
      },
      (itemId, _index, error) => ({ id: itemId, error })
    );

    if (result.succeeded.length > 0) {
      await this.eventBus.publish(new ReagentBulkArchivedEvent(result.succeeded, user.id, labId));
    }

    return result;
  }

  async bulkVoidTransactions(
    labId: string,
    data: ReagentBulkVoidRequest,
    user: User
  ): Promise<ReagentBulkResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const perItemData: BulkVoidItemDetail[] = [];
    const result = await executeBulk(
      data.transactionIds,
      async transactionId => {
        const { original, reversal } = await this.voidTransaction(
          labId,
          transactionId,
          { reason: data.reason },
          user,
          { bulkOperation: true }
        );
        perItemData.push({
          transactionId: original.id,
          itemId: original.itemId,
          quantityReversed: reversal.quantityChange,
          locationId: original.locationId,
        });
        return transactionId;
      },
      (transactionId, _index, error) => ({ id: transactionId, error })
    );

    if (perItemData.length > 0) {
      await this.eventBus.publish(
        new ReagentBulkVoidedEvent(perItemData, user.id, data.reason, labId)
      );
    }

    return result;
  }

  // Helpers

  private async getItemOrThrow(id: string, labId: string): Promise<ReagentItem> {
    const item = await this.itemRepository.findById(id, labId);
    if (!item) throw new NotFoundError('This reagent item could not be found.', { itemId: id });
    return item;
  }

  private async getCategoryOrThrow(id: string, labId: string): Promise<ReagentCategory> {
    const category = await this.categoryRepository.findById(id, labId);
    if (!category) throw new NotFoundError('This category could not be found.', { categoryId: id });
    return category;
  }


  /**
   * Auto-generates an item-level internal barcode on item creation. Only a value collision is
   * retried — any other failure propagates rather than leaving the item silently unlabelled.
   */
  private async generateInternalBarcode(itemId: string): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const barcode: ReagentBarcodeRow = {
          id: generateId('rbcd'),
          itemId,
          barcodeValue: generateInternalBarcodeValue('reagentItem'),
          barcodeType: 'internal',
          isPrimary: true,
        };
        await this.itemRepository.saveBarcode(barcode);
        return;
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        if (attempt === 2) {
          logger.warn('Failed to auto-generate internal barcode after 3 attempts', {
            itemId,
            error,
          });
        }
      }
    }
  }

  private async publishStockEvent(
    txns: ReagentTransactionRow[],
    type: StockEventType,
    itemId: string,
    locationId: string,
    userId: string,
    labId: string,
    options?: { bulkOperation?: boolean }
  ): Promise<void> {
    const netChange = txns.reduce((sum, txn) => sum + txn.quantityChange, 0);
    const event = this.createStockEvent(type, itemId, netChange, locationId, userId, labId);
    if (options?.bulkOperation) event.partOfBulkOperation = true;
    await this.eventBus.publish(event);
  }

  private createStockEvent(
    type: StockEventType,
    itemId: string,
    quantity: number,
    locationId: string,
    userId: string,
    labId: string
  ): DomainEvent {
    switch (type) {
      case 'received':
        return new ReagentStockReceivedEvent(itemId, quantity, locationId, userId, labId);
      case 'issued':
        return new ReagentStockIssuedEvent(itemId, quantity, locationId, userId, labId);
      case 'count_adjustment':
        return new ReagentStockCountAdjustedEvent(itemId, quantity, locationId, userId, labId);
      case 'disposed':
        return new ReagentStockDisposedEvent(itemId, quantity, locationId, userId, labId);
    }
  }

  private trackItemChanges(item: ReagentItem, data: UpdateReagentItemRequest): FieldChange[] {
    return trackFieldChanges(data, [
      { key: 'categoryId', getter: () => item.categoryId },
      { key: 'name', getter: () => item.name },
      { key: 'manufacturer', getter: () => item.manufacturer },
      { key: 'catalogNumber', getter: () => item.catalogNumber },
      { key: 'vendorName', getter: () => item.vendorName },
      { key: 'vendorCatalogNumber', getter: () => item.vendorCatalogNumber },
      { key: 'stockUnit', getter: () => item.stockUnit },
      { key: 'reagentType', getter: () => item.reagentType },
      { key: 'casNumber', getter: () => item.casNumber },
      { key: 'concentration', getter: () => item.concentration },
      { key: 'concentrationUnit', getter: () => item.concentrationUnit },
      { key: 'expiryWarningDays', getter: () => item.expiryWarningDays },
      { key: 'reorderThreshold', getter: () => item.reorderThreshold },
      { key: 'reorderThresholdUnit', getter: () => item.reorderThresholdUnit },
      { key: 'reorderQuantity', getter: () => item.reorderQuantity },
      { key: 'reorderUnit', getter: () => item.reorderUnit },
      { key: 'unitPrice', getter: () => item.unitPrice },
      { key: 'description', getter: () => item.description },
      { key: 'notes', getter: () => item.notes },
    ]);
  }
}
