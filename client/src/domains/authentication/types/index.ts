/**
 * Authentication Domain Types
 *
 * Core role types and helpers shared across the authentication domain.
 */

export type UserRole = 'system_admin' | 'lab_admin' | 'user';

export function isAdminRole(role?: string): boolean {
  return role === 'system_admin' || role === 'lab_admin';
}
