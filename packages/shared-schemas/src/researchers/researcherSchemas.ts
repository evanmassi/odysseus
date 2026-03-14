/**
 * Researcher Domain Schemas
 *
 * Pure domain entities for researcher profiles with no auth concerns.
 */

import { z } from 'zod';
import type { Person } from '../persons/personSchemas';

export const researcherApprovalStatusSchema = z.enum(['pending', 'approved']);
export const researcherSourceSchema = z.enum(['registration', 'admin']);

export type ResearcherApprovalStatus = z.infer<typeof researcherApprovalStatusSchema>;
export type ResearcherSource = z.infer<typeof researcherSourceSchema>;

export const researcherSchema = z.object({
  id: z.string(),
  personId: z.string(),
  active: z.boolean(),
  createdAt: z.union([z.string().datetime('Invalid created date'), z.date()]),
  approvalStatus: researcherApprovalStatusSchema.optional().default('approved'),
  source: researcherSourceSchema.optional().default('admin'),
  // Denormalized Person fields for display
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  position: z.string().optional(),
  department: z.string().optional(),
  labId: z.string().optional(),
});

export const createResearcherProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  position: z.string().max(100, 'Position too long').optional(),
  department: z.string().max(100, 'Department too long').optional(),
  email: z.string().min(1, 'Email is required').email('Invalid email format')
});

export const updateResearcherProfileSchema = createResearcherProfileSchema.partial().extend({
  active: z.boolean().optional()
});

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
 * Extended researcher view with admin metadata.
 */
export const adminResearcherSchema = researcherSchema.extend({
  // Approval workflow fields (required in admin view, overrides optional on base schema)
  approvalStatus: researcherApprovalStatusSchema,
  source: researcherSourceSchema,

  // Admin metadata
  tubeCount: z.number().int().min(0),
  linkedUserId: z.string().nullable(),
  linkedUsername: z.string().nullable(),
});

export type AdminResearcher = z.infer<typeof adminResearcherSchema>;

/** Format for display in lists: "Last, First" */
export const formatResearcherListDisplay = (person: Pick<Person, 'firstName' | 'lastName'>): string => {
  return `${person.lastName}, ${person.firstName}`;
};

/** Format for display in dropdowns: "First Last" */
export const formatResearcherDropdownDisplay = (person: Pick<Person, 'firstName' | 'lastName'>): string => {
  return `${person.firstName} ${person.lastName}`;
};

/** Format full display with position: "First Last (Position)" */
export const formatResearcherFullDisplay = (person: Pick<Person, 'firstName' | 'lastName' | 'position'>): string => {
  const baseName = formatResearcherDropdownDisplay(person);
  return person.position ? `${baseName} (${person.position})` : baseName;
};

/**
 * Number of single-character edits needed to transform one string into another.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

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

/** Similarity score between two names: 0–1, where 1 is identical. */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - (distance / maxLength);
}

/** Returns researchers with >85% name similarity — used for duplicate prevention on create. */
export function findSimilarResearchers(
  newPerson: Pick<Person, 'firstName' | 'lastName'>,
  existingPersons: Pick<Person, 'firstName' | 'lastName'>[]
): Pick<Person, 'firstName' | 'lastName'>[] {
  const newFullName = `${newPerson.firstName} ${newPerson.lastName}`.toLowerCase().trim();

  return existingPersons.filter(existing => {
    const existingFullName = `${existing.firstName} ${existing.lastName}`.toLowerCase().trim();

    // Exact match (case-insensitive)
    if (newFullName === existingFullName) return true;

    // High similarity (likely typo or minor variation)
    const similarity = calculateNameSimilarity(newFullName, existingFullName);
    return similarity > 0.85;
  });
}
