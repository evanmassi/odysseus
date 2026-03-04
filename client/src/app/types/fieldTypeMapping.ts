/**
 * Field Type Mapping
 *
 * Maps tube field paths to their TypeScript types for type-safe field resolution.
 * Used by field resolver hooks and services to provide compile-time type checking
 * for nested property access.
 */

export type FieldValue = string | number | boolean | Date | null | undefined;

export type ComplexFieldValue = Record<string, FieldValue>;

export type ValidFieldValue = FieldValue | ComplexFieldValue;

// Date objects are converted to ISO strings at runtime
export type NormalizedFieldValue = Exclude<FieldValue, Date> | ComplexFieldValue;

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
  'sample.mediaType': string | undefined;
  'sample.mediaSupplements': string | undefined;
  'sample.mediaSelection': string | undefined;
  'sample.cultureCondition': string | undefined;
  'sample.lotNumber': string | undefined;
  'sample.notes': string | undefined;

  // Top-level fields
  researcherId: string | undefined;
  createdByName: string | undefined;
  'timestamps.createdAt': string;
  'timestamps.updatedAt': string;
};

export type ValidFieldPath = keyof TubeFieldTypeMap;

export function hasValue(value: unknown): value is NonNullable<ValidFieldValue> {
  return value !== undefined && value !== null && value !== '';
}

// Checks not-null and not-array since typeof null === 'object'
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
