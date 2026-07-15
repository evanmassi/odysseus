/**
 * Realtime Sync Indicator
 *
 * Transient "Syncing…" badge shown while a mutation is in flight.
 */

import { useState, useEffect, useTransition } from 'react';

import { useQueryClient } from '@tanstack/react-query';

export function RealtimeSyncIndicator() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [, startTransition] = useTransition();

  const queryClient = useQueryClient();

  useEffect(() => {
    // Count what is still in flight rather than react to the mutation that just settled — the
    // first of several concurrent mutations to finish would otherwise clear the badge early.
    const syncPendingState = () => {
      const isPending = queryClient.isMutating() > 0;
      startTransition(() => {
        setIsAnimating(isPending);
      });
    };

    return queryClient.getMutationCache().subscribe(syncPendingState);
  }, [queryClient]);

  if (!isAnimating) return null;

  return (
    <div className="fixed top-4 right-4 z-40 flex items-center space-x-2 bg-info-bg text-white px-3 py-1 rounded-full shadow-lg text-body-sm">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span>Syncing...</span>
    </div>
  );
}
