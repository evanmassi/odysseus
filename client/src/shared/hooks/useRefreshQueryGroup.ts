import { useCallback } from 'react';

import { useIsFetching, useQueryClient, type QueryKey } from '@tanstack/react-query';

export function useRefreshQueryGroup(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const isRefreshing = useIsFetching({ queryKey }) > 0;
  const refresh = useCallback(
    () => void queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey]
  );
  return { refresh, isRefreshing };
}
