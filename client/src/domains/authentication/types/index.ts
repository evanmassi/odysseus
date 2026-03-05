/**
 * Authentication Domain Types
 *
 * Core user and role types shared across the authentication domain.
 */

export type UserRole = 'system_admin' | 'lab_admin' | 'user';

export interface User {
  id: string;
  username: string;
  lastActivity: string;
  role?: UserRole;
  labId?: string;
  researcherId?: string;
  isDemo?: boolean;
}

export function isAdminRole(role?: string): boolean {
  return role === 'system_admin' || role === 'lab_admin';
}
