/**
 * Tooltip Component
 *
 * Accessible tooltip built on Radix UI — tactical fuzzy-black card with mono text.
 */

import React from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** Delay in ms before showing */
  delayDuration?: number;
  disabled?: boolean;
  /** Applied to the tooltip content element, not the trigger */
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Render only a positioned container — caller supplies its own chrome (e.g. the grid card) */
  bare?: boolean;
}

const ANIMATION =
  'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2';

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration,
  disabled = false,
  className = '',
  open,
  onOpenChange,
  bare = false,
}) => {
  if (!content) {
    return <>{children}</>;
  }

  const contentClassName = bare
    ? `relative z-50 ${ANIMATION} ${className}`
    : `relative isolate z-50 px-3 py-1.5 font-mono text-xs text-tooltip-foreground ${ANIMATION} ${className}`;

  // Always render the Radix tree to keep children's DOM nodes stable.
  // Prevents ref detachment when disabled toggles (e.g., truncation detection).
  return (
    <TooltipPrimitive.Root
      delayDuration={delayDuration}
      open={disabled ? false : open}
      onOpenChange={disabled ? undefined : onOpenChange}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      {!disabled && (
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            className={contentClassName}
          >
            {!bare && (
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-2 -z-10 bg-black/[0.93] blur-md"
              />
            )}
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      )}
    </TooltipPrimitive.Root>
  );
};

Tooltip.displayName = 'Tooltip';
