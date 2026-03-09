/**
 * Button Component Types
 *
 * Type definitions for the accessible Button primitive component
 * Includes all variants, sizes, and interactive states
 */

import type { ComponentProps, ReactNode } from 'react';

// Button variant types
export type ButtonVariant =
  | 'primary' // Primary action button (filled)
  | 'secondary' // Secondary action button (outlined)
  | 'tertiary' // Tertiary action button (ghost/text)
  | 'danger' // Destructive action button
  | 'success' // Success/confirmation button
  | 'warning' // Warning action button
  | 'info' // Informational action button
  | 'ghost' // Minimal button (no border/background)
  | 'ghost-danger' // Ghost button with danger styling (for toolbar delete actions)
  | 'ghost-warning' // Ghost button with warning styling (for toolbar warning actions)
  | 'cancel' // Cancel/dismiss button
  | 'clear'; // Clear/reset action button

// Button size types
export type ButtonSize =
  | 'xs' // Extra small (24px height)
  | 'sm' // Small (32px height)
  | 'md' // Medium (40px height) - default
  | 'lg' // Large (48px height)
  | 'xl'; // Extra large (56px height)

// Button shape types
export type ButtonShape =
  | 'rounded' // Standard rounded corners
  | 'pill' // Fully rounded (pill-shaped)
  | 'square'; // Sharp corners

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
  fullWidth?: boolean; // Stretch to full width

  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';

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
