/**
 * Lock Indicator Component
 *
 * Visual indicator for locked tubes showing:
 * - Black lock icon for tubes locked by current user (own locks)
 * - Amber lock icon for tubes locked by others but shared with you
 * - Red lock icon for tubes locked by others (locked out)
 * - Tooltip with lock owner information
 *
 * Position: Bottom-left corner of tube grid cell
 */

import { Lock, ShieldCheck } from 'lucide-react';

interface LockIndicatorProps {
  /** Name/username of the lock owner */
  lockedByName: string;
  /** Lock note if provided */
  lockNote?: string;
  /** Size of the lock icon */
  size?: number;
  /** Visual variant: 'own' (black), 'shared' (amber), 'other' (red) */
  variant?: 'own' | 'shared' | 'other';
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
  className = '',
}: LockIndicatorProps) {
  const tooltipText = lockNote
    ? `Locked by ${lockedByName}: "${lockNote}"`
    : `Locked by ${lockedByName}`;

  const iconColor =
    variant === 'own' ? 'text-gray-700' : variant === 'shared' ? 'text-gray-700' : 'text-red-500';

  // Use ShieldCheck for shared access, Lock for own/other
  const IconComponent = variant === 'shared' ? ShieldCheck : Lock;

  return (
    <div className={`absolute bottom-0.5 left-0.5 ${className}`} title={tooltipText}>
      <IconComponent size={size} className={`${iconColor} drop-shadow-sm`} strokeWidth={2.5} />
    </div>
  );
}
