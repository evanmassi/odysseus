/**
 * Person Name Formatters
 *
 * Display name and initials for a person, falling back to username when names are missing.
 */

import type { NameSortable } from './personSchemas';

/**
 * Priority: firstName + lastName initials > firstName first 2 chars > username first 2 chars.
 *
 * @example
 * getPersonInitials({ username: 'jdoe', firstName: 'John', lastName: 'Doe' }) // 'JD'
 * getPersonInitials({ username: 'jdoe', firstName: 'John' })                  // 'JO'
 * getPersonInitials({ username: 'jdoe' })                                     // 'JD'
 */
export function getPersonInitials({ username, firstName, lastName }: NameSortable): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  return (username ?? '').slice(0, 2).toUpperCase();
}

/**
 * Priority: "firstName lastName" > "firstName" > "username".
 *
 * @example
 * getPersonDisplayName({ username: 'jdoe', firstName: 'John', lastName: 'Doe' }) // 'John Doe'
 * getPersonDisplayName({ username: 'jdoe', firstName: 'John' })                  // 'John'
 * getPersonDisplayName({ username: 'jdoe' })                                     // 'jdoe'
 */
export function getPersonDisplayName({ username, firstName, lastName }: NameSortable): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  return username ?? '';
}

/**
 * Sort-friendly name: "lastName, firstName" > "lastName" > "firstName" > "username".
 *
 * @example
 * getPersonSortName({ username: 'jdoe', firstName: 'John', lastName: 'Doe' }) // 'Doe, John'
 * getPersonSortName({ username: 'jdoe', lastName: 'Doe' })                    // 'Doe'
 * getPersonSortName({ username: 'jdoe' })                                     // 'jdoe'
 */
export function getPersonSortName({ username, firstName, lastName }: NameSortable): string {
  if (firstName && lastName) {
    return `${lastName}, ${firstName}`;
  }
  if (lastName) {
    return lastName;
  }
  if (firstName) {
    return firstName;
  }
  return username ?? '';
}
