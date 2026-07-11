/**
 * Equipment Item Repository Interface
 *
 * Unified data access contract for equipment items, documents, and maintenance logs.
 */

import type { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import type { EquipmentItem } from '@domain/entities/EquipmentItem';
import type { EquipmentMaintenanceLog } from '@domain/entities/EquipmentMaintenanceLog';

export interface EquipmentItemRepository {

  // Items

  findById(id: string, labId: string): Promise<EquipmentItem | null>;
  findByLabId(labId: string): Promise<EquipmentItem[]>;
  save(item: EquipmentItem): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  // Documents

  findDocumentsByItemId(itemId: string): Promise<EquipmentDocument[]>;
  saveDocument(document: EquipmentDocument): Promise<void>;
  updateDocument(id: string, itemId: string, fields: { label?: string; url?: string; notes?: string | null }): Promise<EquipmentDocument | null>;
  deleteDocument(id: string, itemId: string): Promise<boolean>;

  // Maintenance log

  findMaintenanceLogByItemId(itemId: string): Promise<EquipmentMaintenanceLog[]>;
  findMaintenanceEntryById(id: string): Promise<EquipmentMaintenanceLog | null>;
  saveMaintenanceEntry(entry: EquipmentMaintenanceLog): Promise<void>;
  updateMaintenanceEntry(entry: EquipmentMaintenanceLog): Promise<void>;
  deleteMaintenanceEntry(id: string): Promise<boolean>;

  // Lookup support — for maintenance type rename/delete cascading

  countMaintenanceEntriesUsingType(type: string, labId: string): Promise<number>;
  renameMaintenanceType(oldValue: string, newValue: string, labId: string): Promise<number>;
}
