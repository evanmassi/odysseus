/**
 * Registration Utilities
 *
 * Shared helpers for registration forms (AuthRegistrationModal, AuthSysAdminSetupPage).
 */

export function generateUsernamePreview(firstName: string, lastName: string): string {
  if (!firstName.trim() || !lastName.trim()) return '';
  const cleanFirst = firstName
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const cleanLast = lastName
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (!cleanFirst || !cleanLast) return '';
  return `${cleanFirst}.${cleanLast}`;
}
