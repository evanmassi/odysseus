/**
 * Equipment Data Transfer Objects
 *
 * Maps between equipment domain entities and HTTP response shapes.
 */

import type { EquipmentCategory } from '@domain/entities/EquipmentCategory';
import type { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import type { EquipmentItem } from '@domain/entities/EquipmentItem';
import type { EquipmentMaintenanceLog } from '@domain/entities/EquipmentMaintenanceLog';

import type {
  EquipmentCategory as EquipmentCategoryData,
  EquipmentDocument as EquipmentDocumentData,
  EquipmentItem as EquipmentItemData,
  EquipmentMaintenanceLog as EquipmentMaintenanceLogData,
  EquipmentItemDetail as EquipmentItemDetailData,
  EquipmentItemWithAttributes,
  AttributeSummary,
  AttributeValue,
} from '@odysseus/shared-schemas';

export type EquipmentCategoryResponse = EquipmentCategoryData;

export type EquipmentItemResponse = EquipmentItemData;
export type EquipmentItemWithAttributesResponse = EquipmentItemWithAttributes;

export type EquipmentDocumentResponse = EquipmentDocumentData;

export type EquipmentMaintenanceLogResponse = EquipmentMaintenanceLogData;

export type EquipmentItemDetailResponse = EquipmentItemDetailData;

export class EquipmentDto {
  static categoryToResponse(category: EquipmentCategory): EquipmentCategoryResponse {
    return {
      id: category.id,
      labId: category.labId,
      name: category.name,
      parentId: category.parentId ?? null,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  static itemToResponse(item: EquipmentItem): EquipmentItemResponse {
    return {
      id: item.id,
      labId: item.labId,
      categoryId: item.categoryId,
      name: item.name,
      serialNumber: item.serialNumber,
      manufacturer: item.manufacturer,
      vendorName: item.vendorName,
      vendorCatalogNumber: item.vendorCatalogNumber,
      model: item.model,
      description: item.description,
      locationId: item.locationId,
      status: item.status,
      conditionNotes: item.conditionNotes,
      purchaseDate: item.purchaseDate,
      warrantyExpiration: item.warrantyExpiration,
      purchaseCost: item.purchaseCost,
      assetTag: item.assetTag,
      nextMaintenanceDate: item.nextMaintenanceDate,
      decommissionDate: item.decommissionDate,
      decommissionReason: item.decommissionReason,
      disposalMethod: item.disposalMethod,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  static itemWithAttributesToResponse(
    item: EquipmentItem,
    attributeValues: AttributeSummary[]
  ): EquipmentItemWithAttributesResponse {
    return { ...this.itemToResponse(item), attributeValues };
  }

  static itemDetailToResponse(
    item: EquipmentItem,
    documents: EquipmentDocument[],
    maintenanceLog: EquipmentMaintenanceLog[],
    attributeValues: AttributeValue[]
  ): EquipmentItemDetailResponse {
    return {
      item: this.itemToResponse(item),
      documents: documents.map(d => this.documentToResponse(d)),
      maintenanceLog: maintenanceLog.map(e => this.maintenanceEntryToResponse(e)),
      attributeValues,
    };
  }

  static documentToResponse(document: EquipmentDocument): EquipmentDocumentResponse {
    return {
      id: document.id,
      itemId: document.itemId,
      label: document.label,
      url: document.url,
      notes: document.notes,
      docType: document.docType,
      createdAt: document.createdAt,
    };
  }

  static maintenanceEntryToResponse(
    entry: EquipmentMaintenanceLog
  ): EquipmentMaintenanceLogResponse {
    return {
      id: entry.id,
      itemId: entry.itemId,
      datePerformed: entry.datePerformed,
      maintenanceType: entry.maintenanceType,
      performedBy: entry.performedBy,
      technician: entry.technician,
      description: entry.description,
      nextScheduledDate: entry.nextScheduledDate,
      cost: entry.cost,
      notes: entry.notes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
