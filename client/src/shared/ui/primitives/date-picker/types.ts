/**
 * Date Picker Types
 */

type DatePickerSize = 'xs' | 'sm' | 'md' | 'lg';

type DatePickerState = 'default' | 'error' | 'warning' | 'success';

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  size?: DatePickerSize;
  state?: DatePickerState;
  disabled?: boolean;
  clearable?: boolean;
  placeholder?: string;
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
}
