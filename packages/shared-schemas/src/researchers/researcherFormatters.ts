/**
 * Researcher Name Formatters
 *
 * "Last, First" list and "First Last" dropdown display formatting for researchers.
 */

import type { Person } from '../persons/personSchemas';

/** Format for display in lists: "Last, First" */
export const formatResearcherListDisplay = (person: Pick<Person, 'firstName' | 'lastName'>): string => {
  return `${person.lastName}, ${person.firstName}`;
};

/** Format for display in dropdowns: "First Last" */
export const formatResearcherDropdownDisplay = (person: Pick<Person, 'firstName' | 'lastName'>): string => {
  return `${person.firstName} ${person.lastName}`;
};
