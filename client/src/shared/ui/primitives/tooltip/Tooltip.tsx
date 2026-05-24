/**
 * Tooltip Component
 *
 * Accessible tooltip with frosted glass styling built on Radix UI.
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
}

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
}) => {
  if (!content) {
    return <>{children}</>;
  }

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
            className={`
              z-50 px-3 py-1.5
              text-xs font-medium
              text-tooltip-foreground
              bg-tooltip
              rounded-lg
              shadow-xl shadow-black/30
              border border-tooltip-border
              animate-in fade-in-0 zoom-in-95
              data-[state=closed]:animate-out
              data-[state=closed]:fade-out-0
              data-[state=closed]:zoom-out-95
              data-[side=bottom]:slide-in-from-top-2
              data-[side=left]:slide-in-from-right-2
              data-[side=right]:slide-in-from-left-2
              data-[side=top]:slide-in-from-bottom-2
              ${className}
            `}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-tooltip" width={12} height={6} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      )}
    </TooltipPrimitive.Root>
  );
};

Tooltip.displayName = 'Tooltip';
