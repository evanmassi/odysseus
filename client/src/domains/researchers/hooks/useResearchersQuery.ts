/**
 * Researchers Query
 *
 * Full researcher list with optional filters and sorted results.
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
