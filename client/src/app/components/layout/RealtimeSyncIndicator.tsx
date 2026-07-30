/**
 * Realtime Sync Indicator
 *
 * Transient "Syncing…" badge shown while a mutation is in flight. Centred on the header, whose
 * middle is empty — the bottom corners belong to toasts.
 */

import { useEffect, useState } from 'react';

import { useIsMutating } from '@tanstack/react-query';

// Anything quicker than this reads as a flicker rather than as feedback, and most writes here
// (a toggle, a chip) land well inside it.
const APPEARANCE_DELAY_MS = 300;

export function RealtimeSyncIndicator() {
  // Counts what is still in flight rather than reacting to the mutation that just settled — the
  // first of several concurrent mutations to finish would otherwise clear the badge early.
  const isMutating = useIsMutating() > 0;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isMutating) {
      setIsVisible(false);
      return;
    }
    const timer = setTimeout(() => setIsVisible(true), APPEARANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isMutating]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 z-40 -translate-x-1/2 flex items-center space-x-2 bg-info-bg text-white px-3 py-1 rounded-full shadow-lg text-body-sm">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span>Syncing...</span>
    </div>
  );
}
