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

export { Kbd } from './kbd/Kbd';
export type { KbdProps } from './kbd/Kbd';

export { AuthInput, Input, NumberInput } from './input';
export type { AuthInputProps, AuthInputValidationState } from './input/AuthInput';
export type { NumberInputProps } from './input/NumberInput';
export type {
  InputProps,
  InputSize,
  InputState,
  InputType,
  ValidationResult,
  ValidationFunction,
  InputRef,
} from './input/types';

export { IdStamp } from './titles/id-stamp/IdStamp';
export type { IdStampProps } from './titles/id-stamp/IdStamp';

export { ConsolePanel } from './console-panel/ConsolePanel';
export type { ConsolePanelProps } from './console-panel/ConsolePanel';

export { CrtBackdrop } from './crt-backdrop/CrtBackdrop';
export type {
  CrtBackdropProps,
  CrtBackdropSize,
  CrtBackdropLighting,
} from './crt-backdrop/CrtBackdrop';

export { DropdownMenu } from './menus/DropdownMenu';
export type { DropdownMenuProps, DropdownMotion } from './menus/DropdownMenu';
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

export { SearchInput } from './search-input/SearchInput';
export type { SearchInputProps } from './search-input/SearchInput';

export { Select } from './select/Select';
export type { SelectProps, SelectOption, SelectSize, SelectState, SelectRef } from './select/types';

export { NubDivider } from './nub-divider/NubDivider';
export type { NubDividerProps, NubDividerTone } from './nub-divider/NubDivider';

export { Panel } from './panel/Panel';
export type { PanelProps } from './panel/Panel';

export { PanelEmptyState } from './panel-empty-state/PanelEmptyState';
export type { PanelEmptyStateProps } from './panel-empty-state/PanelEmptyState';

export { PanelHeader } from './titles/panel-header/PanelHeader';
export type { PanelHeaderProps } from './titles/panel-header/PanelHeader';

export { SectionHeader } from './titles/section-header/SectionHeader';
export type { SectionHeaderProps } from './titles/section-header/SectionHeader';

export { SectionToolbar } from './titles/section-toolbar/SectionToolbar';
export type { SectionToolbarProps } from './titles/section-toolbar/SectionToolbar';

export { SubsectionHeader } from './titles/subsection-header/SubsectionHeader';
export type { SubsectionHeaderProps } from './titles/subsection-header/SubsectionHeader';

export { Subsection, SettingsRow, SettingsRowGroup } from './settings-row/SettingsRow';
export type {
  SubsectionProps,
  SettingsRowProps,
  SettingsRowGroupProps,
} from './settings-row/SettingsRow';

export { StatCell } from './stat-cell/StatCell';
export type { StatCellProps } from './stat-cell/StatCell';

export { Table } from './table/Table';
export type {
  TableProps,
  TableColumn,
  TableRowBase,
  TableRef,
  TableDensity,
  RowState,
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

export { UnsavedChangesIndicator } from './unsaved-changes-indicator/UnsavedChangesIndicator';
export type { UnsavedChangesIndicatorProps } from './unsaved-changes-indicator/UnsavedChangesIndicator';

export { Tooltip } from './tooltip/Tooltip';
export type { TooltipProps } from './tooltip/Tooltip';
