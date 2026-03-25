/**
 * Person Domain Schemas
 *
 * Users and Researchers reference Person via personId.
 */

import { z } from 'zod';
import { dateField } from '../utils/dateFields';

export const personSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  createdAt: dateField,
  updatedAt: dateField,
});

export type Person = z.infer<typeof personSchema>;

export const updatePersonProfileSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').max(50, 'Last name too long').optional(),
  email: z.string().email('Invalid email format').optional(),
  position: z.string().max(100, 'Position too long').optional(),
  department: z.string().max(100, 'Department too long').optional()
});

export type UpdatePersonProfile = z.infer<typeof updatePersonProfileSchema>;

/**
 * Objects that can be sorted by name. Supports flexible field presence:
 * researchers have firstName/lastName, users fall back to username.
 */
export interface NameSortable {
  lastName?: string;
  firstName?: string;
  username?: string;
}

/**
 * Sorts by lastName → firstName → username. Empty/missing values sort to the end.
 *
 * @example
 * ```typescript
 * // Sort researchers
 * const sorted = sortByName(researchers);
 *
 * // Sort users (falls back to username when names missing)
 * const sortedUsers = sortByName(users);
 * ```
 */
export function sortByName<T extends NameSortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // Hyphenated last names sort by first segment
    const getLastNameKey = (name?: string): string => {
      if (!name?.trim()) return '\uffff'; // Sort empty to end
      const parts = name.split('-');
      return parts[0].trim().toLowerCase();
    };

    const getNameKey = (name?: string): string => {
      if (!name?.trim()) return '\uffff'; // Sort empty to end
      return name.trim().toLowerCase();
    };

    // Primary: lastName
    const lastNameA = getLastNameKey(a.lastName);
    const lastNameB = getLastNameKey(b.lastName);
    if (lastNameA !== lastNameB) {
      return lastNameA.localeCompare(lastNameB);
    }

    // Secondary: firstName
    const firstNameA = getNameKey(a.firstName);
    const firstNameB = getNameKey(b.firstName);
    if (firstNameA !== firstNameB) {
      return firstNameA.localeCompare(firstNameB);
    }

    // Tertiary: username (fallback for users without names)
    return getNameKey(a.username).localeCompare(getNameKey(b.username));
  });
}
