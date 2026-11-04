import { usernameBase } from '@odysseus/shared-schemas';

export function generateUsernamePreview(firstName: string, lastName: string): string {
  if (!firstName.trim() || !lastName.trim()) return '';
  return usernameBase(firstName, lastName);
}
