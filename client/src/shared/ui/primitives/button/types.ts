import type { ComponentProps, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'solid'
  | 'secondary'
  | 'danger'
  | 'warning'
  | 'ghost'
  | 'ghost-danger'
  | 'ghost-primary'
  | 'cancel';

export type ButtonSize = 'xs' | 'sm' | 'md';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: boolean;
  fullWidth?: boolean;
  tail?: boolean;
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
