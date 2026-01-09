/**
 * Field Type Mapping
 *
 * Maps tube field paths to their TypeScript types for type-safe field resolution.
 * Used by field resolver hooks and services to provide compile-time type checking
 * for nested property access.
 */

import type { TubeData } from '@odysseus/shared-schemas';

/**
 * Valid primitive field value types
 */
export type FieldValue = string | number | boolean | Date | null | undefined;

/**
 * Complex field value types (for objects like media)
 */
export type ComplexFieldValue = Record<string, FieldValue>;

/**
 * Union of all valid field values
 */
export type ValidFieldValue = FieldValue | ComplexFieldValue;

/**
 * Normalized field value - Date objects are converted to ISO strings
 * Used by field resolver return types to reflect runtime normalization
 */
export type NormalizedFieldValue = Exclude<FieldValue, Date> | ComplexFieldValue;

/**
 * Explicit mapping of known field paths to their TypeScript types
 *
 * This mapping ensures type-safe field access throughout the application.
 * When accessing fields through the field resolver, TypeScript will know
 * the exact return type based on the field path.
 */
export type TubeFieldTypeMap = {
  // Location fields (always defined)
  'location.tankId': string;
  'location.rackId': string;
  'location.boxId': string;
  'location.position': number;

  // Sample fields (optional)
  'sample.cellType': string | undefined;
  'sample.donorInternalId': string | undefined;
  'sample.donorSourceId': string | undefined;
  'sample.concentration': number | undefined;
  'sample.concentrationUnit': 'c/v' | 'c/mL' | undefined;
  'sample.date': string | undefined;
  'sample.media': TubeData['sample']['media'];
  'sample.media.type': string | undefined;
  'sample.media.supplements': string | undefined;
  'sample.media.selection': string | undefined;
  'sample.cultureCondition': string | undefined;
  'sample.lotNumber': string | undefined;
  'sample.notes': string | undefined;

  // Top-level fields
  researcherId: string | undefined;
  createdByName: string | undefined;
  'timestamps.createdAt': string;
  'timestamps.updatedAt': string;
};

/**
 * Union of all valid field paths
 */
export type ValidFieldPath = keyof TubeFieldTypeMap;

/**
 * Type guard to check if a value is a valid non-null field value
 *
 * Used throughout field resolvers to safely narrow unknown types.
 */
export function hasValue(value: unknown): value is NonNullable<ValidFieldValue> {
  return value !== undefined && value !== null && value !== '';
}

/**
 * Type guard to validate if a string is a known field path
 */
export function isValidFieldPath(path: string): path is ValidFieldPath {
  const validPaths: Set<string> = new Set([
    'location.tankId',
    'location.rackId',
    'location.boxId',
    'location.position',
    'sample.cellType',
    'sample.donorInternalId',
    'sample.donorSourceId',
    'sample.concentration',
    'sample.concentrationUnit',
    'sample.date',
    'sample.media',
    'sample.media.type',
    'sample.media.supplements',
    'sample.media.selection',
    'sample.cultureCondition',
    'sample.lotNumber',
    'sample.notes',
    'researcherId',
    'createdByName',
    'timestamps.createdAt',
    'timestamps.updatedAt',
  ]);

  return validPaths.has(path);
}

/**
 * Type guard to check if value is an object (not null, not array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
