/**
 * Badge
 *
 * Square initial chip; color comes from consumer className.
 */

import type { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  lit?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-5 h-5 text-[9px]',
  md: 'w-[34px] h-[34px] text-[12px]',
  lg: 'w-[52px] h-[52px] text-[15px]',
};

// Inline because color-mix() in a Tailwind arbitrary class needs heavy underscore escaping.
const LIT_STYLE = {
  boxShadow:
    '0 0 0 1px color-mix(in srgb, currentColor 30%, transparent), 0 0 18px -2px color-mix(in srgb, currentColor 45%, transparent)',
};

export function Badge({ children, size = 'sm', lit = false, className = '' }: BadgeProps) {
  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 border border-current font-mono font-medium ${sizeClasses[size]} ${className}`}
      style={lit ? LIT_STYLE : undefined}
    >
      {children}
    </div>
  );
}
