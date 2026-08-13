/**
 * Demo Lock Indicator
 *
 * Padlock standing in for a destructive control that a seeded demo record doesn't allow.
 */

import { Lock } from 'lucide-react';

import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';

const DEMO_LOCK_HINT = 'Protected — part of the demo dataset';

interface DemoLockIndicatorProps {
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function DemoLockIndicator({ side = 'top' }: DemoLockIndicatorProps) {
  return (
    <Tooltip content={DEMO_LOCK_HINT} side={side}>
      <Lock size={14} role="img" aria-label={DEMO_LOCK_HINT} className="text-muted-foreground" />
    </Tooltip>
  );
}
