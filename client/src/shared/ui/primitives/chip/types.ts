/**
 * Chip Component Types
 *
 * Type definitions for the Chip primitive.
 */

import type { HTMLAttributes, ReactNode } from 'react';

export type ChipBehavior = 'static' | 'selectable' | 'removable';

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
  /**
   * Lead-cell content — a count, short abbreviation, glyph, or any ReactNode.
   * `info` / `primary` / `default` / `outlined` tones require a lead;
   * `success` / `warning` / `danger` auto-fill a semantic glyph.
   */
  lead?: ReactNode;
  color?: ChipColor;
  size?: ChipSize;
  behavior?: ChipBehavior;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  /** @deprecated Use `lead`. Forwarded to the lead cell during the migration period. */
  leftIcon?: ReactNode;
  disabled?: boolean;
}

export type ChipRef = HTMLButtonElement | HTMLSpanElement;

export const defaultChipProps: Partial<ChipProps> = {
  color: 'default',
  size: 'sm',
  behavior: 'static',
  selected: false,
  disabled: false,
};
