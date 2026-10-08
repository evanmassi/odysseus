import React, {
  Fragment,
  forwardRef,
  useState,
  useRef,
  useCallback,
  useMemo,
  useId,
  useEffect,
  useLayoutEffect,
} from 'react';

import { cva } from 'class-variance-authority';
import { createPortal } from 'react-dom';

import { useMergedRef } from '@shared/hooks';

import { ScrollArea } from '../scroll-area/ScrollArea';
import {
  ROW_HOVER_GLOW,
  ROW_LIT_HOVER,
  ROW_LIT_SELECTED_HOVER,
  ROW_SELECTED,
  ROW_TONE,
} from '../table/rowGlow';

import { defaultSelectProps } from './types';

import type { SelectOption, SelectProps, SelectRef } from './types';

const TRIGGER_FOCUS_SHADOW = 'shadow-[var(--input-focus-shadow)]';
const POPUP_SHADOW = 'shadow-[var(--popup-shadow)]';

const DROPDOWN_MAX_HEIGHT = 240;

const ICON_BUTTON =
  'p-0.5 text-secondary-foreground transition-colors hover:text-foreground dark:hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)] focus:outline-none focus-visible:text-foreground dark:focus-visible:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]';

const selectVariants = cva(
  [
    'relative w-full cursor-pointer',
    'bg-[hsl(var(--input-well))] border',
    'transition-[border-color,background,box-shadow] duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus-visible:outline-none focus-visible:border-primary/70 focus-visible:bg-primary/[0.04]',
    'focus-visible:shadow-[var(--input-focus-shadow)]',
  ],
  {
    variants: {
      size: {
        xs: 'h-7 px-2 text-body-sm',
        sm: 'h-8 px-3 text-body',
        md: 'h-9 px-3 text-body',
      },
      isOpen: {
        true: `border-primary/70 bg-primary/[0.04] ${TRIGGER_FOCUS_SHADOW}`,
        false: '',
      },
      state: {
        default: 'border-line-faint',
        error: 'border-danger-border',
        warning: 'border-warning-border',
        success: 'border-success-border',
      },
      disabled: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      { isOpen: true, state: 'default', class: 'border-primary/70' },
      {
        isOpen: false,
        state: 'default',
        disabled: false,
        class: 'hover:border-foreground/30',
      },
    ],
    defaultVariants: {
      size: 'md',
      isOpen: false,
      state: 'default',
      disabled: false,
    },
  }
);

const dropdownVariants = cva(
  [
    'fixed z-popover',
    'bg-card border border-line-mid',
    'overflow-hidden flex flex-col',
    'py-1',
    POPUP_SHADOW,
  ],
  {
    variants: {
      isOpen: {
        true: 'opacity-100',
        false: 'opacity-0 pointer-events-none',
      },
    },
    defaultVariants: {
      isOpen: false,
    },
  }
);

const optionVariants = cva(
  [
    'px-3 py-2 cursor-pointer text-body',
    'flex items-center gap-2',
    'transition-[background-image,box-shadow,color] duration-150',
    ROW_TONE.primary,
  ],
  {
    variants: {
      isSelected: {
        true: `${ROW_SELECTED} font-semibold text-foreground dark:text-white`,
        false: `${ROW_HOVER_GLOW.primary} text-foreground/75 hover:text-foreground`,
      },
      isHighlighted: {
        true: '',
        false: '',
      },
      isDisabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: '',
      },
    },
    compoundVariants: [
      { isSelected: false, isHighlighted: true, className: `${ROW_LIT_HOVER} text-foreground` },
      { isSelected: true, isHighlighted: true, className: ROW_LIT_SELECTED_HOVER },
    ],
    defaultVariants: {
      isSelected: false,
      isHighlighted: false,
      isDisabled: false,
    },
  }
);

export const Select = forwardRef<SelectRef, SelectProps>(
  (
    {
      options,
      value,
      clearable = defaultSelectProps.clearable,
      disabled = defaultSelectProps.disabled,
      size = defaultSelectProps.size,
      state = defaultSelectProps.state,
      placeholder = defaultSelectProps.placeholder,
      fullWidth = defaultSelectProps.fullWidth,
      isQuiet = defaultSelectProps.isQuiet,
      label,
      labelClassName,
      error,
      onChange,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      className,
      renderOption,
      renderValue,
    },
    ref
  ) => {
    const currentState = error ? 'error' : state;

    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const selectRef = useRef<HTMLDivElement>(null);
    const mergedSelectRef = useMergedRef(ref, selectRef);
    const optionsRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const typeaheadRef = useRef('');
    const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [dropdownPosition, setDropdownPosition] = useState({
      top: 0,
      left: 0,
      width: 0,
      openUpward: false,
    });

    const id = useId();
    const labelId = `${id}-label`;
    const listboxId = `${id}-listbox`;
    const errorId = `${id}-error`;

    const isTiered = useMemo(() => options.some(option => option.depth), [options]);

    const selectedOptions = useMemo(() => {
      // PITFALL: '' is a valid value, so only null and undefined mean nothing is selected.
      if (value === null || value === undefined) return [];
      return options.filter(option => option.value === value);
    }, [value, options]);

    const handleOptionSelect = useCallback(
      (option: SelectOption) => {
        if (option.disabled) return;
        onChange?.(option.value);
        setIsOpen(false);
      },
      [onChange]
    );

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange?.(null);
      },
      [onChange]
    );

    const handleToggle = useCallback(() => {
      if (disabled) return;

      const newIsOpen = !isOpen;
      setIsOpen(newIsOpen);
      if (!newIsOpen) setHighlightedIndex(-1);
    }, [disabled, isOpen]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else {
              setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
            }
            break;

          case 'ArrowUp':
            e.preventDefault();
            if (isOpen) {
              setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
            }
            break;

          case 'Enter':
          case ' ':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else if (highlightedIndex >= 0) {
              handleOptionSelect(options[highlightedIndex]);
            }
            break;

          case 'Escape':
            if (isOpen) {
              e.preventDefault();
              setIsOpen(false);
              selectRef.current?.focus();
            }
            break;

          default: {
            if (e.key.length > 1) break;

            e.preventDefault();
            typeaheadRef.current += e.key;

            if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
            typeaheadTimerRef.current = setTimeout(() => {
              typeaheadRef.current = '';
            }, 500);

            const matchIndex = options.findIndex(option =>
              option.label.toLowerCase().startsWith(typeaheadRef.current.toLowerCase())
            );

            if (matchIndex >= 0) {
              if (isOpen) {
                setHighlightedIndex(matchIndex);
              } else {
                handleOptionSelect(options[matchIndex]);
              }
            }
            break;
          }
        }
      },
      [isOpen, highlightedIndex, options, handleOptionSelect]
    );

    useEffect(() => {
      return () => {
        if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
      };
    }, []);

    const updateDropdownPosition = useCallback(() => {
      if (!selectRef.current) return;
      const rect = selectRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < DROPDOWN_MAX_HEIGHT + 8 && rect.top > spaceBelow;
      setDropdownPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUpward,
      });
    }, []);

    useLayoutEffect(() => {
      if (!isOpen) return;

      updateDropdownPosition();

      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);

      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }, [isOpen, updateDropdownPosition]);

    // PITFALL: the dropdown is portaled, so an outside click must miss both the trigger and the dropdown.
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const clickedTrigger = selectRef.current?.contains(target);
        const clickedDropdown = dropdownRef.current?.contains(target);

        if (!clickedTrigger && !clickedDropdown) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }

      return undefined;
    }, [isOpen]);

    const wrapperClasses = fullWidth ? 'relative w-full' : 'relative';
    const selectClasses = selectVariants({
      size,
      isOpen,
      state: currentState,
      disabled,
      className: `${isQuiet ? 'select-quiet' : ''} ${className ?? ''}`,
    });

    const dropdownClasses = dropdownVariants({ isOpen });

    const renderDisplayValueContent = () => {
      if (selectedOptions.length === 0) {
        return <span className="text-foreground/40">{placeholder}</span>;
      }

      const firstOption = selectedOptions[0];
      if (firstOption.value === '') {
        return <span className="text-foreground/40">{firstOption.label}</span>;
      }

      if (renderValue) {
        return renderValue(selectedOptions);
      }

      return (
        <span className="text-foreground flex items-center gap-2">
          {firstOption.icon && <span>{firstOption.icon}</span>}
          {firstOption.label}
        </span>
      );
    };

    return (
      <div className={wrapperClasses}>
        {label && (
          <label
            id={labelId}
            className={
              labelClassName ??
              `block font-medium text-secondary-foreground ${
                size === 'xs' ? 'text-body-sm mb-0.5' : 'text-body-sm mb-1.5'
              }`
            }
          >
            {label}
          </label>
        )}

        <div
          ref={mergedSelectRef}
          className={selectClasses}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy ?? (label ? labelId : undefined)}
          aria-describedby={error ? errorId : undefined}
          tabIndex={disabled ? -1 : 0}
        >
          <div className="flex items-center justify-between h-full">
            <div className={`flex-1 truncate ${isQuiet ? 'text-right' : ''}`}>
              {renderDisplayValueContent()}
            </div>

            <div className={isQuiet ? 'select-quiet__chrome' : 'contents'}>
              <div className="flex items-center gap-1">
                {clearable && selectedOptions.length > 0 && !disabled && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className={ICON_BUTTON}
                    aria-label="Clear selection"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z" />
                    </svg>
                  </button>
                )}

                <svg
                  className={`w-4 h-4 text-secondary-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {createPortal(
          <div
            ref={dropdownRef}
            className={dropdownClasses}
            data-select-dropdown
            role="presentation"
            onMouseDown={e => e.stopPropagation()}
            style={{
              ...(dropdownPosition.openUpward
                ? { bottom: window.innerHeight - dropdownPosition.top, left: dropdownPosition.left }
                : { top: dropdownPosition.top, left: dropdownPosition.left }),
              minWidth: dropdownPosition.width,
              maxHeight: DROPDOWN_MAX_HEIGHT,
            }}
          >
            <ScrollArea className="flex-1 min-h-0">
              <div
                ref={optionsRef}
                role="listbox"
                id={listboxId}
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty label should fallback to 'Select'
                aria-label={`${label || 'Select'} options`}
              >
                {options.length === 0 ? (
                  <div className="px-3 py-2 text-body-sm text-foreground/40">No options found</div>
                ) : (
                  options.map((option, index) => {
                    const isSelected = selectedOptions.some(
                      selected => selected.value === option.value
                    );
                    const isHighlighted = index === highlightedIndex;
                    // PITFALL: headings render as siblings so option indices stay aligned with keyboard navigation.
                    const startsGroup =
                      !!option.group && option.group !== options[index - 1]?.group;

                    return (
                      <Fragment key={option.value}>
                        {startsGroup && (
                          <div
                            role="presentation"
                            className="px-3 pb-0.5 pt-2 type-label text-label-2xs tracking-label-wide text-foreground/40 first:pt-1"
                          >
                            {option.group}
                          </div>
                        )}
                        <div
                          className={optionVariants({
                            isSelected,
                            isHighlighted,
                            isDisabled: option.disabled,
                          })}
                          onClick={() => handleOptionSelect(option)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOptionSelect(option);
                            }
                          }}
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={option.disabled}
                          tabIndex={isOpen && isHighlighted ? 0 : -1}
                        >
                          {renderOption ? (
                            renderOption(option, { isSelected, isHighlighted })
                          ) : (
                            <>
                              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}

                              <div
                                className="flex-1 min-w-0"
                                style={
                                  option.depth
                                    ? { paddingLeft: `${option.depth * 0.875}rem` }
                                    : undefined
                                }
                              >
                                <div
                                  className={`truncate ${isTiered && !option.depth ? 'font-semibold' : ''}`}
                                >
                                  {option.label}
                                </div>
                                {option.description && (
                                  <div className="text-caption text-muted-foreground truncate">
                                    {option.description}
                                  </div>
                                )}
                              </div>

                              {isSelected && (
                                <svg
                                  className="w-4 h-4 text-primary"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" />
                                </svg>
                              )}
                            </>
                          )}
                        </div>
                      </Fragment>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>,
          document.body
        )}

        {error && (
          <p id={errorId} className="text-caption mt-1 text-danger-text" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
