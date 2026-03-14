/**
 * Lab Identity Hook
 *
 * Extracts the authenticated user's lab ID for lab-scoped query key partitioning.
 * Returns undefined for system admins (no lab assignment).
 */

import { useAuthStore } from '../stores/authStore';

export function useLabId(): string | undefined {
  return useAuthStore(s => s.user?.labId);
}
