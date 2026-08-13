/**
 * Equipment Management Service
 *
 * Orchestrates CRUD for equipment categories, items, documents, and maintenance logs
 * with admin-only write access control.
 */

import type { EventBus } from '@application/contracts/EventBus';
import { AttributeDto } from '@application/dto/AttributeDto';
import { EquipmentDto } from '@application/dto/EquipmentDto';
import type {
  EquipmentCategoryResponse,
  EquipmentItemResponse,
  EquipmentItemWithAttributesResponse,
  EquipmentItemDetailResponse,
  EquipmentDocumentResponse,
  EquipmentMaintenanceLogResponse,
} from '@application/dto/EquipmentDto';
import { rejectIfTaxonomyLocked, rejectSeededItemDeletion } from '@application/guards/DemoGuards';
import { validateHierarchyDepth } from '@application/guards/HierarchyGuards';
import { EquipmentCategory } from '@domain/entities/EquipmentCategory';
import { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import { EquipmentItem } from '@domain/entities/EquipmentItem';
import { EquipmentMaintenanceLog } from '@domain/entities/EquipmentMaintenanceLog';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  EquipmentItemCreatedEvent,
  EquipmentItemUpdatedEvent,
  EquipmentItemDecommissionedEvent,
  EquipmentItemDeletedEvent,
  EquipmentCategoryCreatedEvent,
  EquipmentCategoryUpdatedEvent,
  EquipmentCategoryDeletedEvent,
  EquipmentDocumentAddedEvent,
  EquipmentDocumentRemovedEvent,
  EquipmentMaintenanceLoggedEvent,
  EquipmentMaintenanceUpdatedEvent,
  EquipmentMaintenanceDeletedEvent,
  EquipmentBulkMaintenanceLoggedEvent,
  EquipmentBulkStatusChangedEvent,
  EquipmentBulkRelocatedEvent,
} from '@domain/events/EquipmentEvents';
import type {
  AttributeRepository,
  AttributeValueRow,
} from '@domain/repositories/AttributeRepository';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';
import type { EquipmentItemRepository } from '@domain/repositories/EquipmentItemRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { FieldChange } from '@domain/types/fieldChangeTypes';
import { generateId } from '@domain/utils/generateId';

import { executeBulk } from './executeBulk';
import { trackFieldChanges } from './trackFieldChanges';

import type {
  CreateEquipmentCategoryRequest,
  UpdateEquipmentCategoryRequest,
  CreateEquipmentItemRequest,
  UpdateEquipmentItemRequest,
  DecommissionEquipmentItemRequest,
  CreateEquipmentDocumentRequest,
  UpdateEquipmentDocumentRequest,
  CreateEquipmentMaintenanceLogRequest,
  UpdateEquipmentMaintenanceLogRequest,
  EquipmentBulkStatusRequest,
  EquipmentBulkRelocateRequest,
  EquipmentBulkResponse,
  AttributeValue,
  SetAttributeValueRequest,
} from '@odysseus/shared-schemas';

export class EquipmentApplicationService {
  constructor(
    private categoryRepository: CategoryRepository<EquipmentCategory>,
    private itemRepository: EquipmentItemRepository,
    private attributeRepository: AttributeRepository,
    private accessControlService: AccessControlService,
    private eventBus: EventBus,
    private storageRepository: StorageRepository
  ) {}

  // Categories

  async listCategories(labId: string): Promise<EquipmentCategoryResponse[]> {
    const categories = await this.categoryRepository.findByLabId(labId);
    return categories.map(EquipmentDto.categoryToResponse);
  }

  async createCategory(
    labId: string,
    data: CreateEquipmentCategoryRequest,
    user: User
  ): Promise<EquipmentCategoryResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await rejectIfTaxonomyLocked(user, this.storageRepository, labId, 'Categories');

    await validateHierarchyDepth(this.categoryRepository, { labId, parentId: data.parentId });

    const category = EquipmentCategory.create({
      labId,
      name: data.name,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    });

    await this.categoryRepository.save(category);

    await this.eventBus.publish(
      new EquipmentCategoryCreatedEvent(category.id, category.name, data.parentId, user.id, labId)
    );

    return EquipmentDto.categoryToResponse(category);
  }

  async updateCategory(
    labId: string,
    id: string,
    data: UpdateEquipmentCategoryRequest,
    user: User
  ): Promise<EquipmentCategoryResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await rejectIfTaxonomyLocked(user, this.storageRepository, labId, 'Categories');

    const category = await this.categoryRepository.findById(id, labId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Only a change of parent can violate the depth rule.
    if (data.parentId !== undefined && data.parentId !== category.parentId) {
      await validateHierarchyDepth(this.categoryRepository, {
        labId,
        parentId: data.parentId,
        movingNodeId: id,
      });
    }

    category.update({
      name: data.name,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    });

    await this.categoryRepository.save(category);

    await this.eventBus.publish(
      new EquipmentCategoryUpdatedEvent(category.id, category.name, user.id, labId)
    );

    return EquipmentDto.categoryToResponse(category);
  }

  async deleteCategory(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await rejectIfTaxonomyLocked(user, this.storageRepository, labId, 'Categories');

    const category = await this.categoryRepository.findById(id, labId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const hasItems = await this.categoryRepository.hasItemsIncludingChildren(id, labId);
    if (hasItems) {
      throw new ValidationError(
        'Cannot delete category — equipment items are still assigned to it or its subcategories'
      );
    }

    // Delete empty subcategories first (RESTRICT FK requires children deleted before parent)
    const hasChildren = await this.categoryRepository.hasChildren(id, labId);
    if (hasChildren) {
      const allCategories = await this.categoryRepository.findByLabId(labId);
      const childIds = allCategories.filter(c => c.parentId === id).map(c => c.id);
      for (const childId of childIds) {
        await this.categoryRepository.delete(childId, labId);
      }
    }

    await this.categoryRepository.delete(id, labId);

    await this.eventBus.publish(
      new EquipmentCategoryDeletedEvent(id, category.name, user.id, labId)
    );
  }

  // Items

  async listItems(labId: string): Promise<EquipmentItemWithAttributesResponse[]> {
    const items = await this.itemRepository.findByLabId(labId);
    // One query for the lab's values, grouped in memory — per-item fetches would be an N+1.
    const values = await this.itemRepository.findAttributeValuesByLabId(labId);
    const byItem = new Map<string, AttributeValueRow[]>();
    for (const value of values) {
      const bucket = byItem.get(value.itemId) ?? [];
      bucket.push(value);
      byItem.set(value.itemId, bucket);
    }

    return items.map(item =>
      EquipmentDto.itemWithAttributesToResponse(
        item,
        (byItem.get(item.id) ?? []).map(AttributeDto.summaryToResponse)
      )
    );
  }

  async getItem(labId: string, id: string): Promise<EquipmentItemDetailResponse> {
    const item = await this.getItemOrThrow(id, labId);
    const [documents, maintenanceLog, attributeValues] = await Promise.all([
      this.itemRepository.findDocumentsByItemId(id),
      this.itemRepository.findMaintenanceLogByItemId(id),
      this.itemRepository.findAttributeValuesByItemId(id),
    ]);
    return EquipmentDto.itemDetailToResponse(
      item,
      documents,
      maintenanceLog,
      attributeValues.map(AttributeDto.valueToResponse)
    );
  }

  async createItem(
    labId: string,
    data: CreateEquipmentItemRequest,
    user: User
  ): Promise<EquipmentItemResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const category = await this.categoryRepository.findById(data.categoryId, labId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const item = EquipmentItem.create({
      labId,
      categoryId: data.categoryId,
      name: data.name,
      serialNumber: data.serialNumber,
      manufacturer: data.manufacturer,
      model: data.model,
      description: data.description,
      locationId: data.locationId ?? undefined,
      status: data.status,
      conditionNotes: data.conditionNotes,
      purchaseDate: data.purchaseDate,
      warrantyExpiration: data.warrantyExpiration,
      purchaseCost: data.purchaseCost,
      assetTag: data.assetTag,
      nextMaintenanceDate: data.nextMaintenanceDate,
      notes: data.notes,
    });

    await this.itemRepository.save(item);

    await this.eventBus.publish(
      new EquipmentItemCreatedEvent(item.id, item.name, item.categoryId, user.id, labId)
    );

    return EquipmentDto.itemToResponse(item);
  }

  async updateItem(
    labId: string,
    id: string,
    data: UpdateEquipmentItemRequest,
    user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<EquipmentItemResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const item = await this.getItemOrThrow(id, labId);

    if (data.categoryId && data.categoryId !== item.categoryId) {
      const category = await this.categoryRepository.findById(data.categoryId, labId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }
    }

    const changes = this.trackItemChanges(item, data);

    item.update({
      categoryId: data.categoryId,
      name: data.name,
      serialNumber: data.serialNumber,
      manufacturer: data.manufacturer,
      model: data.model,
      description: data.description,
      locationId: data.locationId,
      status: data.status,
      conditionNotes: data.conditionNotes,
      purchaseDate: data.purchaseDate,
      warrantyExpiration: data.warrantyExpiration,
      purchaseCost: data.purchaseCost,
      assetTag: data.assetTag,
      nextMaintenanceDate: data.nextMaintenanceDate,
      notes: data.notes,
    });

    await this.itemRepository.save(item);

    if (changes.length > 0) {
      const event = new EquipmentItemUpdatedEvent(item.id, changes, user.id, labId);
      if (options?.bulkOperation) event.partOfBulkOperation = true;
      await this.eventBus.publish(event);
    }

    return EquipmentDto.itemToResponse(item);
  }

  async decommissionItem(
    labId: string,
    id: string,
    data: DecommissionEquipmentItemRequest,
    user: User
  ): Promise<EquipmentItemResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const item = await this.getItemOrThrow(id, labId);

    if (item.status === 'decommissioned') {
      throw new ValidationError('Equipment is already decommissioned');
    }

    item.decommission(data.decommissionDate, data.decommissionReason, data.disposalMethod);

    await this.itemRepository.save(item);

    await this.eventBus.publish(
      new EquipmentItemDecommissionedEvent(item.id, data.decommissionReason, user.id, labId)
    );

    return EquipmentDto.itemToResponse(item);
  }

  async deleteItem(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);

    const item = await this.getItemOrThrow(id, labId);
    rejectSeededItemDeletion(user, item, 'equipment item');
    await this.itemRepository.delete(id, labId);

    await this.eventBus.publish(new EquipmentItemDeletedEvent(item.id, item.name, user.id, labId));
  }

  // Documents

  async addDocument(
    labId: string,
    itemId: string,
    data: CreateEquipmentDocumentRequest,
    user: User
  ): Promise<EquipmentDocumentResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);

    const document = EquipmentDocument.create({
      itemId,
      label: data.label,
      url: data.url,
      notes: data.notes,
      docType: data.docType,
    });

    await this.itemRepository.saveDocument(document);

    await this.eventBus.publish(
      new EquipmentDocumentAddedEvent(itemId, data.label, user.id, labId)
    );

    return EquipmentDto.documentToResponse(document);
  }

  async updateDocument(
    labId: string,
    itemId: string,
    docId: string,
    data: UpdateEquipmentDocumentRequest,
    user: User
  ): Promise<EquipmentDocumentResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getItemOrThrow(itemId, labId);
    const updated = await this.itemRepository.updateDocument(docId, itemId, {
      label: data.label,
      url: data.url,
      notes: data.notes,
      docType: data.docType,
    });
    if (!updated)
      throw new NotFoundError('This document could not be found. It may have been deleted.');
    return EquipmentDto.documentToResponse(updated);
  }

  async removeDocument(labId: string, itemId: string, docId: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(itemId, labId);
    rejectSeededItemDeletion(user, item, 'document');
    const deleted = await this.itemRepository.deleteDocument(docId, itemId);
    if (!deleted) {
      throw new NotFoundError('Document not found');
    }

    await this.eventBus.publish(new EquipmentDocumentRemovedEvent(itemId, user.id, labId));
  }

  // Maintenance log

  async addMaintenanceEntry(
    labId: string,
    itemId: string,
    data: CreateEquipmentMaintenanceLogRequest,
    user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<EquipmentMaintenanceLogResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(itemId, labId);

    const entry = EquipmentMaintenanceLog.create({
      itemId,
      datePerformed: data.datePerformed,
      maintenanceType: data.maintenanceType,
      performedBy: data.performedBy,
      technician: data.technician,
      description: data.description,
      nextScheduledDate: data.nextScheduledDate,
      cost: data.cost,
      notes: data.notes,
    });

    await this.itemRepository.saveMaintenanceEntry(entry);

    if (data.nextScheduledDate) {
      item.updateNextMaintenanceDate(data.nextScheduledDate);
      await this.itemRepository.save(item);
    }

    const event = new EquipmentMaintenanceLoggedEvent(
      itemId,
      data.maintenanceType,
      data.datePerformed,
      user.id,
      labId
    );
    if (options?.bulkOperation) event.partOfBulkOperation = true;
    await this.eventBus.publish(event);

    return EquipmentDto.maintenanceEntryToResponse(entry);
  }

  async updateMaintenanceEntry(
    labId: string,
    itemId: string,
    entryId: string,
    data: UpdateEquipmentMaintenanceLogRequest,
    user: User
  ): Promise<EquipmentMaintenanceLogResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(itemId, labId);

    const entry = await this.itemRepository.findMaintenanceEntryById(entryId);
    if (!entry || entry.itemId !== itemId) {
      throw new NotFoundError('Maintenance log entry not found');
    }

    entry.update({
      datePerformed: data.datePerformed,
      maintenanceType: data.maintenanceType,
      performedBy: data.performedBy,
      technician: data.technician,
      description: data.description,
      nextScheduledDate: data.nextScheduledDate,
      cost: data.cost,
      notes: data.notes,
    });

    await this.itemRepository.updateMaintenanceEntry(entry);

    if (data.nextScheduledDate !== undefined) {
      const nextDate = data.nextScheduledDate ?? undefined;
      item.updateNextMaintenanceDate(nextDate);
      await this.itemRepository.save(item);
    }

    await this.eventBus.publish(
      new EquipmentMaintenanceUpdatedEvent(itemId, entry.maintenanceType, user.id, labId)
    );

    return EquipmentDto.maintenanceEntryToResponse(entry);
  }

  async deleteMaintenanceEntry(
    labId: string,
    itemId: string,
    entryId: string,
    user: User
  ): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const item = await this.getItemOrThrow(itemId, labId);
    rejectSeededItemDeletion(user, item, 'maintenance entry');

    const entry = await this.itemRepository.findMaintenanceEntryById(entryId);
    if (!entry || entry.itemId !== itemId) {
      throw new NotFoundError('Maintenance log entry not found');
    }

    await this.itemRepository.deleteMaintenanceEntry(entryId);

    // Recalculate next maintenance date from remaining entries
    if (entry.nextScheduledDate) {
      const remainingEntries = await this.itemRepository.findMaintenanceLogByItemId(itemId);
      const latestNextDate = remainingEntries
        .filter(e => e.nextScheduledDate)
        .sort((a, b) => b.datePerformed.localeCompare(a.datePerformed))[0]?.nextScheduledDate;

      item.updateNextMaintenanceDate(latestNextDate);
      await this.itemRepository.save(item);
    }

    await this.eventBus.publish(
      new EquipmentMaintenanceDeletedEvent(itemId, entry.maintenanceType, user.id, labId)
    );
  }

  // Bulk operations

  async bulkLogMaintenance(
    labId: string,
    itemIds: string[],
    data: CreateEquipmentMaintenanceLogRequest,
    user: User
  ): Promise<EquipmentBulkResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const result = await executeBulk(
      itemIds,
      async itemId => {
        await this.addMaintenanceEntry(labId, itemId, data, user, { bulkOperation: true });
        return itemId;
      },
      (itemId, _index, error) => ({ id: itemId, error })
    );

    if (result.succeeded.length > 0) {
      await this.eventBus.publish(
        new EquipmentBulkMaintenanceLoggedEvent(
          result.succeeded,
          data.maintenanceType,
          data.datePerformed,
          user.id,
          labId
        )
      );
    }

    return result;
  }

  async bulkChangeStatus(
    labId: string,
    itemIds: string[],
    data: EquipmentBulkStatusRequest['data'],
    user: User
  ): Promise<EquipmentBulkResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const result = await executeBulk(
      itemIds,
      async itemId => {
        await this.updateItem(
          labId,
          itemId,
          { status: data.status, conditionNotes: data.conditionNotes },
          user,
          { bulkOperation: true }
        );
        return itemId;
      },
      (itemId, _index, error) => ({ id: itemId, error })
    );

    if (result.succeeded.length > 0) {
      await this.eventBus.publish(
        new EquipmentBulkStatusChangedEvent(result.succeeded, data.status, user.id, labId)
      );
    }

    return result;
  }

  async bulkRelocate(
    labId: string,
    itemIds: string[],
    data: EquipmentBulkRelocateRequest['data'],
    user: User
  ): Promise<EquipmentBulkResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const category = await this.categoryRepository.findById(data.categoryId, labId);
    if (!category) {
      throw new NotFoundError('Target category not found');
    }

    const result = await executeBulk(
      itemIds,
      async itemId => {
        await this.updateItem(labId, itemId, { categoryId: data.categoryId }, user, {
          bulkOperation: true,
        });
        return itemId;
      },
      (itemId, _index, error) => ({ id: itemId, error })
    );

    if (result.succeeded.length > 0) {
      await this.eventBus.publish(
        new EquipmentBulkRelocatedEvent(result.succeeded, data.categoryId, user.id, labId)
      );
    }

    return result;
  }

  // Helpers

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
          id: generateId('eatv'),
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
        id: generateId('eatv'),
        itemId,
        definitionId,
        valueText: data.valueText,
        valueNumber: data.valueNumber,
      },
    ];
  }

  private async getItemOrThrow(id: string, labId: string): Promise<EquipmentItem> {
    const item = await this.itemRepository.findById(id, labId);
    if (!item) {
      throw new NotFoundError('This equipment item could not be found.', { itemId: id });
    }
    return item;
  }

  private trackItemChanges(item: EquipmentItem, data: UpdateEquipmentItemRequest): FieldChange[] {
    return trackFieldChanges(data, [
      { key: 'categoryId', getter: () => item.categoryId },
      { key: 'name', getter: () => item.name },
      { key: 'serialNumber', getter: () => item.serialNumber },
      { key: 'manufacturer', getter: () => item.manufacturer },
      { key: 'vendorName', getter: () => item.vendorName },
      { key: 'vendorCatalogNumber', getter: () => item.vendorCatalogNumber },
      { key: 'model', getter: () => item.model },
      { key: 'description', getter: () => item.description },
      { key: 'locationId', getter: () => item.locationId },
      { key: 'status', getter: () => item.status },
      { key: 'conditionNotes', getter: () => item.conditionNotes },
      { key: 'purchaseDate', getter: () => item.purchaseDate },
      { key: 'warrantyExpiration', getter: () => item.warrantyExpiration },
      { key: 'purchaseCost', getter: () => item.purchaseCost },
      { key: 'assetTag', getter: () => item.assetTag },
      { key: 'nextMaintenanceDate', getter: () => item.nextMaintenanceDate },
      { key: 'notes', getter: () => item.notes },
    ]);
  }
}
