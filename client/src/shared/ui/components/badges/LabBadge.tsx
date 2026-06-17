/**
 * Lab Badge
 *
 * Square initial chip with a unique color derived from the lab ID.
 */

import { Badge, Tooltip } from '@shared/ui';

interface LabBadgeProps {
  labId: string;
  labName: string;
  size?: 'sm' | 'md' | 'lg';
  isDemo?: boolean;
  isActive?: boolean;
}

const BADGE_COLORS = [
  'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  'bg-violet-500/20 text-violet-700 dark:text-violet-300',
  'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  'bg-rose-500/20 text-rose-700 dark:text-rose-300',
  'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
  'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
];

const DEMO_COLOR = 'bg-demo-bg/20 text-demo-text';

function hashToIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % BADGE_COLORS.length;
}

export function getLabBadgeTextClasses(labId: string, isDemo?: boolean): string {
  const fullClass = isDemo ? DEMO_COLOR : BADGE_COLORS[hashToIndex(labId)];
  return fullClass
    .split(' ')
    .filter(c => c.includes('text-'))
    .join(' ');
}

function getLabInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function LabBadge({ labId, labName, size = 'sm', isDemo, isActive }: LabBadgeProps) {
  const color = isDemo ? DEMO_COLOR : BADGE_COLORS[hashToIndex(labId)];
  const initials = getLabInitials(labName);

  return (
    <Tooltip content={labName} side="bottom">
      <Badge size={size} className={color} lit={isActive}>
        <span className="text-foreground">{initials}</span>
      </Badge>
    </Tooltip>
  );
}
