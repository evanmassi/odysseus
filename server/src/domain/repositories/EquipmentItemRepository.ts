/**
 * Equipment Item Repository Interface
 *
 * Unified data access contract for equipment items, documents, and maintenance logs.
 */

import type { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import type { EquipmentItem } from '@domain/entities/EquipmentItem';
import type { EquipmentMaintenanceLog } from '@domain/entities/EquipmentMaintenanceLog';

export interface EquipmentAttributeValueRow {
  id: string;
  itemId: string;
  definitionId: string;
  valueOptionId?: string;
  valueText?: string;
  valueNumber?: number;
}

export interface EquipmentItemRepository {
  // Items

  findById(id: string, labId: string): Promise<EquipmentItem | null>;
  findByLabId(labId: string): Promise<EquipmentItem[]>;
  save(item: EquipmentItem): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  // Documents

  findDocumentsByItemId(itemId: string): Promise<EquipmentDocument[]>;
  saveDocument(document: EquipmentDocument): Promise<void>;
  updateDocument(
    id: string,
    itemId: string,
    fields: { label?: string; url?: string; notes?: string | null }
  ): Promise<EquipmentDocument | null>;
  deleteDocument(id: string, itemId: string): Promise<boolean>;

  // Maintenance log

  findMaintenanceLogByItemId(itemId: string): Promise<EquipmentMaintenanceLog[]>;
  findMaintenanceEntryById(id: string): Promise<EquipmentMaintenanceLog | null>;
  saveMaintenanceEntry(entry: EquipmentMaintenanceLog): Promise<void>;
  updateMaintenanceEntry(entry: EquipmentMaintenanceLog): Promise<void>;
  deleteMaintenanceEntry(id: string): Promise<boolean>;

  // Lookup support — for maintenance type, vendor and manufacturer rename/delete cascading

  countMaintenanceEntriesUsingType(type: string, labId: string): Promise<number>;
  renameMaintenanceType(oldValue: string, newValue: string, labId: string): Promise<number>;
  countItemsUsingVendor(value: string, labId: string): Promise<number>;
  renameVendor(oldValue: string, newValue: string, labId: string): Promise<number>;
  countItemsUsingManufacturer(value: string, labId: string): Promise<number>;
  renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number>;

  // Attribute values

  findAttributeValuesByItemId(itemId: string): Promise<EquipmentAttributeValueRow[]>;
  findAttributeValuesByLabId(labId: string): Promise<EquipmentAttributeValueRow[]>;
  replaceAttributeValues(
    itemId: string,
    definitionId: string,
    values: EquipmentAttributeValueRow[]
  ): Promise<void>;
}
