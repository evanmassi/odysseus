/**
 * Chip Component Types
 *
 * Type definitions for the Chip primitive supporting static, selectable, and removable behaviors.
 */

import type { ReactNode } from 'react';

export type ChipBehavior = 'static' | 'selectable' | 'removable';

export type ChipColor =
  | 'default'
  | 'primary'
  | 'active'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'entity';

export type ChipSize = 'xs' | 'sm' | 'md';

export type ChipShape = 'rounded' | 'pill';

export type ChipEntityType = 'storage' | 'sample' | 'user' | 'researcher';

export interface ChipProps {
  children: ReactNode;
  color?: ChipColor;
  size?: ChipSize;
  shape?: ChipShape;
  behavior?: ChipBehavior;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  leftIcon?: ReactNode;
  entityType?: ChipEntityType;
  disabled?: boolean;
  count?: number;
  'aria-label'?: string;
  className?: string;
}

export type ChipRef = HTMLButtonElement | HTMLSpanElement;

export const defaultChipProps: Partial<ChipProps> = {
  color: 'default',
  size: 'sm',
  shape: 'pill',
  behavior: 'static',
  selected: false,
  disabled: false,
};

export const isChipColor = (value: string): value is ChipColor => {
  return [
    'default',
    'primary',
    'active',
    'success',
    'warning',
    'danger',
    'info',
    'entity',
  ].includes(value);
};

export const isChipSize = (value: string): value is ChipSize => {
  return ['xs', 'sm', 'md'].includes(value);
};

export const isChipShape = (value: string): value is ChipShape => {
  return ['rounded', 'pill'].includes(value);
};

export const isChipBehavior = (value: string): value is ChipBehavior => {
  return ['static', 'selectable', 'removable'].includes(value);
};
