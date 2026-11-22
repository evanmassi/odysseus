import type { CSSProperties } from 'react';

import type { IndicatorKind } from '../../../../utils/plateMap/plateLayers';

export const indicatorSwatchClass = (kind: IndicatorKind) =>
  `box-border inline-block h-3.5 w-3.5 flex-none ${kind === 'fill' ? '' : 'border-[1.5px]'}`;

export const indicatorSwatchStyle = (kind: IndicatorKind, color = 'currentColor'): CSSProperties =>
  kind === 'fill'
    ? { backgroundColor: color }
    : {
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        boxShadow: kind === 'stripe' ? `inset 0 4px 0 ${color}` : undefined,
      };
