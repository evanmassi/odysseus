/**
 * Lock Indicator Component
 *
 * Visual indicator for locked tubes showing:
 * - Red lock icon for tubes locked by others (locked out)
 * - Tooltip with lock owner information
 *
 * Position: Bottom-left corner of tube grid cell
 */

import { Lock } from 'lucide-react';

interface LockIndicatorProps {
  /** Name/username of the lock owner */
  lockedByName: string;
  /** Lock note if provided */
  lockNote?: string;
  /** Size of the lock icon */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Lock indicator showing a tube is locked by another user
 *
 * @example
 * ```tsx
 * {isLockedOutFrom(tube) && (
 *   <LockIndicator
 *     lockedByName={lockOwnerDisplay}
 *     lockNote={tube.lockNote}
 *   />
 * )}
 * ```
 */
export function LockIndicator({
  lockedByName,
  lockNote,
  size = 12,
  className = '',
}: LockIndicatorProps) {
  const tooltipText = lockNote
    ? `Locked by ${lockedByName}: "${lockNote}"`
    : `Locked by ${lockedByName}`;

  return (
    <div className={`absolute bottom-0.5 left-0.5 ${className}`} title={tooltipText}>
      <Lock size={size} className="text-red-500 drop-shadow-sm" strokeWidth={2.5} />
    </div>
  );
}
