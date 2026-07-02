/**
 * Form Field Validation
 *
 * Validation-state mapping and email format checks for form inputs.
 */

import type { InputState } from '@shared/ui/primitives/input/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getValidationState(touched: boolean, isValid: boolean): InputState {
  if (!touched) return 'default';
  return isValid ? 'success' : 'error';
}

export function isValidEmail(email: string): boolean {
  if (!email.trim()) return false;
  return EMAIL_PATTERN.test(email.trim());
}
