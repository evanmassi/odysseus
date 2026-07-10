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
  EquipmentStatus,
  EquipmentCategory as EquipmentCategoryData,
  EquipmentDocument as EquipmentDocumentData,
} from '@odysseus/shared-schemas';

export type EquipmentCategoryResponse = EquipmentCategoryData;

export interface EquipmentItemResponse {
  id: string;
  labId: string;
  categoryId: string;
  name: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  description?: string;
  location?: string;
  status: EquipmentStatus;
  conditionNotes?: string;
  purchaseDate?: string;
  warrantyExpiration?: string;
  purchaseCost?: number;
  assetTag?: string;
  nextMaintenanceDate?: string;
  decommissionDate?: string;
  decommissionReason?: string;
  disposalMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentItemDetailResponse {
  item: EquipmentItemResponse;
  documents: EquipmentDocumentResponse[];
  maintenanceLog: EquipmentMaintenanceLogResponse[];
}

export type EquipmentDocumentResponse = EquipmentDocumentData;

export interface EquipmentMaintenanceLogResponse {
  id: string;
  itemId: string;
  datePerformed: string;
  maintenanceType: string;
  performedBy?: string;
  technician?: string;
  description?: string;
  nextScheduledDate?: string;
  cost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

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
      model: item.model,
      description: item.description,
      location: item.location,
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
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  static itemDetailToResponse(
    item: EquipmentItem,
    documents: EquipmentDocument[],
    maintenanceLog: EquipmentMaintenanceLog[]
  ): EquipmentItemDetailResponse {
    return {
      item: this.itemToResponse(item),
      documents: documents.map(d => this.documentToResponse(d)),
      maintenanceLog: maintenanceLog.map(e => this.maintenanceEntryToResponse(e)),
    };
  }

  static documentToResponse(document: EquipmentDocument): EquipmentDocumentResponse {
    return {
      id: document.id,
      itemId: document.itemId,
      label: document.label,
      url: document.url,
      notes: document.notes,
      createdAt: document.createdAt,
    };
  }

  static maintenanceEntryToResponse(entry: EquipmentMaintenanceLog): EquipmentMaintenanceLogResponse {
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
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
