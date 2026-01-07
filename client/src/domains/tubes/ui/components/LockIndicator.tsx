/**
 * Lock Indicator Component
 *
 * Visual indicator for locked tubes showing:
 * - Lock icon color adapts to tube background for visibility
 * - Uses same luminance-based switching as tube text
 * - Red variant uses light/dark red based on background
 * - Tooltip with lock owner information
 *
 * Position: Bottom-left corner of tube grid cell
 */

import { Lock, ShieldCheck } from 'lucide-react';

import { Tooltip } from '@shared/ui';
import { getOptimalTextColor } from '@shared/utils/labColorSpace';

interface LockIndicatorProps {
  /** Name/username of the lock owner */
  lockedByName: string;
  /** Lock note if provided */
  lockNote?: string;
  /** Size of the lock icon */
  size?: number;
  /** Visual variant: 'own' (black/white), 'shared' (black/white), 'other' (red shades) */
  variant?: 'own' | 'shared' | 'other';
  /** Background color of the tube cell - used to determine icon color for visibility */
  backgroundColor?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Lock indicator showing a tube is locked
 *
 * @example
 * ```tsx
 * // For tubes locked by others (red, dimmed cell)
 * {isLockedOutFrom(tube) && (
 *   <LockIndicator
 *     lockedByName={lockOwnerDisplay}
 *     lockNote={tube.lockNote}
 *     variant="other"
 *   />
 * )}
 *
 * // For tubes locked by others but shared with you (amber)
 * {hasSharedAccess(tube) && (
 *   <LockIndicator
 *     lockedByName={lockOwnerDisplay}
 *     lockNote={tube.lockNote}
 *     variant="shared"
 *   />
 * )}
 *
 * // For tubes locked by current user (black, no dimming)
 * {isLockedByCurrentUser(tube) && (
 *   <LockIndicator
 *     lockedByName="You"
 *     lockNote={tube.lockNote}
 *     variant="own"
 *   />
 * )}
 * ```
 */
export function LockIndicator({
  lockedByName,
  lockNote,
  size = 12,
  variant = 'other',
  backgroundColor,
  className = '',
}: LockIndicatorProps) {
  const tooltipText = lockNote
    ? `Locked by ${lockedByName}: "${lockNote}"`
    : `Locked by ${lockedByName}`;

  // Determine if background is dark (needs light icon) or light (needs dark icon)
  const needsLightIcon = backgroundColor
    ? getOptimalTextColor(backgroundColor).toLowerCase() === '#ffffff'
    : false;

  // Icon color based on variant and background luminance
  let iconColor: string;
  if (variant === 'other') {
    // Red for locked out - lighter red on dark backgrounds, darker red on light
    iconColor = needsLightIcon ? '#fca5a5' : '#ef4444'; // red-300 : red-500
  } else {
    // Own/shared - match text color (white on dark, dark gray on light)
    iconColor = needsLightIcon ? '#ffffff' : '#374151'; // white : gray-700
  }

  // Use ShieldCheck for shared access, Lock for own/other
  const IconComponent = variant === 'shared' ? ShieldCheck : Lock;

  return (
    <Tooltip content={tooltipText} side="top">
      <div className={`absolute bottom-0.5 left-0.5 ${className}`}>
        <IconComponent
          size={size}
          style={{ color: iconColor }}
          className="drop-shadow-sm"
          strokeWidth={2.5}
        />
      </div>
    </Tooltip>
  );
}
