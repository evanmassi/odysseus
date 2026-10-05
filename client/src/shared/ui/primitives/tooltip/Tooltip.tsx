import type { ReactNode } from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { ScrimHalo } from '../scrim-halo/ScrimHalo';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  disabled?: boolean;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  bare?: boolean;
}

const ANIMATION =
  'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2';

export const Tooltip = ({
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
}: TooltipProps) => {
  if (!content) {
    return <>{children}</>;
  }

  const contentClassName = bare
    ? `relative z-tooltip ${ANIMATION} ${className}`
    : `relative isolate z-tooltip px-3 py-1.5 font-mono text-data-sm text-tooltip-foreground ${ANIMATION} ${className}`;

  // PITFALL: the Radix tree always renders so toggling disabled doesn't detach the child's ref.
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
            data-theme="dark"
            className={contentClassName}
          >
            {!bare && <ScrimHalo />}
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      )}
    </TooltipPrimitive.Root>
  );
};

Tooltip.displayName = 'Tooltip';
