/**
 * UI Primitives
 *
 * Barrel export for all shared primitive components and their types.
 */

export { AlertBanner } from './banners/AlertBanner';
export type { AlertBannerProps, AlertBannerVariant } from './banners/types';

export { Button } from './button/Button';
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  ButtonShape,
  ButtonRef,
} from './button/types';

export { Checkbox } from './checkbox/Checkbox';
export type { CheckboxProps } from './checkbox/Checkbox';

export { Chip } from './chip/Chip';
export type {
  ChipProps,
  ChipColor,
  ChipSize,
  ChipShape,
  ChipBehavior,
  ChipRef,
} from './chip/types';

export { DatePicker } from './date-picker/DatePicker';
export type { DatePickerProps, DatePickerSize, DatePickerState } from './date-picker/types';

export { AuthInput, Input, NumberInput } from './input';
export type { AuthInputProps, AuthInputValidationState } from './input/AuthInput';
export type { NumberInputProps } from './input/NumberInput';
export type {
  InputProps,
  InputVariant,
  InputSize,
  InputState,
  InputType,
  ValidationResult,
  ValidationFunction,
  InputRef,
} from './input/types';

export { OverflowMenu } from './menus/OverflowMenu';
export type { OverflowMenuProps, OverflowMenuItem } from './menus/types';

export { ScrollArea } from './scroll-area/ScrollArea';
export type { ScrollAreaProps } from './scroll-area/ScrollArea';

export { Select } from './select/Select';
export type {
  SelectProps,
  SelectOption,
  SelectVariant,
  SelectSize,
  SelectState,
  SelectRef,
} from './select/types';

export { Table, TableHeader, TableBody } from './table/Table';
export type {
  TableProps,
  TableColumn,
  TableRow,
  TableRowBase,
  TableRef,
  TableVariant,
  TableSize,
  TableState,
  SortConfig,
  SortDirection,
  TablePagination,
} from './table/types';

export { Tabs, Tab } from './tabs/Tabs';
export type { TabsProps, TabProps, TabOrientation } from './tabs/Tabs';

export { Textarea } from './textarea/Textarea';
export type {
  TextareaProps,
  TextareaState,
  TextareaSize,
  TextareaResize,
} from './textarea/Textarea';

export { Toggle } from './toggle/Toggle';
export type { ToggleProps } from './toggle/Toggle';

export { Tooltip } from './tooltip/Tooltip';
export type { TooltipProps } from './tooltip/Tooltip';
