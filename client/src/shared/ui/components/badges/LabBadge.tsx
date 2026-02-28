/**
 * Lab Badge
 *
 * Circular avatar with lab initials and a unique color derived from the lab ID.
 */

import { Tooltip } from '@shared/ui';

interface LabBadgeProps {
  labId: string;
  labName: string;
  size?: 'sm' | 'md';
  isDemo?: boolean;
}

const BADGE_COLORS = [
  { bg: 'bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300' },
];

function hashToIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % BADGE_COLORS.length;
}

function getLabInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const sizeClasses = {
  sm: { badge: 'w-5 h-5', text: 'text-[9px]' },
  md: { badge: 'w-6 h-6', text: 'text-xs' },
};

const DEMO_COLOR = { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-700 dark:text-fuchsia-300' };

export function LabBadge({ labId, labName, size = 'sm', isDemo }: LabBadgeProps) {
  const color = isDemo ? DEMO_COLOR : BADGE_COLORS[hashToIndex(labId)];
  const initials = getLabInitials(labName);
  const { badge, text } = sizeClasses[size];

  return (
    <Tooltip content={labName} side="bottom">
      <div
        className={`${badge} ${color.bg} ${color.text} rounded-full flex items-center justify-center ${text} font-bold flex-shrink-0`}
      >
        {initials}
      </div>
    </Tooltip>
  );
}
