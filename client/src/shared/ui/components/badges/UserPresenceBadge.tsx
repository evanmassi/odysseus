/**
 * User Presence Badge
 *
 * Square chip indicating a user is currently online — ring offset keeps the
 * badge legible when stacked in OnlineUsersBadgeList.
 */

import { Badge, Tooltip } from '@shared/ui';
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
      <Badge size="md" className="bg-success-bg text-success-btnText ring-2 ring-card">
        {initials}
      </Badge>
    </Tooltip>
  );
}
