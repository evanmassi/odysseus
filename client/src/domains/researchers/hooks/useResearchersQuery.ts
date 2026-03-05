/**
 * Researcher Query Hooks
 *
 * Full-list and active-only (approved + active) researcher queries with sorted results.
 */

import { type Researcher, sortByName } from '@odysseus/shared-schemas';
import { useQuery } from '@tanstack/react-query';

import { DOMAIN_QUERY_OPTIONS } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';

import { ResearcherService } from '../services/ResearcherService';

import type { UseQueryOptions } from '@tanstack/react-query';

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

/** Server-side filtered to approved+active only — pending researchers excluded from dropdowns. */
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
