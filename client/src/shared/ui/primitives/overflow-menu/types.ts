/**
 * OverflowMenu Types
 *
 * Type definitions for the OverflowMenu component
 */

import type { LucideIcon } from 'lucide-react';

export interface OverflowMenuItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface OverflowMenuProps {
  /** Array of menu items to display */
  items: OverflowMenuItem[];
  /** Labels of items that should have a divider before them */
  dividerBefore?: string[];
  /** Size of the trigger button */
  size?: 'sm' | 'md';
  /** Optional aria-label for the trigger button */
  'aria-label'?: string;
}
