/**
 * Demo Account Hook
 *
 * Reports whether the authenticated user is on a demo account (account changes disabled).
 */

import { useAuthStore } from '../stores/authStore';

export function useIsDemo(): boolean {
  return useAuthStore(s => s.user?.isDemo ?? false);
}
