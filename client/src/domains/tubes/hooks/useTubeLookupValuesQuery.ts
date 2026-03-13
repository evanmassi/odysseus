/**
 * Lookup Values Query Hook
 *
 * Fetches active lookup values for form dropdowns (species, source).
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { httpClient } from '@infra/api';

import type { LookupCategory, LookupValue } from '@odysseus/shared-schemas';

export function useLookupValuesQuery(category: LookupCategory) {
  return useQuery({
    queryKey: queryKeys.lookups.byCategory(category),
    queryFn: async () => {
      const response = await httpClient.get<{
        success: boolean;
        data: LookupValue[];
      }>(`/lookups/${category}`);
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
