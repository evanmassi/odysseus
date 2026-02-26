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

export function isSystemAdmin(role?: string): boolean {
  return role === 'system_admin';
}

export interface AuthCredentials {
  username: string;
  apiKey: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}
