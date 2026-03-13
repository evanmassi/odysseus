/**
 * Lookup Values Query Hook
 *
 * Fetches active lookup values for form dropdowns (species, source).
 */

import { lookupValueSchema } from '@odysseus/shared-schemas';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { httpClient } from '@infra/api';

import type { LookupCategory } from '@odysseus/shared-schemas';

export function useLookupValuesQuery(category: LookupCategory) {
  return useQuery({
    queryKey: queryKeys.lookups.byCategory(category),
    queryFn: () => httpClient.getArray(`/lookups/${category}`, lookupValueSchema),
    staleTime: 5 * 60 * 1000,
  });
}
