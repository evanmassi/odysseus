import { Tooltip } from '@shared/ui';

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
  const initials = getInitials(username, firstName, lastName);

  // Generate display name for tooltip
  const displayName = getDisplayName(username, firstName, lastName);

  return (
    <Tooltip content={`${displayName} is online`} side="bottom">
      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ring-2 ring-white">
        {initials}
      </div>
    </Tooltip>
  );
}

/**
 * Generate initials from user info
 * Priority: firstName + lastName > username first 2 chars
 */
function getInitials(username: string, firstName?: string, lastName?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

/**
 * Generate display name for tooltip
 * Priority: "firstName lastName" > "firstName" > "username"
 */
function getDisplayName(username: string, firstName?: string, lastName?: string): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  return username;
}
