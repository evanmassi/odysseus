import type { HTMLAttributes, ReactNode } from 'react';

type ChipBehavior = 'static' | 'selectable' | 'removable' | 'action';

export type ChipColor =
  | 'default'
  | 'outlined'
  | 'primary'
  | 'active'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type ChipSize = 'xs' | 'sm';

export interface ChipProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
  children: ReactNode;
  lead?: ReactNode;
  color?: ChipColor;
  size?: ChipSize;
  behavior?: ChipBehavior;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  labelClassName?: string;
  numeric?: boolean;
  lit?: boolean;
  disabled?: boolean;
}

export type ChipRef = HTMLButtonElement | HTMLSpanElement;

export const defaultChipProps = {
  color: 'default',
  size: 'sm',
  behavior: 'static',
  selected: false,
  disabled: false,
  lit: false,
} satisfies Partial<ChipProps>;
