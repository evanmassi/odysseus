/**
 * Equipment Item Repository Interface
 *
 * Unified data access contract for equipment items, documents, and maintenance logs.
 */

import type { DocumentPatch } from '@domain/entities/Document';
import type { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import type { EquipmentItem } from '@domain/entities/EquipmentItem';
import type { EquipmentMaintenanceLog } from '@domain/entities/EquipmentMaintenanceLog';
import type { AttributeValueRow } from '@domain/repositories/AttributeRepository';

export interface EquipmentItemRepository {
  // Items

  findById(id: string, labId: string): Promise<EquipmentItem | null>;
  findByLabId(labId: string): Promise<EquipmentItem[]>;
  save(item: EquipmentItem): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;
  /** Visitor-created only — the demo creation caps must not be consumed by seeded rows. */
  countNonSeededByLabId(labId: string): Promise<number>;
  /** Bulk delete for the demo reset. Returns the row count removed. */
  deleteAllForLab(labId: string): Promise<number>;

  // Documents

  findDocumentsByItemId(itemId: string): Promise<EquipmentDocument[]>;
  saveDocument(document: EquipmentDocument): Promise<void>;
  updateDocument(
    id: string,
    itemId: string,
    fields: DocumentPatch
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

  findAttributeValuesByItemId(itemId: string): Promise<AttributeValueRow[]>;
  findAttributeValuesByLabId(labId: string): Promise<AttributeValueRow[]>;
  replaceAttributeValues(
    itemId: string,
    definitionId: string,
    values: AttributeValueRow[]
  ): Promise<void>;
}
