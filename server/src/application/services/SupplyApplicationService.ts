/**
 * Supply Application Service
 *
 * Orchestrates all supply business logic: item CRUD with barcode auto-generation,
 * stock operations, category/location/document management, and bulk operations.
 */

import type { EventBus } from '@application/contracts/EventBus';
import { AttributeDto } from '@application/dto/AttributeDto';
import {
  SupplyDto,
  type SupplyCategoryResponse,
  type SupplyItemResponse,
  type SupplyItemWithStockResponse,
  type SupplyItemDetailResponse,
  type SupplyDocumentResponse,
  type SupplyBarcodeResponse,
  type SupplyTransactionResponse,
  type SupplyPackagingLevelResponse,
} from '@application/dto/SupplyDto';
import { requireUnusedBarcodeValue } from '@application/guards/BarcodeGuards';
import { rejectIfTaxonomyLocked, rejectSeededItemDeletion } from '@application/guards/DemoGuards';
import { validateHierarchyDepth } from '@application/guards/HierarchyGuards';
import { SupplyCategory } from '@domain/entities/SupplyCategory';
import { SupplyDocument } from '@domain/entities/SupplyDocument';
import { SupplyItem } from '@domain/entities/SupplyItem';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  SupplyItemCreatedEvent,
  SupplyItemUpdatedEvent,
  SupplyItemArchivedEvent,
  SupplyItemDeletedEvent,
  SupplyCategoryCreatedEvent,
  SupplyCategoryUpdatedEvent,
  SupplyCategoryDeletedEvent,
  SupplyDocumentAddedEvent,
  SupplyDocumentRemovedEvent,
  SupplyStockReceivedEvent,
  SupplyStockIssuedEvent,
  SupplyStockCountAdjustedEvent,
  SupplyStockDisposedEvent,
  SupplyStockVoidedEvent,
  SupplyBulkReceivedEvent,
  SupplyBulkIssuedEvent,
  SupplyBulkCategoryReassignedEvent,
  SupplyBulkArchivedEvent,
  SupplyBulkVoidedEvent,
  type BulkVoidItemDetail,
} from '@domain/events/SupplyEvents';
import type {
  AttributeRepository,
  AttributeValueRow,
} from '@domain/repositories/AttributeRepository';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';
import type { ReagentItemRepository } from '@domain/repositories/ReagentItemRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type {
  SupplyItemRepository,
  SupplyBarcodeRow,
} from '@domain/repositories/SupplyItemRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { FieldChange } from '@domain/types/fieldChangeTypes';
import { generateInternalBarcodeValue } from '@domain/utils/barcodeValue';
import { generateId } from '@domain/utils/generateId';
import { isUniqueConstraintError } from '@infrastructure/database/DatabaseErrors';
import { logger } from '@infrastructure/logging/logger';

import { executeBulk } from './executeBulk';
import { trackFieldChanges } from './trackFieldChanges';

import type {
  CreateSupplyCategoryRequest,
  UpdateSupplyCategoryRequest,
  CreateSupplyItemRequest,
  UpdateSupplyItemRequest,
  CreateSupplyBarcodeRequest,
  UpdateSupplyBarcodeRequest,
  CreateSupplyDocumentRequest,
  UpdateSupplyDocumentRequest,
  CreateSupplyPackagingLevelRequest,
  RecordSupplyTransactionRequest,
  RecordSupplyStockCountRequest,
  SupplyBulkReceiveRequest,
  SupplyBulkIssueRequest,
  VoidSupplyTransactionRequest,
  SupplyBulkVoidRequest,
  SupplyBulkResponse,
  SupplyBulkBarcodesResponse,
  AttributeValue,
  SetAttributeValueRequest,
} from '@odysseus/shared-schemas';

/** The ledger types that carry a stock delta; a void publishes its own event instead. */
type StockEventType = 'received' | 'issued' | 'count_adjustment' | 'disposed';

export class SupplyApplicationService {
  constructor(
    private categoryRepository: CategoryRepository<SupplyCategory>,
    private itemRepository: SupplyItemRepository,
    private reagentItemRepository: ReagentItemRepository,
    private attributeRepository: AttributeRepository,
    private accessControlService: AccessControlService,
    private eventBus: EventBus,
    private storageRepository: StorageRepository
  ) {}

  // Categories

  async listCategories(labId: string): Promise<SupplyCategoryResponse[]> {
    const categories = await this.categoryRepository.findByLabId(labId);
    return categories.map(SupplyDto.categoryToResponse);
  }

  async createCategory(
    labId: string,
    data: CreateSupplyCategoryRequest,
    user: User
  ): Promise<SupplyCategoryResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await rejectIfTaxonomyLocked(user, this.storageRepository, labId, 'Categories');

    await validateHierarchyDepth(this.categoryRepository, { labId, parentId: data.parentId });

    const category = SupplyCategory.create({
      labId,
      name: data.name,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    });
    await this.categoryRepository.save(category);
    await this.eventBus.publish(
      new SupplyCategoryCreatedEvent(category.id, category.name, category.parentId, user.id, labId)
    );
    return SupplyDto.categoryToResponse(category);
  }

  async updateCategory(
    labId: string,
    id: string,
    data: UpdateSupplyCategoryRequest,
    user: User
  ): Promise<SupplyCategoryResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await rejectIfTaxonomyLocked(user, this.storageRepository, labId, 'Categories');
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
      new SupplyCategoryUpdatedEvent(category.id, category.name, user.id, labId)
    );
    return SupplyDto.categoryToResponse(category);
  }

  async deleteCategory(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await rejectIfTaxonomyLocked(user, this.storageRepository, labId, 'Categories');
    const category = await this.getCategoryOrThrow(id, labId);

    const hasItems = await this.categoryRepository.hasItemsIncludingChildren(id, labId);
    if (hasItems)
      throw new ValidationError(
        'Cannot delete category — supply items are still assigned to it or its subcategories'
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
    await this.eventBus.publish(new SupplyCategoryDeletedEvent(id, category.name, user.id, labId));
  }

  // Items

  async listItems(labId: string): Promise<SupplyItemWithStockResponse[]> {
    const itemsWithStock = await this.itemRepository.findByLabIdWithStock(labId);
    // One query for the lab's values, grouped in memory — per-item fetches would be an N+1.
    const values = await this.itemRepository.findAttributeValuesByLabId(labId);
    const byItem = new Map<string, AttributeValueRow[]>();
    for (const value of values) {
      const bucket = byItem.get(value.itemId) ?? [];
      bucket.push(value);
      byItem.set(value.itemId, bucket);
    }

    return itemsWithStock.map(({ item, totalStock, locationNames }) =>
      SupplyDto.itemWithStockToResponse(
        item,
        totalStock,
        locationNames,
        (byItem.get(item.id) ?? []).map(AttributeDto.summaryToResponse)
      )
    );
  }

  async getItem(labId: string, id: string): Promise<SupplyItemDetailResponse> {
    const item = await this.getItemOrThrow(id, labId);
    const [documents, barcodes, stock, recentTransactions, packagingLevels, attributeValues] =
      await Promise.all([
        this.itemRepository.findDocumentsByItemId(id),
        this.itemRepository.findBarcodesByItemId(id),
        this.itemRepository.findStockByItemId(id),
        this.itemRepository.findTransactionsByItemId(id, 50),
        this.itemRepository.findPackagingLevelsByItemId(id),
        this.itemRepository.findAttributeValuesByItemId(id),
      ]);
    return SupplyDto.itemDetailToResponse(
      item,
      documents,
      barcodes,
      stock,
      recentTransactions,
      packagingLevels,
      attributeValues.map(AttributeDto.valueToResponse)
    );
  }

  async createItem(
    labId: string,
    data: CreateSupplyItemRequest,
    user: User
  ): Promise<SupplyItemResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const category = await this.categoryRepository.findById(data.categoryId, labId);
    if (!category) throw new NotFoundError('Category not found');

    const item = SupplyItem.create({ labId, ...data });
    await this.itemRepository.save(item);

    await this.generateInternalBarcode(item.id);

    await this.eventBus.publish(
      new SupplyItemCreatedEvent(item.id, item.name, item.categoryId, user.id, labId)
    );
    return SupplyDto.itemToResponse(item);
  }

  async updateItem(
    labId: string,
    id: string,
    data: UpdateSupplyItemRequest,
    user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<SupplyItemResponse> {
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
      const event = new SupplyItemUpdatedEvent(item.id, changes, user.id, labId);
      if (options?.bulkOperation) event.partOfBulkOperation = true;
      await this.eventBus.publish(event);
    }

    return SupplyDto.itemToResponse(item);
  }

  async archiveItem(
    labId: string,
    id: string,
    user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(id, labId);
    rejectSeededItemDeletion(user, item, 'supply');

    const hasTransactions = await this.itemRepository.hasTransactions(id);
    if (hasTransactions) {
      item.archive();
      await this.itemRepository.save(item);
      const event = new SupplyItemArchivedEvent(item.id, item.name, user.id, labId);
      if (options?.bulkOperation) event.partOfBulkOperation = true;
      await this.eventBus.publish(event);
    } else {
      await this.deleteItem(labId, id, user);
    }
  }

  async deleteItem(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(id, labId);
    rejectSeededItemDeletion(user, item, 'supply');
    await this.itemRepository.delete(id, labId);
    await this.eventBus.publish(new SupplyItemDeletedEvent(id, item.name, user.id, labId));
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
          id: generateId('satv'),
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
        id: generateId('satv'),
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
    data: CreateSupplyDocumentRequest,
    user: User
  ): Promise<SupplyDocumentResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);
    const document = SupplyDocument.create({
      itemId,
      label: data.label,
      url: data.url,
      notes: data.notes,
      docType: data.docType,
    });
    await this.itemRepository.saveDocument(document);
    await this.eventBus.publish(new SupplyDocumentAddedEvent(itemId, data.label, user.id, labId));
    return SupplyDto.documentToResponse(document);
  }

  async updateDocument(
    labId: string,
    itemId: string,
    docId: string,
    data: UpdateSupplyDocumentRequest,
    user: User
  ): Promise<SupplyDocumentResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);
    const updated = await this.itemRepository.updateDocument(docId, itemId, {
      label: data.label,
      url: data.url,
      notes: data.notes,
      docType: data.docType,
    });
    if (!updated) throw new NotFoundError('This document could not be found.');
    return SupplyDto.documentToResponse(updated);
  }

  async removeDocument(labId: string, itemId: string, docId: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(itemId, labId);
    rejectSeededItemDeletion(user, item, 'document');
    const deleted = await this.itemRepository.deleteDocument(docId, itemId);
    if (!deleted) throw new NotFoundError('This document could not be found.');
    await this.eventBus.publish(new SupplyDocumentRemovedEvent(itemId, user.id, labId));
  }

  // Barcodes

  async addBarcode(
    labId: string,
    itemId: string,
    data: CreateSupplyBarcodeRequest,
    user: User
  ): Promise<SupplyBarcodeResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);

    await requireUnusedBarcodeValue(data.barcodeValue, [
      this.itemRepository,
      this.reagentItemRepository,
    ]);

    const barcode: SupplyBarcodeRow = {
      id: generateId('sbar'),
      itemId,
      barcodeValue: data.barcodeValue,
      barcodeType: data.barcodeType,
      isPrimary: data.isPrimary ?? false,
      label: data.label,
    };
    await this.itemRepository.saveBarcode(barcode);
    return SupplyDto.barcodeToResponse(barcode);
  }

  async updateBarcode(
    labId: string,
    itemId: string,
    barcodeId: string,
    data: UpdateSupplyBarcodeRequest,
    user: User
  ): Promise<SupplyBarcodeResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);
    const updated = await this.itemRepository.updateBarcode(barcodeId, itemId, {
      label: data.label,
      isPrimary: data.isPrimary,
    });
    if (!updated) throw new NotFoundError('This barcode could not be found.');
    return SupplyDto.barcodeToResponse(updated);
  }

  async removeBarcode(labId: string, itemId: string, barcodeId: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(itemId, labId);
    rejectSeededItemDeletion(user, item, 'barcode');
    const deleted = await this.itemRepository.deleteBarcode(barcodeId, itemId);
    if (!deleted) throw new NotFoundError('This barcode could not be found.');
  }

  async getBulkBarcodes(
    labId: string,
    itemIds: string[]
  ): Promise<SupplyBulkBarcodesResponse['barcodes']> {
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

  async regenerateInternalBarcode(
    labId: string,
    itemId: string,
    user: User
  ): Promise<SupplyBarcodeResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);

    const barcodes = await this.itemRepository.findBarcodesByItemId(itemId);
    const existingInternal = barcodes.find(b => b.barcodeType === 'internal');
    if (existingInternal) {
      await this.itemRepository.deleteBarcode(existingInternal.id, itemId);
    }

    const barcode: SupplyBarcodeRow = {
      id: generateId('sbar'),
      itemId,
      barcodeValue: generateInternalBarcodeValue('supplyItem'),
      barcodeType: 'internal',
      isPrimary: true,
    };
    await this.itemRepository.saveBarcode(barcode);
    return SupplyDto.barcodeToResponse(barcode);
  }

  // Packaging levels

  async addPackagingLevel(
    labId: string,
    itemId: string,
    data: CreateSupplyPackagingLevelRequest,
    user: User
  ): Promise<SupplyPackagingLevelResponse> {
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
      id: generateId('spkg'),
      itemId,
      unitName: data.unitName,
      quantity: data.quantity,
      parentUnit: data.parentUnit ?? undefined,
    };
    await this.itemRepository.savePackagingLevel(level);
    return SupplyDto.packagingLevelToResponse(level);
  }

  async removePackagingLevel(
    labId: string,
    itemId: string,
    levelId: string,
    user: User
  ): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(itemId, labId);
    rejectSeededItemDeletion(user, item, 'packaging level');

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

  // Stock operations

  async recordTransaction(
    labId: string,
    data:
      | RecordSupplyTransactionRequest
      | (Omit<RecordSupplyTransactionRequest, 'type'> & { type: 'count_adjustment' }),
    user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<SupplyTransactionResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(data.itemId, labId);

    let effectiveQuantity = data.quantity;
    if (data.type === 'received' && data.receivingUnit) {
      const item = await this.itemRepository.findById(data.itemId, labId);
      if (item?.stockUnit) {
        const levels = await this.itemRepository.findPackagingLevelsByItemId(data.itemId);
        const multiplier = this.computeStockUnitMultiplier(
          levels,
          data.receivingUnit,
          item.stockUnit
        );
        effectiveQuantity = data.quantity * multiplier;
      }
    }

    const quantityChange =
      data.type === 'issued' || data.type === 'disposed'
        ? -Math.abs(effectiveQuantity)
        : data.type === 'received'
          ? Math.abs(effectiveQuantity)
          : effectiveQuantity;

    const txn = await this.itemRepository.recordTransaction({
      itemId: data.itemId,
      locationId: data.locationId,
      labId,
      type: data.type,
      quantityChange,
      performedBy: user.id,
      lotNumber: data.lotNumber,
      expirationDate: data.expirationDate,
      poNumber: data.poNumber,
      cost: data.cost,
      notes: data.notes,
    });

    if (data.type === 'received' && data.lotNumber) {
      const item = await this.itemRepository.findById(data.itemId, labId);
      if (item) {
        item.updateCurrentLotNumber(data.lotNumber);
        await this.itemRepository.save(item);
      }
    }

    const event = this.createStockEvent(
      data.type,
      data.itemId,
      quantityChange,
      data.locationId,
      user.id,
      labId
    );
    if (options?.bulkOperation) event.partOfBulkOperation = true;
    await this.eventBus.publish(event);

    return SupplyDto.transactionToResponse(txn);
  }

  async recordStockCount(
    labId: string,
    data: RecordSupplyStockCountRequest,
    user: User
  ): Promise<SupplyTransactionResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const stockEntries = await this.itemRepository.findStockByItemId(data.itemId);
    const currentStock = stockEntries.find(s => s.locationId === data.locationId)?.quantity ?? 0;
    const delta = data.actualCount - currentStock;

    return this.recordTransaction(
      labId,
      {
        itemId: data.itemId,
        locationId: data.locationId,
        type: 'count_adjustment',
        quantity: delta,
        lotNumber: data.lotNumber,
        expirationDate: data.expirationDate,
        notes: data.notes,
      },
      user
    );
  }

  async getTransactionHistory(
    labId: string,
    itemId: string,
    limit?: number
  ): Promise<SupplyTransactionResponse[]> {
    await this.getItemOrThrow(itemId, labId);
    const txns = await this.itemRepository.findTransactionsByItemId(itemId, limit);
    return txns.map(SupplyDto.transactionToResponse);
  }

  async voidTransaction(
    labId: string,
    transactionId: string,
    data: VoidSupplyTransactionRequest,
    user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<{ original: SupplyTransactionResponse; reversal: SupplyTransactionResponse }> {
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
    rejectSeededItemDeletion(user, existing, 'transaction');

    const { original, reversal } = await this.itemRepository.voidTransaction({
      transactionId,
      labId,
      voidedBy: user.id,
      voidReason: data.reason,
    });

    const event = new SupplyStockVoidedEvent(
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
      original: SupplyDto.transactionToResponse(original),
      reversal: SupplyDto.transactionToResponse(reversal),
    };
  }

  // Bulk operations

  async bulkReceive(
    labId: string,
    data: SupplyBulkReceiveRequest,
    user: User
  ): Promise<SupplyBulkResponse> {
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
            poNumber: item.poNumber,
            cost: item.cost,
            receivingUnit: item.receivingUnit,
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
      await this.eventBus.publish(new SupplyBulkReceivedEvent(perItemData, user.id, labId));
    }

    return result;
  }

  async bulkIssue(
    labId: string,
    data: SupplyBulkIssueRequest,
    user: User
  ): Promise<SupplyBulkResponse> {
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
      await this.eventBus.publish(new SupplyBulkIssuedEvent(perItemData, user.id, labId));
    }

    return result;
  }

  async bulkReassignCategory(
    labId: string,
    itemIds: string[],
    categoryId: string,
    user: User
  ): Promise<SupplyBulkResponse> {
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
        new SupplyBulkCategoryReassignedEvent(result.succeeded, categoryId, user.id, labId)
      );
    }

    return result;
  }

  async bulkArchive(labId: string, itemIds: string[], user: User): Promise<SupplyBulkResponse> {
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
      await this.eventBus.publish(new SupplyBulkArchivedEvent(result.succeeded, user.id, labId));
    }

    return result;
  }

  async bulkVoidTransactions(
    labId: string,
    data: SupplyBulkVoidRequest,
    user: User
  ): Promise<SupplyBulkResponse> {
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
        new SupplyBulkVoidedEvent(perItemData, user.id, data.reason, labId)
      );
    }

    return result;
  }

  // Helpers

  private async getItemOrThrow(id: string, labId: string): Promise<SupplyItem> {
    const item = await this.itemRepository.findById(id, labId);
    if (!item) throw new NotFoundError('This supply item could not be found.', { itemId: id });
    return item;
  }

  private async getCategoryOrThrow(id: string, labId: string): Promise<SupplyCategory> {
    const category = await this.categoryRepository.findById(id, labId);
    if (!category) throw new NotFoundError('This category could not be found.', { categoryId: id });
    return category;
  }

  /**
   * Auto-generates an internal barcode on item creation. Only a value collision is retried —
   * any other failure propagates rather than leaving the item silently unlabelled.
   */
  private async generateInternalBarcode(itemId: string): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const barcode: SupplyBarcodeRow = {
          id: generateId('sbar'),
          itemId,
          barcodeValue: generateInternalBarcodeValue('supplyItem'),
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

  private createStockEvent(
    type: StockEventType,
    itemId: string,
    quantity: number,
    locationId: string,
    userId: string,
    labId: string
  ) {
    switch (type) {
      case 'received':
        return new SupplyStockReceivedEvent(itemId, quantity, locationId, userId, labId);
      case 'issued':
        return new SupplyStockIssuedEvent(itemId, quantity, locationId, userId, labId);
      case 'count_adjustment':
        return new SupplyStockCountAdjustedEvent(itemId, quantity, locationId, userId, labId);
      case 'disposed':
        return new SupplyStockDisposedEvent(itemId, quantity, locationId, userId, labId);
    }
  }

  /** Walks the packaging chain from fromUnit down to toUnit, multiplying quantities at each step. */
  private computeStockUnitMultiplier(
    levels: Array<{ unitName: string; quantity: number; parentUnit: string | undefined }>,
    fromUnit: string,
    toUnit: string
  ): number {
    if (fromUnit === toUnit) return 1;

    let multiplier = 1;
    let currentUnit = fromUnit;
    const maxDepth = levels.length + 1;

    for (let i = 0; i < maxDepth; i++) {
      const level = levels.find(l => l.unitName === currentUnit);
      if (!level) {
        throw new ValidationError(`Unit "${currentUnit}" not found in the packaging chain`);
      }
      multiplier *= level.quantity;
      const nextUnit = level.parentUnit;
      if (!nextUnit) {
        throw new ValidationError(
          `No path from "${fromUnit}" to "${toUnit}" in the packaging chain`
        );
      }
      if (nextUnit === toUnit) return multiplier;
      currentUnit = nextUnit;
    }

    throw new ValidationError(`Circular or broken packaging chain detected`);
  }

  private trackItemChanges(item: SupplyItem, data: UpdateSupplyItemRequest): FieldChange[] {
    return trackFieldChanges(data, [
      { key: 'categoryId', getter: () => item.categoryId },
      { key: 'name', getter: () => item.name },
      { key: 'manufacturer', getter: () => item.manufacturer },
      { key: 'catalogNumber', getter: () => item.catalogNumber },
      { key: 'vendorName', getter: () => item.vendorName },
      { key: 'vendorCatalogNumber', getter: () => item.vendorCatalogNumber },
      { key: 'stockUnit', getter: () => item.stockUnit },
      { key: 'baseItemName', getter: () => item.baseItemName },
      { key: 'reorderThreshold', getter: () => item.reorderThreshold },
      { key: 'reorderQuantity', getter: () => item.reorderQuantity },
      { key: 'reorderUnit', getter: () => item.reorderUnit },
      { key: 'unitPrice', getter: () => item.unitPrice },
      { key: 'description', getter: () => item.description },
      { key: 'notes', getter: () => item.notes },
    ]);
  }
}
