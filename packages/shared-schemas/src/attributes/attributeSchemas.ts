/**
 * Item Attribute Schemas
 *
 * Lab-defined metadata attributes and their curated option vocabularies, scoped to a catalog and —
 * for reagents — optionally to a reagent type. Each catalog stores its own values.
 */

import { z } from 'zod';

import { dateField } from '../utils/dateFields';
import { optionalText, patchText } from '../utils/stringFields';

export const attributeValueTypeValues = ['select', 'multi_select', 'text', 'number'] as const;
export const attributeValueTypeSchema = z.enum(attributeValueTypeValues);

export const attributeCatalogValues = ['reagent', 'supply', 'equipment'] as const;
export const attributeCatalogSchema = z.enum(attributeCatalogValues);

export const attributeDefinitionSchema = z.object({
  id: z.string(),
  labId: z.string(),
  name: z.string(),
  valueType: attributeValueTypeSchema,
  appliesToCatalog: attributeCatalogSchema.nullable(),
  appliesToType: z.string().nullable(),
  sortOrder: z.number().int(),
  isSystem: z.boolean(),
  systemKey: z.string().nullable(),
  promptOnForm: z.boolean(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createAttributeDefinitionRequestSchema = z.object({
  name: z.string().min(1, 'Attribute name is required').max(200),
  valueType: attributeValueTypeSchema,
  appliesToCatalog: attributeCatalogSchema.optional(),
  appliesToType: optionalText(200),
  sortOrder: z.number().int().optional(),
  promptOnForm: z.boolean().optional(),
});

export const updateAttributeDefinitionRequestSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  appliesToCatalog: attributeCatalogSchema.nullish(),
  appliesToType: patchText(200),
  sortOrder: z.number().int().nullish(),
  promptOnForm: z.boolean().nullish(),
});

export const attributeOptionSchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  value: z.string(),
  sortOrder: z.number().int(),
});

export const createAttributeOptionRequestSchema = z.object({
  value: z.string().min(1, 'Option value is required').max(200),
  sortOrder: z.number().int().optional(),
});

export const updateAttributeOptionRequestSchema = z.object({
  value: z.string().min(1).max(200).nullish(),
  sortOrder: z.number().int().nullish(),
});

export const attributeDefinitionResponseSchema = z.object({
  definition: attributeDefinitionSchema,
});

export const attributeDefinitionListResponseSchema = z.object({
  definitions: z.array(attributeDefinitionSchema),
  options: z.array(attributeOptionSchema),
});

export const attributeOptionResponseSchema = z.object({
  option: attributeOptionSchema,
});

export type AttributeValueType = z.infer<typeof attributeValueTypeSchema>;
export type AttributeCatalog = z.infer<typeof attributeCatalogSchema>;
export type AttributeDefinition = z.infer<typeof attributeDefinitionSchema>;
export type AttributeOption = z.infer<typeof attributeOptionSchema>;
export type CreateAttributeDefinitionRequest = z.infer<
  typeof createAttributeDefinitionRequestSchema
>;
export type UpdateAttributeDefinitionRequest = z.infer<
  typeof updateAttributeDefinitionRequestSchema
>;
export type CreateAttributeOptionRequest = z.infer<typeof createAttributeOptionRequestSchema>;
export type UpdateAttributeOptionRequest = z.infer<typeof updateAttributeOptionRequestSchema>;
