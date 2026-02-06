/**
 * Tooltip Component
 *
 * Accessible tooltip with frosted glass styling built on Radix UI.
 */

import React from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export interface TooltipProps {
  /** The content to show in the tooltip */
  content: React.ReactNode;
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Side of the trigger to show tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment relative to trigger */
  align?: 'start' | 'center' | 'end';
  /** Delay in ms before showing tooltip */
  delayDuration?: number;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
  /** Additional class name for the content */
  className?: string;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
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
              font-['Lato',sans-serif]
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
