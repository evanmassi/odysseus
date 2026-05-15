/**
 * Badge
 *
 * Square initial chip — color/bg/border come from consumer className.
 */

import type { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-5 h-5 text-[9px]',
  md: 'w-6 h-6 text-xs',
  lg: 'w-12 h-12 text-base',
};

export function Badge({ children, size = 'sm', className = '' }: BadgeProps) {
  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 border border-current font-mono font-medium ${sizeClasses[size]} ${className}`}
    >
      {children}
    </div>
  );
}
