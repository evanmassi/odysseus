import type { ReactNode } from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

const REST_DELAY_MS = 700;

export function RestingTooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={REST_DELAY_MS} skipDelayDuration={0}>
      {children}
    </TooltipPrimitive.Provider>
  );
}
