/**
 * Form Utilities - Industry-Standard Partial Update Helpers
 *
 * Implements dirty field tracking for proper PATCH semantics.
 * Only sends fields that were actually modified by the user.
 *
 * Pattern: GraphQL-style precision updates
 * - Prevents accidental data loss in batch operations
 * - Clear user intent: touched = update, untouched = preserve
 * - Futureproof: works with any form structure
 */

import { FieldValues } from 'react-hook-form';

/**
 * Extract only dirty (modified) fields from form data
 *
 * @param formData - Complete form data from form.getValues()
 * @param dirtyFields - Dirty fields tracking from form.formState.dirtyFields
 * @returns Object containing only the fields user modified
 *
 * @example
 * const formData = { name: 'John', age: 30, email: 'john@example.com' };
 * const dirtyFields = { name: true, age: true }; // email not touched
 * const result = extractDirtyFields(formData, dirtyFields);
 * // result = { name: 'John', age: 30 } // email excluded
 *
 * @example Nested objects
 * const formData = { sample: { cellType: 'Jurkat', media: { type: 'RPMI' } } };
 * const dirtyFields = { sample: { media: { type: true } } }; // Only media.type touched
 * const result = extractDirtyFields(formData, dirtyFields);
 * // result = { sample: { media: { type: 'RPMI' } } } // Only modified nested field
 */
export function extractDirtyFields<T extends FieldValues>(
  formData: T,
  dirtyFields: Partial<Record<keyof T, any>>
): Partial<T> {
  // Base case: if no dirty fields, return empty object
  if (!dirtyFields || Object.keys(dirtyFields).length === 0) {
    return {};
  }

  const result: any = {};

  for (const key in dirtyFields) {
    if (dirtyFields.hasOwnProperty(key)) {
      const isDirty = dirtyFields[key];
      const value = formData[key];

      // If the field is marked as dirty (boolean true), include it
      if (isDirty === true) {
        result[key] = value;
      }
      // If it's an object (nested dirtyFields), recursively extract
      else if (typeof isDirty === 'object' && isDirty !== null && !Array.isArray(isDirty)) {
        // Only recurse if the value is also an object
        if (typeof value === 'object' && value !== null) {
          const nestedDirty = extractDirtyFields(value, isDirty);
          // Only include nested object if it has dirty fields
          if (Object.keys(nestedDirty).length > 0) {
            result[key] = nestedDirty;
          }
        }
      }
      // Handle arrays - if array is dirty, include entire array
      else if (Array.isArray(isDirty) && Array.isArray(value)) {
        // For arrays, if any element is dirty, include the whole array
        // This is standard behavior for form arrays
        const hasDirtyElements = isDirty.some(item =>
          typeof item === 'boolean' ? item : Object.keys(item || {}).length > 0
        );
        if (hasDirtyElements) {
          result[key] = value;
        }
      }
    }
  }

  return result;
}

/**
 * Check if any fields are dirty in a form
 * Useful for showing "unsaved changes" warnings
 */
export function hasAnyDirtyFields(dirtyFields: Record<string, any>): boolean {
  if (!dirtyFields) return false;

  for (const key in dirtyFields) {
    if (dirtyFields.hasOwnProperty(key)) {
      const value = dirtyFields[key];
      if (value === true) return true;
      if (typeof value === 'object' && hasAnyDirtyFields(value)) return true;
    }
  }

  return false;
}

/**
 * Extract only non-empty fields from form data
 *
 * Specifically for batch edit scenarios where:
 * - Conflicting fields start as empty strings/undefined
 * - User fills in ONLY what they want to change
 * - Empty/undefined fields should be excluded from update
 *
 * Different from extractDirtyFields: works with 'create' mode forms that don't track dirty state
 *
 * @param formData - Complete form data from form.getValues()
 * @returns Object containing only non-empty fields
 *
 * @example Batch edit scenario
 * const formData = {
 *   sample: { cellType: '', media: { type: 'RPMI-1640' } },
 *   researcherId: 'researcher_123'
 * };
 * const result = extractNonEmptyFields(formData);
 * // result = { sample: { media: { type: 'RPMI-1640' } }, researcherId: 'researcher_123' }
 * // cellType excluded because empty
 */
export function extractNonEmptyFields<T extends FieldValues>(formData: T): Partial<T> {
  const result: any = {};

  for (const key in formData) {
    if (formData.hasOwnProperty(key)) {
      const value = formData[key];

      // Skip undefined or null values
      if (value === undefined || value === null) {
        continue;
      }

      // Handle nested objects (like sample)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Check if it's a Date object (type assertion needed for generic type parameter)
        if ((value as any) instanceof Date) {
          result[key] = value;
        } else {
          const nestedResult = extractNonEmptyFields(value);
          // Only include nested object if it has non-empty fields
          if (Object.keys(nestedResult).length > 0) {
            result[key] = nestedResult;
          }
        }
      }
      // Handle arrays - include if not empty
      else if (Array.isArray(value)) {
        if (value.length > 0) {
          result[key] = value;
        }
      }
      // Handle strings - include if not empty
      else if (typeof value === 'string') {
        if (value.trim() !== '') {
          result[key] = value;
        }
      }
      // Handle other primitives (numbers, booleans, dates) - always include
      else {
        result[key] = value;
      }
    }
  }

  return result;
}
