/**
 * Equipment Data Transfer Objects
 *
 * Maps between equipment domain entities and HTTP response shapes.
 */

import type { EquipmentCategory } from '@domain/entities/EquipmentCategory';
import type { EquipmentItem } from '@domain/entities/EquipmentItem';
import type { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import type { EquipmentMaintenanceLog } from '@domain/entities/EquipmentMaintenanceLog';

export interface EquipmentCategoryResponse {
  id: string;
  labId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

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
  status: string;
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

export interface EquipmentDocumentResponse {
  id: string;
  itemId: string;
  label: string;
  url: string;
  notes?: string;
  createdAt: string;
}

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
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
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
      purchaseDate: item.purchaseDate?.toISOString(),
      warrantyExpiration: item.warrantyExpiration?.toISOString(),
      purchaseCost: item.purchaseCost,
      assetTag: item.assetTag,
      nextMaintenanceDate: item.nextMaintenanceDate?.toISOString(),
      decommissionDate: item.decommissionDate?.toISOString(),
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
      createdAt: document.createdAt.toISOString(),
    };
  }

  static maintenanceEntryToResponse(entry: EquipmentMaintenanceLog): EquipmentMaintenanceLogResponse {
    return {
      id: entry.id,
      itemId: entry.itemId,
      datePerformed: entry.datePerformed.toISOString(),
      maintenanceType: entry.maintenanceType,
      performedBy: entry.performedBy,
      technician: entry.technician,
      description: entry.description,
      nextScheduledDate: entry.nextScheduledDate?.toISOString(),
      cost: entry.cost,
      notes: entry.notes,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
