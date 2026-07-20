/**
 * Active Researchers Query
 *
 * Server-side filtered to active researchers only.
 */

import { type Researcher, sortByName } from '@odysseus/shared-schemas';
import { useQuery } from '@tanstack/react-query';

import { DOMAIN_QUERY_OPTIONS } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { ResearcherService } from '../services/ResearcherService';

export function useActiveResearchersQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.researchers.visible(labId),
    queryFn: async (): Promise<Researcher[]> => {
      const researchers = await ResearcherService.list({ visible: true });
      return sortByName(researchers);
    },
    ...DOMAIN_QUERY_OPTIONS.researchers,
    enabled: !!labId,
  });
}
