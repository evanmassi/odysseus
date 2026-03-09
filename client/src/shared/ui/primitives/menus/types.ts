/**
 * Overflow Menu Types
 *
 * Type definitions for the overflow menu component.
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
  items: OverflowMenuItem[];
  /** Labels of items that should have a divider rendered before them */
  dividerBefore?: string[];
  /** Controls the trigger button size */
  size?: 'sm' | 'md';
  'aria-label'?: string;
}
