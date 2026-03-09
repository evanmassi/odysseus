/**
 * Date Picker
 *
 * Calendar-based date selector with portal dropdown and keyboard navigation.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

import { cva } from 'class-variance-authority';
import { Calendar, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { createPortal } from 'react-dom';

import type { DatePickerProps } from './types';

export type { DatePickerProps, DatePickerSize, DatePickerState } from './types';

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTH_ABBR[m - 1]} ${y}`;
}

function toDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const triggerVariants = cva(
  [
    'relative w-full cursor-pointer',
    'bg-card border rounded-lg',
    'transition-all duration-200',
    'flex items-center justify-between',
  ],
  {
    variants: {
      size: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
      isOpen: {
        true: 'ring-2 ring-ring border-ring',
        false: '',
      },
      state: {
        default: 'border-border hover:border-muted-foreground',
        error: 'border-2 border-danger-border',
        warning: 'border-2 border-warning-border',
        success: 'border-2 border-success-border',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      isOpen: false,
      state: 'default',
      disabled: false,
    },
  }
);

export const DatePicker: React.FC<DatePickerProps> = ({
  value = '',
  onChange,
  size = 'md',
  state = 'default',
  disabled = false,
  clearable = false,
  placeholder = 'Select date...',
  fullWidth = false,
  className,
  'aria-label': ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDate = toDate(value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
  }, [disabled, updatePosition]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      onChange?.(date ? fromDate(date) : '');
      setIsOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.('');
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isOpen) close();
        else open();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    },
    [isOpen, open, close]
  );

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const triggerClasses = triggerVariants({
    size,
    isOpen,
    state,
    disabled,
    className,
  });

  return (
    <div className={fullWidth ? 'relative w-full' : 'relative'}>
      <div
        ref={triggerRef}
        className={triggerClasses}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="datepicker-dialog"
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        tabIndex={disabled ? -1 : 0}
      >
        <span
          className={
            value ? 'text-foreground truncate' : 'text-muted-foreground opacity-40 truncate'
          }
        >
          {value ? formatForDisplay(value) : placeholder}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-accent rounded"
              aria-label="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {createPortal(
        <div
          ref={dropdownRef}
          id="datepicker-dialog"
          className={`fixed z-[9999] bg-card border border-border rounded-lg shadow-lg p-3 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          role="presentation"
          onMouseDown={e => e.stopPropagation()}
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate}
            classNames={{
              root: 'text-foreground',
              months: 'flex',
              month: 'space-y-3',
              month_caption: 'flex justify-center items-center h-8',
              caption_label: 'text-sm font-medium text-foreground',
              nav: 'flex items-center justify-between absolute inset-x-0 top-0 px-1 h-8',
              button_previous:
                'p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors',
              button_next:
                'p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors',
              month_grid: 'border-collapse',
              weekdays: '',
              weekday: 'text-muted-foreground text-xs font-medium w-8 h-8',
              weeks: '',
              week: '',
              day: 'text-center',
              day_button:
                'w-8 h-8 rounded text-sm transition-colors hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring',
              selected: 'bg-ring text-white hover:bg-ring',
              today: 'font-bold',
              outside: 'text-muted-foreground opacity-30',
              disabled: 'text-muted-foreground opacity-30 cursor-not-allowed',
              chevron: 'w-4 h-4',
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
