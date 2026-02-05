/**
 * Tooltip Component
 *
 * Accessible tooltip with frosted glass styling built on Radix UI.
 * Uses uncontrolled state to prevent re-render cascades during rapid updates.
 */

import React, { forwardRef } from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

/**
 * Stable ref wrapper to prevent Radix composeRefs issues during rapid re-renders.
 * Uses display:contents to avoid layout side effects.
 */
const TooltipTriggerWrapper = forwardRef<HTMLSpanElement, { children: React.ReactNode }>(
  ({ children, ...props }, ref) => (
    <span ref={ref} {...props} style={{ display: 'contents' }}>
      {children}
    </span>
  )
);
TooltipTriggerWrapper.displayName = 'TooltipTriggerWrapper';

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
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration,
  disabled = false,
  className = '',
}) => {
  if (disabled || !content) {
    return <>{children}</>;
  }

  // Uncontrolled state - Radix manages open/close internally.
  // Prevents re-render feedback loops during rapid TanStack Query updates.
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>
        <TooltipTriggerWrapper>{children}</TooltipTriggerWrapper>
      </TooltipPrimitive.Trigger>
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
    </TooltipPrimitive.Root>
  );
};

Tooltip.displayName = 'Tooltip';
