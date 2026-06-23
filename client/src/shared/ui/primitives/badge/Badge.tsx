/**
 * Badge
 *
 * Square initial chip; color comes from consumer className. Forwards its ref and
 * spreads props so it can be a Radix `asChild` trigger (e.g. wrapped in Tooltip).
 */

import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  lit?: boolean;
}

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  xs: 'w-5 h-5 text-label-2xs',
  sm: 'w-5 h-5 text-label-2xs',
  md: 'w-[34px] h-[34px] text-label-sm',
  lg: 'w-[52px] h-[52px] text-label-lg',
};

// `lit` is a flat 1px contact ring always; the outer halo scales with --lit, so it glows
// when lit (dark) and stays a flat ring when unlit (light, incl. the forced-dark header).
const LIT_CLASSES =
  'shadow-[0_0_0_1px_color-mix(in_srgb,currentColor_30%,transparent),0_0_18px_-2px_color-mix(in_srgb,currentColor_calc(45%_*_var(--lit)),transparent)]';

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(function Badge(
  { children, size = 'sm', lit = false, className = '', ...rest },
  ref
) {
  return (
    <div
      {...rest}
      ref={ref}
      className={`inline-flex items-center justify-center flex-shrink-0 border border-current font-mono font-medium ${sizeClasses[size]} ${lit ? LIT_CLASSES : ''} ${className}`}
    >
      {children}
    </div>
  );
});

Badge.displayName = 'Badge';
