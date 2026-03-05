/**
 * React Query hooks for researcher data management
 * Provides type-safe server state management with automatic caching and invalidation
 */

import { type Researcher, sortByName } from '@odysseus/shared-schemas';
import { useQuery } from '@tanstack/react-query';

import { DOMAIN_QUERY_OPTIONS } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';

import { ResearcherService } from '../services/ResearcherService';

import type { UseQueryOptions } from '@tanstack/react-query';

/**
 * Hook to fetch all researchers (basic data only)
 * Use this for dropdowns, forms, and general display
 */
export function useResearchersQuery(options?: {
  filters?: { active?: boolean; search?: string };
  queryOptions?: Omit<UseQueryOptions<Researcher[]>, 'queryKey' | 'queryFn'>;
}) {
  const { filters, queryOptions } = options ?? {};

  return useQuery({
    queryKey: queryKeys.researchers.list(filters),
    queryFn: async (): Promise<Researcher[]> => {
      const researchers = await ResearcherService.list({ filters });
      return sortByName(researchers);
    },
    ...DOMAIN_QUERY_OPTIONS.researchers,
    ...queryOptions,
  });
}

/**
 * Hook to get visible researchers (approved AND active)
 * Used for dropdowns where only vetted, working researchers should appear
 *
 * Server-side filtering ensures pending researchers don't show in dropdowns
 */
export function useActiveResearchersQuery(options?: {
  queryOptions?: Omit<UseQueryOptions<Researcher[], Error, Researcher[]>, 'queryKey' | 'queryFn'>;
}) {
  return useQuery<Researcher[], Error, Researcher[]>({
    queryKey: queryKeys.researchers.visible(),
    queryFn: async () => {
      const researchers = await ResearcherService.list({ visible: true });
      return sortByName(researchers);
    },
    ...DOMAIN_QUERY_OPTIONS.researchers,
    ...options?.queryOptions,
  });
}
