/**
 * Attribute Repository Interface
 *
 * Data access contract for lab-wide attribute definitions and their option vocabularies.
 */

import type { AttributeDefinition } from '@domain/entities/AttributeDefinition';

export interface AttributeOptionRow {
  id: string;
  definitionId: string;
  value: string;
  sortOrder: number;
}

export interface AttributeRepository {
  findDefinitionById(id: string, labId: string): Promise<AttributeDefinition | null>;
  findDefinitionsByLabId(labId: string): Promise<AttributeDefinition[]>;
  findDefinitionByName(name: string, labId: string): Promise<AttributeDefinition | null>;
  saveDefinition(definition: AttributeDefinition): Promise<void>;
  deleteDefinition(id: string, labId: string): Promise<boolean>;

  findOptionsByLabId(labId: string): Promise<AttributeOptionRow[]>;
  findOptionById(id: string, labId: string): Promise<AttributeOptionRow | null>;
  saveOption(option: AttributeOptionRow): Promise<void>;
  deleteOption(id: string, labId: string): Promise<boolean>;

  countItemsUsingDefinition(definitionId: string): Promise<number>;
  countItemsUsingOption(optionId: string): Promise<number>;
}
