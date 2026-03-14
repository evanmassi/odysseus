/**
 * Lab Identity Hook
 *
 * Extracts the authenticated user's lab ID for lab-scoped query key partitioning.
 */

import { useAuthStore } from '../stores/authStore';

export function useLabId(): string {
  const labId = useAuthStore(s => s.user?.labId);
  if (!labId) throw new Error('useLabId called without authenticated lab user');
  return labId;
}
