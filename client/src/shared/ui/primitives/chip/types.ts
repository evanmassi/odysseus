/**
 * Chip Component Types
 *
 * Type definitions for the Chip primitive.
 */

import type { HTMLAttributes, ReactNode } from 'react';

export type ChipBehavior = 'static' | 'selectable' | 'removable';

export type ChipColor =
  | 'default'
  | 'primary'
  | 'active'
  | 'inverted'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type ChipSize = 'xs' | 'sm' | 'md';

export type ChipShape = 'rounded' | 'pill';

export interface ChipProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
  children: ReactNode;
  color?: ChipColor;
  size?: ChipSize;
  shape?: ChipShape;
  behavior?: ChipBehavior;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  leftIcon?: ReactNode;
  disabled?: boolean;
  count?: number;
}

export type ChipRef = HTMLButtonElement | HTMLSpanElement;

export const defaultChipProps: Partial<ChipProps> = {
  color: 'default',
  size: 'sm',
  shape: 'rounded',
  behavior: 'static',
  selected: false,
  disabled: false,
};
