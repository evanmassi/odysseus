/**
 * Date Picker
 *
 * Calendar-based date selector with segmented keyboard input (MM/DD/YYYY),
 * portal dropdown, and keyboard navigation.
 */

import React, { useState, useRef, useCallback, useEffect, useId, useMemo } from 'react';

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

type Segment = 'month' | 'day' | 'year';
const SEGMENT_ORDER: Segment[] = ['month', 'day', 'year'];

const TRIGGER_FOCUS_SHADOW = 'shadow-[var(--input-focus-shadow)]';
const POPUP_SHADOW = 'shadow-[var(--popup-shadow)]';

const ICON_BUTTON =
  'p-0.5 text-secondary-foreground transition-colors hover:text-foreground dark:hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)] focus:outline-none focus-visible:text-foreground dark:focus-visible:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]';

const NAV_BUTTON =
  'p-1 text-primary/80 transition-colors hover:text-primary dark:hover:[filter:drop-shadow(0_0_4px_hsl(var(--primary)/0.55))] focus:outline-none focus-visible:text-primary dark:focus-visible:[filter:drop-shadow(0_0_4px_hsl(var(--primary)/0.55))]';

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

function parseSegments(dateStr: string): { month: string; day: string; year: string } {
  if (!dateStr) return { month: '', day: '', year: '' };
  const [y, m, d] = dateStr.split('-');
  return { month: m, day: d, year: y };
}

function shouldAutoAdvance(segment: Segment, rawValue: string): boolean {
  if (segment === 'year') return rawValue.length >= 4;
  if (rawValue.length >= 2) return true;
  if (rawValue.length !== 1) return false;

  const digit = parseInt(rawValue, 10);
  // 2-9 can only be 02-09 for month; 4-9 can only be 04-09 for day
  if (segment === 'month') return digit >= 2;
  if (segment === 'day') return digit >= 4;
  return false;
}

function padSegmentForAdvance(segment: Segment, rawValue: string): string {
  if (segment === 'year') return rawValue;
  if (rawValue.length === 1) return '0' + rawValue;
  return rawValue;
}

const triggerVariants = cva(
  [
    'relative w-full',
    'bg-[hsl(var(--input-well))] border',
    'flex items-center justify-between',
    'font-mono tracking-[0.04em]',
    'transition-[border-color,background,box-shadow] duration-200',
    'focus-visible:outline-none focus-visible:border-primary/70',
  ],
  {
    variants: {
      size: {
        xs: 'h-7 px-2 text-data-sm',
        sm: 'h-8 px-3 text-data',
        md: 'h-9 px-3 text-data',
        lg: 'h-12 px-4 text-data-lg',
      },
      focused: {
        true: `bg-primary/[0.04] ${TRIGGER_FOCUS_SHADOW}`,
        false: '',
      },
      state: {
        default: 'border-line-faint',
        error: 'border-danger-border',
        warning: 'border-warning-border',
        success: 'border-success-border',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: '',
      },
    },
    compoundVariants: [
      // Primary edge only when no state override; hover lift only when idle.
      { focused: true, state: 'default', class: 'border-primary/70' },
      {
        focused: false,
        state: 'default',
        disabled: false,
        class: 'hover:border-foreground/30',
      },
    ],
    defaultVariants: {
      size: 'md',
      focused: false,
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
  placeholder,
  fullWidth = false,
  className,
  'aria-label': ariaLabel,
}) => {
  const componentId = useId();
  const dialogId = `${componentId}-dialog`;

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [segments, setSegments] = useState({ month: '', day: '', year: '' });
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLSpanElement>(null);
  const dayRef = useRef<HTMLSpanElement>(null);
  const yearRef = useRef<HTMLSpanElement>(null);
  const justCommittedRef = useRef(false);

  const segmentRefs = useMemo(() => ({ month: monthRef, day: dayRef, year: yearRef }), []);

  const selectedDate = toDate(value);
  const isFocused = isEditing || isOpen;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom + 4, left: rect.left });
  }, []);

  const openCalendar = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
  }, [disabled, updatePosition]);

  const close = useCallback(() => setIsOpen(false), []);

  const commitSegments = useCallback(
    (segs: { month: string; day: string; year: string }) => {
      let m = parseInt(segs.month, 10);
      let d = parseInt(segs.day, 10);
      const y = parseInt(segs.year, 10);

      if (m && d && y) {
        m = Math.min(Math.max(m, 1), 12);
        const maxDay = new Date(y, m, 0).getDate();
        d = Math.min(Math.max(d, 1), maxDay);

        justCommittedRef.current = true;
        onChange?.(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
      setIsEditing(false);
      setActiveSegment(null);
    },
    [onChange]
  );

  const startEditing = useCallback(
    (segment: Segment = 'month') => {
      if (disabled) return;
      setSegments(parseSegments(value));
      setIsEditing(true);
      setActiveSegment(segment);
    },
    [disabled, value]
  );

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      onChange?.(date ? fromDate(date) : '');
      setIsOpen(false);
      setIsEditing(false);
      setActiveSegment(null);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.('');
      setIsEditing(false);
      setActiveSegment(null);
    },
    [onChange]
  );

  const processDigit = useCallback(
    (segment: Segment, digit: string) => {
      const idx = SEGMENT_ORDER.indexOf(segment);

      setSegments(prev => {
        const current = prev[segment];
        const maxLen = segment === 'year' ? 4 : 2;

        // Start fresh if segment is full
        const next = current.length >= maxLen ? digit : current + digit;
        const updated = { ...prev, [segment]: next };

        if (shouldAutoAdvance(segment, next)) {
          updated[segment] = padSegmentForAdvance(segment, next);

          if (idx < SEGMENT_ORDER.length - 1) {
            setTimeout(() => setActiveSegment(SEGMENT_ORDER[idx + 1]), 0);
          } else {
            setTimeout(() => commitSegments(updated), 0);
          }
        }

        return updated;
      });
    },
    [commitSegments]
  );

  const handleSegmentKeyDown = useCallback(
    (e: React.KeyboardEvent, segment: Segment) => {
      const idx = SEGMENT_ORDER.indexOf(segment);

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (idx > 0) {
            e.preventDefault();
            setActiveSegment(SEGMENT_ORDER[idx - 1]);
          } else {
            commitSegments(segments);
          }
        } else {
          if (idx < SEGMENT_ORDER.length - 1) {
            e.preventDefault();
            setActiveSegment(SEGMENT_ORDER[idx + 1]);
          } else {
            commitSegments(segments);
          }
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditing(false);
        setActiveSegment(null);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        commitSegments(segments);
        return;
      }

      if (e.key === 'ArrowRight' || e.key === '/') {
        e.preventDefault();
        if (idx < SEGMENT_ORDER.length - 1) setActiveSegment(SEGMENT_ORDER[idx + 1]);
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (idx > 0) setActiveSegment(SEGMENT_ORDER[idx - 1]);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const maxVals: Record<Segment, number> = { month: 12, day: 31, year: 2100 };
        setSegments(prev => {
          const current = parseInt(prev[segment], 10) || 0;
          const next = Math.min(current + 1, maxVals[segment]);
          return { ...prev, [segment]: String(next).padStart(segment === 'year' ? 4 : 2, '0') };
        });
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const minVals: Record<Segment, number> = { month: 1, day: 1, year: 1900 };
        setSegments(prev => {
          const current = parseInt(prev[segment], 10) || 0;
          const next = Math.max(current - 1, minVals[segment]);
          return { ...prev, [segment]: String(next).padStart(segment === 'year' ? 4 : 2, '0') };
        });
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        setSegments(prev => {
          const current = prev[segment];
          if (current.length <= 1) return { ...prev, [segment]: '' };
          return { ...prev, [segment]: current.slice(0, -1) };
        });
        return;
      }

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        processDigit(segment, e.key);
        return;
      }
    },
    [commitSegments, segments, processDigit]
  );

  // Sync segments from external value changes (not from our own commits)
  useEffect(() => {
    if (isEditing) return;
    if (justCommittedRef.current) {
      justCommittedRef.current = false;
      return;
    }
    setSegments(parseSegments(value));
  }, [value, isEditing]);

  useEffect(() => {
    if (activeSegment && segmentRefs[activeSegment].current) {
      segmentRefs[activeSegment].current?.focus();
    }
  }, [activeSegment, segmentRefs]);

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

  // Close calendar or commit edits when clicking outside
  useEffect(() => {
    if (!isOpen && !isEditing) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);

      if (!insideTrigger && !insideDropdown) {
        if (isEditing) commitSegments(segments);
        if (isOpen) setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isEditing, commitSegments, segments]);

  const triggerClasses = triggerVariants({
    size,
    focused: isFocused,
    state,
    disabled,
  });

  const renderSegment = (segment: Segment, displayPlaceholder: string) => {
    const isActive = activeSegment === segment;
    const val = segments[segment];
    const padLen = segment === 'year' ? 4 : 2;
    const displayVal = val ? val.padStart(padLen, '0').slice(-padLen) : displayPlaceholder;

    return (
      <span
        ref={segmentRefs[segment]}
        tabIndex={isEditing ? 0 : -1}
        role="spinbutton"
        aria-label={segment}
        aria-valuenow={parseInt(val, 10) || undefined}
        className={`cursor-text px-0.5 outline-none transition-colors ${
          isActive
            ? 'bg-primary/15 text-foreground phosphor-text [box-shadow:inset_0_0_0_1px_hsl(var(--primary)/0.55)]'
            : val
              ? 'text-foreground'
              : 'text-foreground/35'
        }`}
        onClick={e => {
          e.stopPropagation();
          if (!isEditing) startEditing(segment);
          else setActiveSegment(segment);
        }}
        onFocus={() => {
          if (!isEditing) {
            setSegments(parseSegments(value));
            setIsEditing(true);
          }
          setActiveSegment(segment);
        }}
        onKeyDown={e => handleSegmentKeyDown(e, segment)}
      >
        {displayVal}
      </span>
    );
  };

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className ?? ''}`}>
      <div
        ref={triggerRef}
        className={triggerClasses}
        onClick={() => {
          if (disabled) return;
          if (!isEditing) startEditing('month');
        }}
        onKeyDown={e => {
          if (isEditing) return;
          if (/^\d$/.test(e.key)) {
            e.preventDefault();
            startEditing('month');
            setTimeout(() => processDigit('month', e.key), 0);
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isOpen) close();
            else startEditing('month');
          } else if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            close();
          }
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        tabIndex={isEditing ? -1 : disabled ? -1 : 0}
      >
        {isEditing ? (
          <div className="flex items-center">
            {renderSegment('month', 'MM')}
            <span className="mx-0.5 text-foreground/30">/</span>
            {renderSegment('day', 'DD')}
            <span className="mx-0.5 text-foreground/30">/</span>
            {renderSegment('year', 'YYYY')}
          </div>
        ) : (
          <span className={`truncate ${value ? 'text-foreground' : 'text-foreground/40'}`}>
            {value ? formatForDisplay(value) : (placeholder ?? 'MM/DD/YYYY')}
          </span>
        )}

        <div className="flex flex-shrink-0 items-center gap-1">
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={ICON_BUTTON}
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              if (disabled) return;
              if (isOpen) close();
              else openCalendar();
            }}
            className={ICON_BUTTON}
            aria-label="Open calendar"
            tabIndex={-1}
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>

      {createPortal(
        <div
          ref={dropdownRef}
          id={dialogId}
          className={`fixed z-[9999] border border-line-mid bg-card p-3 ${POPUP_SHADOW} ${
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
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
              root: 'text-foreground font-mono',
              months: 'flex',
              month: 'space-y-3',
              month_caption: 'flex justify-center items-center h-8',
              caption_label: 'type-label text-label-xs text-foreground/85',
              nav: 'flex items-center justify-between absolute inset-x-0 top-0 px-1 h-8',
              button_previous: NAV_BUTTON,
              button_next: NAV_BUTTON,
              month_grid: 'border-collapse',
              weekdays: '',
              weekday:
                'type-label text-label-2xs text-muted-foreground/70 w-8 h-8 pb-1 border-b border-line-faint',
              weeks: '',
              week: '',
              day: 'text-center p-0',
              day_button:
                'w-8 h-8 text-data font-mono text-foreground transition-colors hover:bg-foreground/5 dark:hover:[text-shadow:0_0_6px_color-mix(in_srgb,currentColor_60%,transparent)] focus:outline-none focus-visible:[box-shadow:inset_0_0_0_1px_hsl(var(--primary)/0.5)]',
              selected:
                'bg-primary/20 text-foreground phosphor-text [box-shadow:inset_0_0_0_1px_hsl(var(--primary)/0.7)] hover:bg-primary/25',
              today:
                'text-primary [text-decoration:underline] [text-decoration-thickness:1px] [text-underline-offset:3px]',
              outside: 'text-muted-foreground opacity-30',
              disabled: 'text-muted-foreground opacity-30 cursor-not-allowed',
              // fill-current — react-day-picker's Chevron polygons ship without an explicit
              // fill attribute, so without this they render in SVG's default (black).
              chevron: 'w-4 h-4 fill-current',
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
