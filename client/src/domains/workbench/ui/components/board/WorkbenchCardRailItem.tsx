import { useMenuItemHover } from '@shared/ui';

import type { LucideIcon } from 'lucide-react';

interface WorkbenchCardRailItemProps {
  icon: LucideIcon;
  label: string;
  hint: string;
  isDisabled?: boolean;
  isExpanded?: boolean;
  isMenuItem?: boolean;
  onPick: (item: HTMLButtonElement) => void;
}

export function WorkbenchCardRailItem({
  icon: Icon,
  label,
  hint,
  isDisabled = false,
  isExpanded,
  isMenuItem = false,
  onPick,
}: WorkbenchCardRailItemProps) {
  const menuHover = useMenuItemHover();
  return (
    <button
      type="button"
      role={isMenuItem ? 'menuitem' : undefined}
      disabled={isDisabled}
      aria-expanded={isExpanded}
      onMouseDown={isMenuItem ? event => event.preventDefault() : undefined}
      onClick={event => onPick(event.currentTarget)}
      className={`flex w-full items-start gap-2.5 px-2 py-1.5 text-left transition-[color,background-color,transform] active:translate-y-px disabled:cursor-default disabled:opacity-50 ${isDisabled ? '' : menuHover}`}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 flex-none text-primary" />
      <span className="min-w-0">
        <span className="block text-body-sm text-foreground">{label}</span>
        <span className="block text-label-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
