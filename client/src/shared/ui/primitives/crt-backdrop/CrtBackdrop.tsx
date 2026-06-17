/**
 * CRT Backdrop
 *
 * Scanline-filled card surface with edge-faded mask. Children render above.
 */

import type { ReactNode } from 'react';

export type CrtBackdropSize = 'sm' | 'md' | 'lg';
export type CrtBackdropLighting = 'anchored' | 'diffuse';

export interface CrtBackdropProps {
  size?: CrtBackdropSize;
  /** `anchored` = tight TL pool (content anchors there); `diffuse` = wide ambient wash. */
  lighting?: CrtBackdropLighting;
  scanlines?: boolean;
  children: ReactNode;
  className?: string;
}

const FADE_INSETS: Record<CrtBackdropSize, { x: number; y: number }> = {
  sm: { x: 24, y: 12 },
  md: { x: 24, y: 16 },
  lg: { x: 40, y: 40 },
};

const SCANLINES =
  'repeating-linear-gradient(to bottom, hsl(var(--scanline)) 0, hsl(var(--scanline)) 1px, transparent 1px, transparent 3px)';

const LIGHTING_LAYERS: Record<CrtBackdropLighting, string[]> = {
  anchored: [
    'radial-gradient(ellipse 60% 80% at 18% 10%, hsl(var(--primary)/0.07), transparent 90%)',
    'radial-gradient(ellipse 60% 60% at 100% 100%, hsl(var(--shade) / 0.16), transparent 85%)',
  ],
  diffuse: [
    'linear-gradient(135deg, hsl(var(--primary)/0.04) 0%, transparent 55%, hsl(var(--shade) / 0.05) 100%)',
  ],
};

export function CrtBackdrop({
  size = 'md',
  lighting = 'diffuse',
  scanlines = true,
  children,
  className,
}: CrtBackdropProps) {
  const { x, y } = FADE_INSETS[size];
  const mask = `linear-gradient(to right, transparent, black ${x}px, black calc(100% - ${x}px), transparent), linear-gradient(to bottom, transparent, black ${y}px, black calc(100% - ${y}px), transparent)`;
  const layers = scanlines ? [SCANLINES, ...LIGHTING_LAYERS[lighting]] : LIGHTING_LAYERS[lighting];
  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-card"
        style={{
          backgroundImage: layers.join(','),
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
