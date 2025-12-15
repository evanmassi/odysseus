/**
 * UI Primitives Index
 *
 * Centralized export of all UI primitive components
 * These components form the foundation of the Odysseus component library
 */

// Import all components first
import { Button } from './button/Button';
import { Grid, GridItem } from './grid/Grid';
import { Input } from './input/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './modal/Modal';
import { useModal, useModalState } from './modal/useModal';
import { Select } from './select/Select';
import { Table, TableHeader, TableBody } from './table/Table';
import { Tooltip } from './tooltip/Tooltip';

// Button primitives
export { Button };
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  ButtonShape,
  ButtonRef,
} from './button/types';

// Input primitives
export { Input };
export type {
  InputProps,
  TextInputProps,
  NumberInputProps,
  SearchInputProps,
  DateInputProps,
  PasswordInputProps,
  InputVariant,
  InputSize,
  InputState,
  InputType,
  ValidationResult,
  ValidationFunction,
  InputRef,
} from './input/types';

// Modal primitives
export { Modal, ModalHeader, ModalBody, ModalFooter };
export { useModal, useModalState };
export type {
  ModalProps,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  ModalSize,
  ModalVariant,
  ModalPlacement,
  ModalAnimation,
  ModalBackdrop,
  ConfirmationModalProps,
  AlertModalProps,
  DrawerModalProps,
  ModalRef,
} from './modal/types';

// Select primitives
export { Select };
export type { SelectProps, SelectOption } from './select/Select';

// Table primitives
export { Table, TableHeader, TableBody };
export type { TableProps, TableColumn, TableRow, SortConfig } from './table/Table';

// Tooltip primitives
export { Tooltip };
export type { TooltipProps } from './tooltip/Tooltip';

// Grid primitives
export { Grid, GridItem };
export type { GridProps, GridItemProps } from './grid/Grid';

// Re-export design system tokens for convenience
export {
  colors,
  typography,
  spacingSystem as spacing,
  borders,
  shadows,
  odysseusTheme as theme,
  breakpoints,
  zIndex,
  animations,
} from '../designSystem/tokens';

// Common types used across primitives
export interface CommonProps {
  className?: string;
  children?: React.ReactNode;
}

export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  role?: string;
  tabIndex?: number;
}

export interface ResponsiveProps {
  responsive?: boolean;
}

export interface LoadingProps {
  isLoading?: boolean;
  loadingText?: string;
}

export interface DisabledProps {
  isDisabled?: boolean;
  disabled?: boolean;
}

// Component size union type (used across multiple components)
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Component variant union type (common variants)
export type ComponentVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'danger'
  | 'success'
  | 'warning';

// Alignment types
export type Alignment = 'start' | 'center' | 'end' | 'stretch';
export type JustifyContent = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

// Spacing types (using design system values)
export type SpacingSize = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// State types
export type ComponentState = 'default' | 'hover' | 'active' | 'focus' | 'disabled';
export type ValidationState = 'default' | 'error' | 'warning' | 'success';

// Event handler types
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void;
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
export type FocusHandler<T = HTMLElement> = (event: React.FocusEvent<T>) => void;
export type KeyboardHandler<T = HTMLElement> = (event: React.KeyboardEvent<T>) => void;

// Polymorphic component props
export interface PolymorphicProps<T extends keyof JSX.IntrinsicElements = 'div'> {
  as?: T;
}

// Ref types
export type ElementRef<T extends keyof JSX.IntrinsicElements> = React.ComponentRef<T>;

// Forwarded ref types
export type ForwardedRef<T> =
  | ((instance: T | null) => void)
  | React.MutableRefObject<T | null>
  | null;

// Primitive component collection for easy importing
export const Primitives = {
  Button,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  Table,
  TableHeader,
  TableBody,
  Grid,
  GridItem,
  Tooltip,
} as const;

// Hook collection
export const Hooks = {
  useModal,
  useModalState,
} as const;

// Type collection for external use
export type PrimitiveComponents = typeof Primitives;
export type PrimitiveHooks = typeof Hooks;
