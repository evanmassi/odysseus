/**
 * Attribute Mapper
 *
 * Converts between attribute definition entities, option rows, and PostgreSQL rows.
 */

import { AttributeDefinition } from '@domain/entities/AttributeDefinition';
import type { AttributeOptionRow } from '@domain/repositories/AttributeRepository';
import { toISOString } from '@infrastructure/database/PostgresContext';

import type { AttributeCatalog, AttributeValueType } from '@odysseus/shared-schemas';

export interface AttributeDefinitionDbRow {
  id: string;
  lab_id: string;
  name: string;
  value_type: string;
  applies_to_catalog: string | null;
  applies_to_types: string[];
  sort_order: number;
  is_system: boolean;
  system_key: string | null;
  prompt_on_form: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AttributeOptionDbRow {
  id: string;
  definition_id: string;
  value: string;
  sort_order: number;
}

export class AttributeMapper {
  static definitionToRow(definition: AttributeDefinition): AttributeDefinitionDbRow {
    return {
      id: definition.id,
      lab_id: definition.labId,
      name: definition.name,
      value_type: definition.valueType,
      applies_to_catalog: definition.appliesToCatalog ?? null,
      applies_to_types: definition.appliesToTypes,
      sort_order: definition.sortOrder,
      is_system: definition.isSystem,
      system_key: definition.systemKey ?? null,
      prompt_on_form: definition.promptOnForm,
      created_at: definition.createdAt,
      updated_at: definition.updatedAt,
    };
  }

  static definitionFromRow(row: AttributeDefinitionDbRow): AttributeDefinition {
    return AttributeDefinition.fromData({
      id: row.id,
      labId: row.lab_id,
      name: row.name,
      valueType: row.value_type as AttributeValueType,
      appliesToCatalog: (row.applies_to_catalog as AttributeCatalog | null) ?? undefined,
      appliesToTypes: row.applies_to_types,
      sortOrder: row.sort_order,
      isSystem: row.is_system,
      systemKey: row.system_key ?? undefined,
      promptOnForm: row.prompt_on_form,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static definitionsFromRows(rows: AttributeDefinitionDbRow[]): AttributeDefinition[] {
    return rows.map(row => this.definitionFromRow(row));
  }

  static optionFromRow(row: AttributeOptionDbRow): AttributeOptionRow {
    return {
      id: row.id,
      definitionId: row.definition_id,
      value: row.value,
      sortOrder: row.sort_order,
    };
  }

  static optionsFromRows(rows: AttributeOptionDbRow[]): AttributeOptionRow[] {
    return rows.map(row => this.optionFromRow(row));
  }
}
