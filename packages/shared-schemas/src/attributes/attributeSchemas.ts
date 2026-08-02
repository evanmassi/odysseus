/**
 * Item Attribute Schemas
 *
 * Lab-defined metadata attributes and their curated option vocabularies, scoped to a catalog and —
 * for reagents — to any number of reagent types. An empty scope means every type. Each catalog
 * stores its own values.
 */

import { z } from 'zod';

import { dateField } from '../utils/dateFields';
import { optionalText } from '../utils/stringFields';

const attributeValueTypeValues = ['select', 'multi_select', 'text', 'number'] as const;
export const attributeValueTypeSchema = z.enum(attributeValueTypeValues);

const attributeCatalogValues = ['reagent', 'supply', 'equipment'] as const;
export const attributeCatalogSchema = z.enum(attributeCatalogValues);

export const attributeDefinitionSchema = z.object({
  id: z.string(),
  labId: z.string(),
  name: z.string(),
  valueType: attributeValueTypeSchema,
  appliesToCatalog: attributeCatalogSchema.nullable(),
  appliesToTypes: z.array(z.string()),
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
  appliesToTypes: z.array(z.string().min(1).max(200)).optional(),
  sortOrder: z.number().int().optional(),
  promptOnForm: z.boolean().optional(),
});

export const updateAttributeDefinitionRequestSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  appliesToCatalog: attributeCatalogSchema.nullish(),
  appliesToTypes: z.array(z.string().min(1).max(200)).nullish(),
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

// Per-item values. A multi-select attribute stores one row per chosen option; each catalog
// keeps its own rows against its own items, all keyed to the same lab-wide definitions.

export const attributeValueSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  definitionId: z.string(),
  valueOptionId: z.string().nullable(),
  valueText: z.string().nullable(),
  valueNumber: z.number().nullable(),
});

// Compact form carried on list rows, where the identity columns buy nothing and facet
// filtering only reads the value.
export const attributeSummarySchema = attributeValueSchema.omit({ id: true, itemId: true });

export const setAttributeValueRequestSchema = z.object({
  definitionId: z.string().min(1, 'Attribute is required'),
  valueOptionIds: z.array(z.string().min(1)).optional(),
  valueText: optionalText(2000),
  valueNumber: z.number().optional(),
});

// The write replaces a definition's values wholesale, so the response is that definition's
// rows after the fact — the caller sends one request per attribute it changed.
export const attributeValueListResponseSchema = z.object({
  attributeValues: z.array(attributeValueSchema),
});

// Item counts ride the list only: they gate the delete buttons, and a single write's
// response has no count to report that its caller doesn't already know.
export const attributeDefinitionWithUsageSchema = attributeDefinitionSchema.extend({
  usageCount: z.number().int().min(0),
});

export const attributeOptionWithUsageSchema = attributeOptionSchema.extend({
  usageCount: z.number().int().min(0),
});

export const attributeDefinitionResponseSchema = z.object({
  definition: attributeDefinitionSchema,
});

export const attributeDefinitionListResponseSchema = z.object({
  definitions: z.array(attributeDefinitionWithUsageSchema),
  options: z.array(attributeOptionWithUsageSchema),
});

export const attributeOptionResponseSchema = z.object({
  option: attributeOptionSchema,
});

export type AttributeValueType = z.infer<typeof attributeValueTypeSchema>;
export type AttributeCatalog = z.infer<typeof attributeCatalogSchema>;
export type AttributeDefinition = z.infer<typeof attributeDefinitionSchema>;
export type AttributeDefinitionWithUsage = z.infer<typeof attributeDefinitionWithUsageSchema>;
export type AttributeOption = z.infer<typeof attributeOptionSchema>;
export type AttributeOptionWithUsage = z.infer<typeof attributeOptionWithUsageSchema>;
export type AttributeValue = z.infer<typeof attributeValueSchema>;
export type AttributeSummary = z.infer<typeof attributeSummarySchema>;
export type SetAttributeValueRequest = z.infer<typeof setAttributeValueRequestSchema>;
export type CreateAttributeDefinitionRequest = z.infer<
  typeof createAttributeDefinitionRequestSchema
>;
export type UpdateAttributeDefinitionRequest = z.infer<
  typeof updateAttributeDefinitionRequestSchema
>;
export type CreateAttributeOptionRequest = z.infer<typeof createAttributeOptionRequestSchema>;
export type UpdateAttributeOptionRequest = z.infer<typeof updateAttributeOptionRequestSchema>;
