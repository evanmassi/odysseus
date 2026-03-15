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
      focused: {
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
    className,
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
        className={`outline-none rounded px-0.5 cursor-text ${
          isActive
            ? 'bg-ring text-white'
            : val
              ? 'text-foreground'
              : 'text-muted-foreground opacity-40'
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
    <div className={fullWidth ? 'relative w-full' : 'relative'}>
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
            <span className="text-muted-foreground mx-0.5">/</span>
            {renderSegment('day', 'DD')}
            <span className="text-muted-foreground mx-0.5">/</span>
            {renderSegment('year', 'YYYY')}
          </div>
        ) : (
          <span
            className={
              value ? 'text-foreground truncate' : 'text-muted-foreground opacity-40 truncate'
            }
          >
            {value ? formatForDisplay(value) : (placeholder ?? 'MM/DD/YYYY')}
          </span>
        )}

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
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              if (disabled) return;
              if (isOpen) close();
              else openCalendar();
            }}
            className="p-0.5 hover:bg-accent rounded"
            aria-label="Open calendar"
            tabIndex={-1}
          >
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {createPortal(
        <div
          ref={dropdownRef}
          id={dialogId}
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
