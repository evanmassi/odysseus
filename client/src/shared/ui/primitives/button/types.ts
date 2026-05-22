/**
 * Button Component Types
 *
 * Type definitions for the Button primitive component.
 */

import type { ComponentProps, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'ghost'
  | 'ghost-danger'
  | 'cancel';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'xl';

export interface BaseButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: boolean;
  fullWidth?: boolean;
  /** Trailing chevron that slides 2px right on hover. Suppressed when `rightIcon` is provided. */
  tail?: boolean;
  /** Auth-modal register: uppercase, 0.32em tracking, 44h. Overrides `size`. */
  ceremonial?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export type ButtonRef = HTMLButtonElement;

export interface ButtonProps extends BaseButtonProps {}

export const defaultButtonProps: Partial<ButtonProps> = {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  isLoading: false,
  fullWidth: false,
  iconOnly: false,
  tail: false,
  ceremonial: false,
};
