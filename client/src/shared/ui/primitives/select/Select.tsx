/**
 * Select Component
 *
 * Accessible select dropdown primitive with design system tokens.
 */

import React, {
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

import { defaultSelectProps } from './types';

import type { SelectOption, SelectProps, SelectRef } from './types';

const TRIGGER_FOCUS_SHADOW = 'shadow-[var(--input-focus-shadow)]';
const POPUP_SHADOW = 'shadow-[var(--popup-shadow)]';

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
        lg: 'h-12 px-4 text-body-lg',
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
    'fixed z-[9999]',
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
    'transition-colors duration-150',
  ],
  {
    variants: {
      isSelected: {
        true: 'bg-primary/15 text-foreground phosphor-text [box-shadow:inset_0_0_0_1px_hsl(var(--primary)/0.55)]',
        false: 'text-foreground',
      },
      isHighlighted: {
        true: 'bg-foreground/5',
        false: 'hover:bg-foreground/5',
      },
      isDisabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: '',
      },
    },
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
      defaultValue,
      multiple = defaultSelectProps.multiple,
      searchable = defaultSelectProps.searchable,
      clearable = defaultSelectProps.clearable,
      disabled = defaultSelectProps.disabled,
      isLoading = defaultSelectProps.isLoading,
      size = defaultSelectProps.size,
      state = defaultSelectProps.state,
      placeholder = defaultSelectProps.placeholder,
      fullWidth = defaultSelectProps.fullWidth,
      label,
      description,
      error,
      warning,
      success,
      onChange,
      onSearch,
      onOpen,
      onClose,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      className,
      maxHeight = defaultSelectProps.maxHeight,
      closeOnSelect,
      renderOption,
      renderValue,
      ...props
    },
    ref
  ) => {
    const shouldCloseOnSelect = closeOnSelect ?? !multiple;

    const getCurrentState = () => {
      if (error) return 'error';
      if (warning) return 'warning';
      if (success) return 'success';
      return state;
    };

    const currentState = getCurrentState();

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [selectedValue, setSelectedValue] = useState(() => {
      if (value !== undefined) return value;
      if (defaultValue !== undefined) return defaultValue;
      return multiple ? [] : null;
    });

    const selectRef = useRef<HTMLDivElement>(null);
    const mergedSelectRef = useMergedRef(ref, selectRef);
    const searchInputRef = useRef<HTMLInputElement>(null);
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
    const descriptionId = `${id}-description`;
    const errorId = `${id}-error`;

    const filteredOptions =
      searchable && searchQuery
        ? options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    const selectedOptions = useMemo(() => {
      const currentValue = value ?? selectedValue;
      // Check for null/undefined specifically, not falsy - empty string '' is a valid value
      if (currentValue === null || currentValue === undefined) return [];

      const values = Array.isArray(currentValue) ? currentValue : [currentValue];
      return options.filter(option => values.includes(option.value));
    }, [value, selectedValue, options]);

    const handleOptionSelect = useCallback(
      (option: SelectOption) => {
        if (option.disabled) return;

        let newValue: string | number | (string | number)[] | null;

        if (multiple) {
          const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
          if (currentValues.includes(option.value)) {
            newValue = currentValues.filter(v => v !== option.value);
          } else {
            newValue = [...currentValues, option.value];
          }
        } else {
          newValue = option.value;
        }

        if (value === undefined) {
          setSelectedValue(newValue);
        }

        onChange?.(newValue);

        if (shouldCloseOnSelect) {
          setIsOpen(false);
          setSearchQuery('');
        }
      },
      [multiple, selectedValue, value, onChange, shouldCloseOnSelect]
    );

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        const newValue = multiple ? [] : null;

        if (value === undefined) {
          setSelectedValue(newValue);
        }

        onChange?.(newValue);
      },
      [multiple, value, onChange]
    );

    const handleToggle = useCallback(() => {
      if (disabled) return;

      const newIsOpen = !isOpen;
      setIsOpen(newIsOpen);

      if (newIsOpen) {
        onOpen?.();
        setTimeout(() => {
          if (searchable && searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 0);
      } else {
        onClose?.();
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    }, [disabled, isOpen, onOpen, onClose, searchable]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              onOpen?.();
            } else {
              setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
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
              onOpen?.();
            } else if (highlightedIndex >= 0) {
              handleOptionSelect(filteredOptions[highlightedIndex]);
            }
            break;

          case 'Escape':
            if (isOpen) {
              e.preventDefault();
              setIsOpen(false);
              onClose?.();
              setSearchQuery('');
              selectRef.current?.focus();
            }
            break;

          default: {
            if (searchable) break;
            if (e.key.length > 1) break;

            e.preventDefault();
            typeaheadRef.current += e.key;

            if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
            typeaheadTimerRef.current = setTimeout(() => {
              typeaheadRef.current = '';
            }, 500);

            const matchIndex = filteredOptions.findIndex(option =>
              option.label.toLowerCase().startsWith(typeaheadRef.current.toLowerCase())
            );

            if (matchIndex >= 0) {
              if (isOpen) {
                setHighlightedIndex(matchIndex);
              } else {
                handleOptionSelect(filteredOptions[matchIndex]);
              }
            }
            break;
          }
        }
      },
      [isOpen, highlightedIndex, filteredOptions, handleOptionSelect, onOpen, onClose, searchable]
    );

    useEffect(() => {
      return () => {
        if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
      };
    }, []);

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        onSearch?.(query);
        setHighlightedIndex(0);
      },
      [onSearch]
    );

    const updateDropdownPosition = useCallback(() => {
      if (!selectRef.current) return;
      const rect = selectRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = maxHeight;
      const openUpward = spaceBelow < dropdownHeight + 8 && rect.top > spaceBelow;
      setDropdownPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUpward,
      });
    }, [maxHeight]);

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

    // Close dropdown on outside click (check both trigger and dropdown since dropdown is portaled)
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const clickedTrigger = selectRef.current?.contains(target);
        const clickedDropdown = dropdownRef.current?.contains(target);

        if (!clickedTrigger && !clickedDropdown) {
          setIsOpen(false);
          setSearchQuery('');
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
      className,
    });

    const dropdownClasses = dropdownVariants({ isOpen });

    const renderDisplayValueContent = () => {
      if (isLoading) {
        return <span className="text-muted-foreground">Loading...</span>;
      }

      if (selectedOptions.length === 0) {
        return <span className="text-foreground/40">{placeholder}</span>;
      }

      // Treat empty-value options as placeholders (e.g., { value: '', label: 'Select...' })
      const firstOption = selectedOptions[0];
      const isEmptyValueOption = firstOption.value === '' || firstOption.value === null;
      if (isEmptyValueOption && !multiple) {
        return <span className="text-foreground/40">{firstOption.label}</span>;
      }

      if (renderValue) {
        return renderValue(selectedOptions);
      }

      if (multiple && selectedOptions.length > 1) {
        return <span className="text-foreground">{selectedOptions.length} items selected</span>;
      }

      return (
        <span className="text-foreground flex items-center gap-2">
          {firstOption.icon && <span>{firstOption.icon}</span>}
          {firstOption.label}
        </span>
      );
    };

    const getCurrentMessage = () => {
      if (error) return { message: error, type: 'error' as const };
      if (warning) return { message: warning, type: 'warning' as const };
      if (success) return { message: success, type: 'success' as const };
      return null;
    };

    const currentMessage = getCurrentMessage();

    return (
      <div className={wrapperClasses}>
        {label && (
          <label
            id={labelId}
            className={`block font-medium text-secondary-foreground ${
              size === 'xs' ? 'text-body-sm mb-0.5' : 'text-body-sm mb-1.5'
            }`}
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
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={
            [ariaDescribedBy, description ? descriptionId : null, currentMessage ? errorId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          tabIndex={disabled ? -1 : 0}
          {...props}
        >
          <div className="flex items-center justify-between h-full">
            <div className="flex-1 truncate">{renderDisplayValueContent()}</div>

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
              maxHeight,
            }}
          >
            {searchable && isOpen && (
              <div className="px-3 py-2 border-b border-line-faint">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search options..."
                  className="w-full px-2 py-1 text-body font-mono tracking-[0.04em] bg-foreground/[0.02] border border-line-faint text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary/70 focus:bg-primary/[0.04]"
                />
              </div>
            )}

            <ScrollArea className="flex-1 min-h-0">
              <div
                ref={optionsRef}
                role="listbox"
                id={listboxId}
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty label should fallback to 'Select'
                aria-label={`${label || 'Select'} options`}
              >
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-body-sm text-foreground/40">No options found</div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = selectedOptions.some(
                      selected => selected.value === option.value
                    );
                    const isHighlighted = index === highlightedIndex;

                    return (
                      <div
                        key={option.value}
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
                            {multiple && (
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="mr-2"
                                />
                              </div>
                            )}

                            {option.icon && <span className="flex-shrink-0">{option.icon}</span>}

                            <div className="flex-1 min-w-0">
                              <div className="truncate">{option.label}</div>
                              {option.description && (
                                <div className="text-caption text-muted-foreground truncate">
                                  {option.description}
                                </div>
                              )}
                            </div>

                            {!multiple && isSelected && (
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
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>,
          document.body
        )}

        {description && (
          <p id={descriptionId} className="text-caption text-muted-foreground mt-1">
            {description}
          </p>
        )}

        {currentMessage && (
          <p
            id={errorId}
            className={`text-caption mt-1 ${
              currentMessage.type === 'error'
                ? 'text-danger-text'
                : currentMessage.type === 'warning'
                  ? 'text-warning-text'
                  : 'text-success-text'
            }`}
            role="alert"
          >
            {currentMessage.message}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
