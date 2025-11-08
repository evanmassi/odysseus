/**
 * Button Component Types
 * 
 * Type definitions for the accessible Button primitive component
 * Includes all variants, sizes, and interactive states
 */

import type { ComponentProps, ReactNode } from 'react';

// Button variant types
export type ButtonVariant = 
  | 'primary'       // Primary action button (filled)
  | 'secondary'     // Secondary action button (outlined)
  | 'tertiary'      // Tertiary action button (ghost/text)
  | 'danger'        // Destructive action button
  | 'success'       // Success/confirmation button
  | 'warning'       // Warning action button
  | 'ghost';        // Minimal button (no border/background)

// Button size types
export type ButtonSize = 
  | 'xs'            // Extra small (24px height)
  | 'sm'            // Small (32px height)
  | 'md'            // Medium (40px height) - default
  | 'lg'            // Large (48px height)
  | 'xl';           // Extra large (56px height)

// Button shape types
export type ButtonShape = 
  | 'rounded'       // Standard rounded corners
  | 'pill'          // Fully rounded (pill-shaped)
  | 'square';       // Sharp corners

// Button loading state
export type ButtonLoadingState = {
  isLoading: boolean;
  loadingText?: string;
};

// Button icon configuration
export type ButtonIcon = {
  icon: ReactNode;
  position?: 'left' | 'right';
};

// Base button props (extends HTML button attributes)
export interface BaseButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  // Content
  children?: ReactNode;
  
  // Appearance
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  
  // State
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  
  // Icons
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: boolean; // For icon-only buttons
  
  // Layout
  fullWidth?: boolean;  // Stretch to full width
  
  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean;
  
  // Custom styling
  className?: string;
  
  // Event handlers
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// Button ref type
export type ButtonRef = HTMLButtonElement;

// Button component props (final interface)
export interface ButtonProps extends BaseButtonProps {
  // Additional props can be added here if needed
}

// Button group props for grouping buttons
export interface ButtonGroupProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

// Button dropdown props for dropdown buttons
export interface ButtonDropdownProps extends BaseButtonProps {
  isOpen?: boolean;
  onToggle?: () => void;
  dropdownContent?: ReactNode;
  placement?: 'bottom' | 'top' | 'left' | 'right';
}

// Toggle button props for toggle functionality
export interface ToggleButtonProps extends BaseButtonProps {
  isPressed?: boolean;
  onToggle?: (pressed: boolean) => void;
  'aria-pressed'?: boolean;
}

// Button with tooltip props
export interface ButtonWithTooltipProps extends BaseButtonProps {
  tooltip?: string;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

// Button style variants (for internal styling)
export interface ButtonStyleVariants {
  variant: Record<ButtonVariant, string>;
  size: Record<ButtonSize, string>;
  shape: Record<ButtonShape, string>;
}

// Button theme configuration
export interface ButtonTheme {
  // Base styles
  base: string;
  
  // Variant styles
  variants: ButtonStyleVariants['variant'];
  
  // Size styles  
  sizes: ButtonStyleVariants['size'];
  
  // Shape styles
  shapes: ButtonStyleVariants['shape'];
  
  // State styles
  states: {
    disabled: string;
    loading: string;
    focus: string;
    hover: string;
    active: string;
  };
  
  // Icon styles
  icons: {
    left: string;
    right: string;
    only: string;
    loading: string;
  };
}

// Default props
export const defaultButtonProps: Partial<ButtonProps> = {
  variant: 'primary',
  size: 'md',
  shape: 'rounded',
  type: 'button',
  disabled: false,
  isLoading: false,
  fullWidth: false,
  iconOnly: false,
};

// Type guards
export const isButtonVariant = (value: string): value is ButtonVariant => {
  return ['primary', 'secondary', 'tertiary', 'danger', 'success', 'warning', 'ghost'].includes(value);
};

export const isButtonSize = (value: string): value is ButtonSize => {
  return ['xs', 'sm', 'md', 'lg', 'xl'].includes(value);
};

export const isButtonShape = (value: string): value is ButtonShape => {
  return ['rounded', 'pill', 'square'].includes(value);
};
