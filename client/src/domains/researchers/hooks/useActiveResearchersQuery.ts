/**
 * Active Researchers Query
 *
 * Server-side filtered to approved+active only — pending researchers excluded from dropdowns.
 */

import { type Researcher, sortByName } from '@odysseus/shared-schemas';
import { useQuery } from '@tanstack/react-query';

import { DOMAIN_QUERY_OPTIONS } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';

import { ResearcherService } from '../services/ResearcherService';

import type { UseQueryOptions } from '@tanstack/react-query';

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
