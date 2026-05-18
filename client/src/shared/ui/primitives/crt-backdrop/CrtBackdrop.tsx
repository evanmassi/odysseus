/**
 * CRT Backdrop
 *
 * Scanline-filled card surface with edge-faded mask. Children render above.
 */

import type { ReactNode } from 'react';

export type CrtBackdropSize = 'sm' | 'md' | 'lg';

export interface CrtBackdropProps {
  size?: CrtBackdropSize;
  children: ReactNode;
  className?: string;
}

const FADE_INSETS: Record<CrtBackdropSize, { x: number; y: number }> = {
  sm: { x: 24, y: 12 },
  md: { x: 24, y: 16 },
  lg: { x: 40, y: 40 },
};

export function CrtBackdrop({ size = 'md', children, className }: CrtBackdropProps) {
  const { x, y } = FADE_INSETS[size];
  const mask = `linear-gradient(to right, transparent, black ${x}px, black calc(100% - ${x}px), transparent), linear-gradient(to bottom, transparent, black ${y}px, black calc(100% - ${y}px), transparent)`;
  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-card bg-scanlines"
        style={{
          maskImage: mask,
          WebkitMaskImage: mask,
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      />
      {children}
    </div>
  );
}
