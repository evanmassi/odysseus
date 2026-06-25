/**
 * Realtime Sync Indicator
 *
 * Transient "Syncing…" badge shown while a mutation is in flight.
 */

import React, { useState, useEffect, useTransition } from 'react';

import { useQueryClient, type MutationCacheNotifyEvent } from '@tanstack/react-query';

export const RealtimeSyncIndicator: React.FC = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [, startTransition] = useTransition();

  const queryClient = useQueryClient();

  useEffect(() => {
    const mutationCache = queryClient.getMutationCache();

    const handleMutationUpdate = (event: MutationCacheNotifyEvent) => {
      const mutation = event.mutation;

      if (mutation?.state?.status === 'pending') {
        startTransition(() => {
          setIsAnimating(true);
        });
      } else if (mutation?.state?.status === 'success' || mutation?.state?.status === 'error') {
        startTransition(() => {
          setIsAnimating(false);
        });
      }
    };

    const unsubscribe = mutationCache.subscribe(handleMutationUpdate);

    return unsubscribe;
  }, [queryClient]);

  if (!isAnimating) return null;

  return (
    <div className="fixed top-4 right-4 z-40 flex items-center space-x-2 bg-info-bg text-white px-3 py-1 rounded-full shadow-lg text-body-sm">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span>Syncing...</span>
    </div>
  );
};
