/**
 * Chip Component Types
 *
 * Type definitions for the Chip primitive.
 */

import type { HTMLAttributes, ReactNode } from 'react';

export type ChipBehavior = 'static' | 'selectable' | 'removable' | 'action';

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
  /** Fires when `behavior === 'action'`. The chip renders as a `<button>`. */
  onClick?: () => void;
  /** Override classes applied to the label cell. Use to opt out of uppercase/tracking on free-text content. */
  labelClassName?: string;
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
