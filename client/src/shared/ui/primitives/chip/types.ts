/**
 * Chip Component Types
 */

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
  /**
   * Lead-cell content (count, abbreviation, or glyph). `success` / `warning` / `danger`
   * auto-fill a semantic glyph; other tones fall back to a neutral square if omitted.
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
  /** Render the label as a legible number (tabular, larger) — the standard for counts. */
  numeric?: boolean;
  /** Applies the lit edge + wash to neutral (`default`/`outlined`) tones. Semantic tones are always lit. */
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
