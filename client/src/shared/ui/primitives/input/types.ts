/**
 * Input Component Types
 */

import type { ComponentProps } from 'react';

export type InputSize = 'xs' | 'sm' | 'md';

export type InputState = 'default' | 'error' | 'warning' | 'success';

type InputType = 'text' | 'number';

export interface InputProps extends Omit<ComponentProps<'input'>, 'size'> {
  size?: InputSize;
  state?: InputState;
  type?: InputType;
  fullWidth?: boolean;
  inputClassName?: string;
  onValueChange?: (value: string) => void;
}

export type InputRef = HTMLInputElement;

export const defaultInputProps = {
  type: 'text',
  size: 'md',
  state: 'default',
  fullWidth: false,
} satisfies Partial<InputProps>;
