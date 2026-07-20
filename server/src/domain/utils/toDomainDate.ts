/**
 * Domain Date Coercion
 *
 * Persisted timestamps reach an entity either as a Date from pg or as an ISO string from a mapper.
 */

export function toDomainDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}
