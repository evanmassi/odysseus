/**
 * Menu Types
 */

import type { LucideIcon } from 'lucide-react';

export type MenuIconComponent =
  | LucideIcon
  | React.ComponentType<{ size?: number; className?: string }>;

export interface MenuItemProps {
  icon?: MenuIconComponent;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  warning?: boolean;
  disabled?: boolean;
  shortcut?: string;
  children?: React.ReactNode;
}

export interface OverflowMenuItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  warning?: boolean;
  disabled?: boolean;
}

export interface OverflowMenuProps {
  items: OverflowMenuItem[];
  /** Labels of items that should have a divider rendered before them */
  dividerBefore?: string[];
  /** Controls the trigger button size */
  size?: 'sm' | 'md';
  'aria-label'?: string;
}
