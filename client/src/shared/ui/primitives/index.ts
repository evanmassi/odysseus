/**
 * UI Primitives Index
 *
 * Centralized export of all UI primitive components
 * These components form the foundation of the Odysseus component library
 */

// Import all components first
import { AlertBanner } from './alert-banner/AlertBanner';
import { Button } from './button/Button';
import { Checkbox } from './checkbox/Checkbox';
import { Chip } from './chip/Chip';
import { DatePicker } from './date-picker/DatePicker';
import { AuthInput } from './input/AuthInput';
import { Input } from './input/Input';
import { NumberInput } from './input/NumberInput';
import { OverflowMenu } from './overflow-menu/OverflowMenu';
import { ScrollArea } from './scroll-area/ScrollArea';
import { Select } from './select/Select';
import { Table, TableHeader, TableBody } from './table/Table';
import { Tabs, Tab } from './tabs/Tabs';
import { Textarea } from './textarea/Textarea';
import { Toggle } from './toggle/Toggle';
import { Tooltip } from './tooltip/Tooltip';

// AlertBanner primitives
export { AlertBanner };
export type { AlertBannerProps, AlertBannerVariant } from './alert-banner/types';

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

// Chip primitives
export { Chip };
export type {
  ChipProps,
  ChipColor,
  ChipSize,
  ChipShape,
  ChipBehavior,
  ChipRef,
} from './chip/types';

// DatePicker primitives
export { DatePicker };
export type { DatePickerProps, DatePickerSize, DatePickerState } from './date-picker/types';

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

// OverflowMenu primitives
export { OverflowMenu };
export type { OverflowMenuProps, OverflowMenuItem } from './overflow-menu/types';

// ScrollArea primitives
export { ScrollArea };
export type { ScrollAreaProps } from './scroll-area/ScrollArea';

// Tabs primitives
export { Tabs, Tab };
export type { TabsProps, TabProps, TabOrientation } from './tabs/Tabs';
