/**
 * User Presence Badge
 *
 * Green circular avatar indicating a user is currently online.
 */

import { Tooltip } from '@shared/ui';
import { getUserInitials, getUserDisplayName } from '@shared/utils/userDisplayFormatters';

interface UserPresenceBadgeProps {
  username: string;
  firstName?: string;
  lastName?: string;
}

export function UserPresenceBadge({ username, firstName, lastName }: UserPresenceBadgeProps) {
  const initials = getUserInitials(username, firstName, lastName);
  const displayName = getUserDisplayName(username, firstName, lastName);

  return (
    <Tooltip content={`${displayName} is online`} side="bottom">
      <div className="w-6 h-6 rounded-full bg-success-bg flex items-center justify-center text-[10px] font-bold text-success-btnText flex-shrink-0 ring-2 ring-card">
        {initials}
      </div>
    </Tooltip>
  );
}
