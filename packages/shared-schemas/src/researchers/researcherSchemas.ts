/**
 * Researcher Domain Schemas
 *
 * Researchers are simple domain entities representing scientific profiles:
 * - Researcher: Profile data only
 * - CreateResearcherProfile / UpdateResearcherProfile: Mutation inputs
 *
 * No authentication/authorization concerns - pure domain entities.
 */

import { z } from 'zod';

/**
 * Researcher Domain Entity
 *
 * Represents a researcher profile in the lab system.
 * Simple, clean domain model matching backend implementation.
 */
export const researcherSchema = z.object({
  id: z.string(), // nanoid format from backend
  firstName: z.string(),
  lastName: z.string(),
  position: z.string().optional(),
  department: z.string().optional(),
  email: z.string().optional(),
  active: z.boolean(),
  createdAt: z.union([z.string().datetime('Invalid created date'), z.date()]) // API sends ISO string, transformer converts to Date
});

/**
 * Array of researchers schema
 */
export const researchersArraySchema = z.array(researcherSchema);

/**
 * Researcher Creation Schema
 *
 * Input for creating new researchers
 * Matches backend CreateResearcherRequest DTO exactly
 */
export const createResearcherProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  position: z.string().max(100, 'Position too long').optional(),
  department: z.string().max(100, 'Department too long').optional(),
  email: z.string().min(1, 'Email is required').email('Invalid email format')
});

/**
 * Researcher Update Schema
 *
 * Partial version for updates with active status support
 * Matches backend UpdateResearcherRequest DTO exactly
 */
export const updateResearcherProfileSchema = createResearcherProfileSchema.partial().extend({
  active: z.boolean().optional()
});

/**
 * Researcher query filters schema
 */
export const researcherQueryFiltersSchema = z.object({
  active: z.boolean().optional(),
  department: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export type Researcher = z.infer<typeof researcherSchema>;
export type CreateResearcherProfile = z.infer<typeof createResearcherProfileSchema>;
export type UpdateResearcherProfile = z.infer<typeof updateResearcherProfileSchema>;
export type ResearcherQueryFilters = z.infer<typeof researcherQueryFiltersSchema>;

/**
 * Admin Researcher Schema
 *
 * Extended researcher view with admin metadata (tube counts, user links)
 * Used in admin panels for researcher management and safe deletion
 */
export const adminResearcherSchema = researcherSchema.extend({
  tubeCount: z.number().int().min(0),
  linkedUserId: z.string().nullable(),
  linkedUsername: z.string().nullable(),
});

export type AdminResearcher = z.infer<typeof adminResearcherSchema>;

/**
 * Admin Researchers Response Schema
 *
 * API response for admin researcher queries
 */
export const adminResearchersResponseSchema = z.object({
  success: z.boolean(),
  researchers: z.array(adminResearcherSchema),
});

export type AdminResearchersResponse = z.infer<typeof adminResearchersResponseSchema>;

/**
 * Validation utilities
 */
export const validateResearcherName = (firstName: string, lastName: string): boolean => {
  return firstName.trim().length >= 1 && firstName.trim().length <= 50 &&
         lastName.trim().length >= 1 && lastName.trim().length <= 50;
};

export const validateResearcherEmail = (email?: string): boolean => {
  if (!email) return true; // email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Display utilities for researcher names
 */

/** Format for display in lists: "Last, First" */
export const formatResearcherListDisplay = (researcher: Pick<Researcher, 'firstName' | 'lastName'>): string => {
  return `${researcher.lastName}, ${researcher.firstName}`;
};

/** Format for display in dropdowns: "First Last" */
export const formatResearcherDropdownDisplay = (researcher: Pick<Researcher, 'firstName' | 'lastName'>): string => {
  return `${researcher.firstName} ${researcher.lastName}`;
};

/** Format full display with position: "First Last (Position)" */
export const formatResearcherFullDisplay = (researcher: Pick<Researcher, 'firstName' | 'lastName' | 'position'>): string => {
  const baseName = formatResearcherDropdownDisplay(researcher);
  return researcher.position ? `${baseName} (${researcher.position})` : baseName;
};

/**
 * Sorting utility for researchers
 * Sorts by last name, with special handling for hyphenated names
 * Hyphenated names sort by the first part of the hyphen
 */
export const sortResearchers = (a: Pick<Researcher, 'firstName' | 'lastName'>, b: Pick<Researcher, 'firstName' | 'lastName'>): number => {
  // Extract primary sort key from last name
  // For hyphenated names like "Smith-Johnson", use "Smith"
  const getLastNameSortKey = (lastName: string): string => {
    const parts = lastName.split('-');
    return parts[0].trim().toLowerCase();
  };

  const aKey = getLastNameSortKey(a.lastName);
  const bKey = getLastNameSortKey(b.lastName);

  // Primary sort: last name (using first part if hyphenated)
  if (aKey !== bKey) {
    return aKey.localeCompare(bKey);
  }

  // Secondary sort: if last names match, sort by first name
  return a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
};

/**
 * Name similarity detection utilities
 * Used for duplicate prevention when creating researchers
 */

/**
 * Calculate Levenshtein distance between two strings
 * Returns the number of single-character edits needed to transform one string into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two names (0-1, where 1 is identical)
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - (distance / maxLength);
}

/**
 * Find similar researchers that might be duplicates
 * Returns researchers with high name similarity (>85% match or exact match)
 */
export function findSimilarResearchers(
  newResearcher: Pick<Researcher, 'firstName' | 'lastName'>,
  existingResearchers: Pick<Researcher, 'firstName' | 'lastName'>[]
): Pick<Researcher, 'firstName' | 'lastName'>[] {
  const newFullName = `${newResearcher.firstName} ${newResearcher.lastName}`.toLowerCase().trim();

  return existingResearchers.filter(existing => {
    const existingFullName = `${existing.firstName} ${existing.lastName}`.toLowerCase().trim();

    // Exact match (case-insensitive)
    if (newFullName === existingFullName) return true;

    // High similarity (likely typo or minor variation)
    const similarity = calculateNameSimilarity(newFullName, existingFullName);
    return similarity > 0.85;
  });
}
