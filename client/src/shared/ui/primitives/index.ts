/**
 * UI Primitives
 *
 * Barrel export for all shared primitive components and their types.
 */

export { Autocomplete } from './autocomplete/Autocomplete';
export type { AutocompleteProps, AutocompleteOption, AutocompleteRef } from './autocomplete/types';

export { AlertBanner } from './banners/AlertBanner';
export type { AlertBannerProps, AlertBannerVariant } from './banners/types';

export { Badge } from './badge/Badge';
export type { BadgeProps } from './badge/Badge';

export { Button } from './button/Button';
export type { ButtonProps, ButtonVariant, ButtonSize, ButtonRef } from './button/types';

export { Checkbox } from './checkbox/Checkbox';
export type { CheckboxProps } from './checkbox/Checkbox';

export { Chip } from './chip/Chip';
export type { ChipProps, ChipColor, ChipSize, ChipBehavior, ChipRef } from './chip/types';

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

export { DropdownMenu } from './menus/DropdownMenu';
export type { DropdownMenuProps } from './menus/DropdownMenu';
export { MenuItem } from './menus/MenuItem';
export { MenuDivider } from './menus/MenuDivider';
export { OverflowMenu } from './menus/OverflowMenu';
export type {
  MenuItemProps,
  MenuIconComponent,
  OverflowMenuProps,
  OverflowMenuItem,
} from './menus/types';

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

export { Panel, PanelEdgeLabel } from './panel/Panel';
export type { PanelProps, PanelEdgeLabelProps } from './panel/Panel';

export { Table } from './table/Table';
export type {
  TableProps,
  TableColumn,
  TableRowBase,
  TableRef,
  TableDensity,
  SortConfig,
  SortDirection,
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
