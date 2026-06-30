/**
 * Button Component Types
 */

import type { ComponentProps, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'solid'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'ghost'
  | 'ghost-danger'
  | 'cancel';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'xl';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: boolean;
  fullWidth?: boolean;
  /** Trailing chevron that slides 2px right on hover. Suppressed when `rightIcon` is provided. */
  tail?: boolean;
  /** Auth-modal register: uppercase, 0.32em tracking, 44h. Overrides `size`. */
  ceremonial?: boolean;
}

export type ButtonRef = HTMLButtonElement;

export const defaultButtonProps = {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  isLoading: false,
  fullWidth: false,
  iconOnly: false,
  tail: false,
  ceremonial: false,
} satisfies Partial<ButtonProps>;
