/**
 * Person Domain Schemas
 *
 * Users and Researchers reference Person via personId.
 */

import { z } from 'zod';

/**
 * Person Domain Entity
 *
 * Core profile entity containing name, email, and organizational data.
 * Referenced by User and Researcher entities.
 */
export const personSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  position: z.string().optional(),
  department: z.string().optional(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()])
});

export type Person = z.infer<typeof personSchema>;

/**
 * Person Update Schema
 *
 * Input for updating person profiles
 * All fields optional for partial updates
 */
export const updatePersonProfileSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').max(50, 'Last name too long').optional(),
  email: z.string().email('Invalid email format').optional(),
  position: z.string().max(100, 'Position too long').optional(),
  department: z.string().max(100, 'Department too long').optional()
});

export type UpdatePersonProfile = z.infer<typeof updatePersonProfileSchema>;

/**
 * Person Profile Response Schema
 *
 * API response for person profile queries
 */
export const personProfileResponseSchema = z.object({
  success: z.boolean(),
  data: personSchema
});

export type PersonProfileResponse = z.infer<typeof personProfileResponseSchema>;

/**
 * Name Sortable Interface
 *
 * Objects that can be sorted by name. Supports flexible field presence:
 * - Researchers: have firstName/lastName (required)
 * - Users: have username (required), firstName/lastName (optional)
 */
export interface NameSortable {
  lastName?: string;
  firstName?: string;
  username?: string;
}

/**
 * Sort an array of person-like objects by name
 *
 * Sorting priority: lastName → firstName → username
 * - Handles hyphenated last names (e.g., "Smith-Johnson" sorts as "Smith")
 * - Empty/missing values sort to the end
 * - Case-insensitive comparison
 *
 * @param items - Array of objects with name fields
 * @returns New sorted array (does not mutate original)
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
    // Extract sort key from lastName, handling hyphenated names
    const getLastNameKey = (name?: string): string => {
      if (!name?.trim()) return '\uffff'; // Sort empty to end
      const parts = name.split('-');
      return parts[0].trim().toLowerCase();
    };

    const getFirstNameKey = (name?: string): string => {
      if (!name?.trim()) return '\uffff'; // Sort empty to end
      return name.trim().toLowerCase();
    };

    const getUsernameKey = (name?: string): string => {
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
    const firstNameA = getFirstNameKey(a.firstName);
    const firstNameB = getFirstNameKey(b.firstName);
    if (firstNameA !== firstNameB) {
      return firstNameA.localeCompare(firstNameB);
    }

    // Tertiary: username (fallback for users without names)
    const usernameA = getUsernameKey(a.username);
    const usernameB = getUsernameKey(b.username);
    return usernameA.localeCompare(usernameB);
  });
}
