/**
 * Custom Unit Repository Interface
 *
 * Data access contract for the lab's supplement to the fixed unit registry.
 */

import type { UnitKindValue } from '@odysseus/shared-schemas';

export interface CustomUnitRow {
  id: string;
  labId: string;
  label: string;
  kind: UnitKindValue;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomUnitUsageRow extends CustomUnitRow {
  usageCount: number;
}

export interface CustomUnitRepository {
  findByLabId(labId: string): Promise<CustomUnitUsageRow[]>;
  findById(id: string, labId: string): Promise<CustomUnitRow | null>;
  findByLabel(label: string, labId: string): Promise<CustomUnitRow | null>;
  create(unit: CustomUnitRow): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  countUsage(label: string, labId: string): Promise<number>;

  /** Rewrites the label across every column that stores a unit, in one transaction. */
  rename(unit: CustomUnitRow, label: string): Promise<CustomUnitRow>;
  changeKind(unit: CustomUnitRow, kind: UnitKindValue): Promise<CustomUnitRow>;
}
