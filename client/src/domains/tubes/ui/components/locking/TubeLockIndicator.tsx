/**
 * Lock Indicator
 *
 * Bottom-left icon for locked tubes with luminance-adaptive coloring.
 */

import { Lock, ShieldCheck, ShieldUser } from 'lucide-react';

import { getOptimalTextColor } from '@shared/utils/labColorSpace';

import type { LockVariant } from '@domains/tubes/types';

interface TubeLockIndicatorProps {
  size?: number;
  variant?: LockVariant;
  /** Used to pick a contrasting icon color for visibility */
  backgroundColor?: string;
  className?: string;
}

/** Purely visual — lock info is displayed via TubeGridTooltip on cell hover. */
export function TubeLockIndicator({
  size = 12,
  variant = 'other',
  backgroundColor,
  className = '',
}: TubeLockIndicatorProps) {
  const needsLightIcon = backgroundColor
    ? getOptimalTextColor(backgroundColor).toLowerCase() === '#ffffff'
    : false;

  let iconColor: string;
  if (variant === 'other') {
    iconColor = needsLightIcon ? '#fca5a5' : '#ef4444'; // red-300 : red-500
  } else {
    iconColor = needsLightIcon ? '#ffffff' : '#374151'; // white : gray-700
  }

  const IconComponent =
    variant === 'shared' ? ShieldCheck : variant === 'admin-override' ? ShieldUser : Lock;

  return (
    <div className={`absolute bottom-0.5 left-0.5 z-[2] ${className}`}>
      <IconComponent
        size={size}
        style={{ color: iconColor }}
        className="drop-shadow-sm"
        strokeWidth={2.5}
      />
    </div>
  );
}
