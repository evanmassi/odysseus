/**
 * First-Time Setup Query
 *
 * Live check for whether the instance still needs its initial system admin, so the
 * auth gateway reflects current server truth instead of a one-shot bootstrap snapshot.
 */

import { queryOptions, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { authService } from '../services/AuthService';

// staleTime 0 + refetchOnMount re-reads server truth whenever the gateway mounts
// (i.e. on logout), so a freshly-created admin retires the setup screen without a reload.
export const firstTimeSetupQueryOptions = queryOptions({
  queryKey: queryKeys.auth.firstTime(),
  queryFn: () => authService.checkFirstTime(),
  staleTime: 0,
  refetchOnMount: true,
});

export function useFirstTimeSetupQuery() {
  return useQuery(firstTimeSetupQueryOptions);
}
