/**
 * User Presence Badge
 *
 * Square chip indicating a user is currently online — ring offset keeps the
 * badge legible when stacked in OnlineUsersBadgeList.
 */

import { getPersonInitials, getPersonDisplayName } from '@odysseus/shared-schemas';

import { Badge, Tooltip } from '@shared/ui';

interface UserPresenceBadgeProps {
  username: string;
  firstName?: string;
  lastName?: string;
}

export function UserPresenceBadge({ username, firstName, lastName }: UserPresenceBadgeProps) {
  const initials = getPersonInitials({ username, firstName, lastName });
  const displayName = getPersonDisplayName({ username, firstName, lastName });

  return (
    <Tooltip content={`${displayName} is online`} side="bottom">
      <Badge size="md" className="bg-success-bg text-success-btnText ring-2 ring-card">
        {initials}
      </Badge>
    </Tooltip>
  );
}
