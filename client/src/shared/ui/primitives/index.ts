/**
 * UI Primitives Index
 *
 * Centralized export of all UI primitive components
 * These components form the foundation of the Odysseus component library
 */

// Import all components first
import { Button } from './button/Button';
import { Checkbox } from './checkbox/Checkbox';
import { Grid, GridItem } from './grid/Grid';
import { AuthInput } from './input/AuthInput';
import { Input } from './input/Input';
import { NumberInput } from './input/NumberInput';
import { Select } from './select/Select';
import { Table, TableHeader, TableBody } from './table/Table';
import { Tabs, Tab } from './tabs/Tabs';
import { Textarea } from './textarea/Textarea';
import { Toggle } from './toggle/Toggle';
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

// Checkbox primitives
export { Checkbox };
export type { CheckboxProps } from './checkbox/Checkbox';

// Toggle primitives
export { Toggle };
export type { ToggleProps } from './toggle/Toggle';

// Input primitives
export { AuthInput, Input, NumberInput };
export type { AuthInputProps, AuthInputValidationState } from './input/AuthInput';
export type { NumberInputProps } from './input/NumberInput';
export type {
  InputProps,
  TextInputProps,
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

// Select primitives
export { Select };
export type {
  SelectProps,
  SelectOption,
  SelectVariant,
  SelectSize,
  SelectState,
  SelectRef,
} from './select/types';

// Table primitives
export { Table, TableHeader, TableBody };
export type {
  TableProps,
  TableColumn,
  TableRow,
  TableRef,
  TableVariant,
  TableSize,
  TableState,
  SortConfig,
  SortDirection,
  TablePagination,
} from './table/types';

// Textarea primitives
export { Textarea };
export type {
  TextareaProps,
  TextareaState,
  TextareaSize,
  TextareaResize,
} from './textarea/Textarea';

// Tooltip primitives
export { Tooltip };
export type { TooltipProps } from './tooltip/Tooltip';

// Tabs primitives
export { Tabs, Tab };
export type { TabsProps, TabProps, TabOrientation } from './tabs/Tabs';

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
  AuthInput,
  Button,
  Checkbox,
  Input,
  NumberInput,
  Select,
  Table,
  TableHeader,
  TableBody,
  Tabs,
  Tab,
  Textarea,
  Toggle,
  Grid,
  GridItem,
  Tooltip,
} as const;

// Type collection for external use
export type PrimitiveComponents = typeof Primitives;
