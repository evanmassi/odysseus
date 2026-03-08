import { Tooltip } from '@shared/ui';
import { getUserInitials, getUserDisplayName } from '@shared/utils/userDisplayFormatters';

interface UserPresenceBadgeProps {
  username: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Single user presence badge
 * Displays user initials in a green circular badge with tooltip showing full name
 */
export function UserPresenceBadge({ username, firstName, lastName }: UserPresenceBadgeProps) {
  // Generate initials: prefer first/last name, fall back to username
  const initials = getUserInitials(username, firstName, lastName);

  // Generate display name for tooltip
  const displayName = getUserDisplayName(username, firstName, lastName);

  return (
    <Tooltip content={`${displayName} is online`} side="bottom">
      <div className="w-6 h-6 rounded-full bg-success-bg flex items-center justify-center text-[10px] font-bold text-success-btnText flex-shrink-0 ring-2 ring-card">
        {initials}
      </div>
    </Tooltip>
  );
}
