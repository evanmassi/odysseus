/**
 * Registration Utilities
 *
 * Shared helpers for registration forms (AuthRegistrationModal, AuthSysAdminSetupPage).
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function getValidationState(
  touched: boolean,
  isValid: boolean
): 'default' | 'success' | 'error' {
  if (!touched) return 'default';
  return isValid ? 'success' : 'error';
}

export function isValidEmail(email: string): boolean {
  if (!email.trim()) return false;
  return EMAIL_PATTERN.test(email.trim());
}
