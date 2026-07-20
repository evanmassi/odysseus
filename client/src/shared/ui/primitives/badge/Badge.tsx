/**
 * Badge
 *
 * Square initials chip; color comes from the consumer's className. Forwards ref + props
 * so it can be a Radix `asChild` trigger (e.g. inside Tooltip).
 */

import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: 'sm' | 'md';
  lit?: boolean;
}

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'w-5 h-5 text-label-2xs',
  md: 'w-[34px] h-[34px] text-label-sm',
};

// Applied only when `lit`. Two layers: a constant 1px contact ring + an outer halo whose
// alpha scales with the --lit theme var (1 = dark, glows; 0 = light, leaving just the ring).
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
