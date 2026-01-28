/**
 * Select Component
 *
 * Accessible select dropdown primitive following design system tokens
 * Supports single/multi selection, search, and full WCAG AA compliance
 */

import React, { forwardRef, useState, useRef, useCallback, useId, useEffect } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { createPortal } from 'react-dom';

import { defaultSelectProps } from './types';

import type { SelectOption, SelectProps, SelectRef } from './types';

// Re-export types for backward compatibility
export type {
  SelectOption,
  SelectProps,
  SelectRef,
  SelectVariant,
  SelectSize,
  SelectState,
} from './types';

// Select styling using semantic design tokens
const selectVariants = cva(
  [
    // Base styles - rounded-lg matches input-field class
    'relative w-full cursor-pointer',
    'bg-card border rounded-lg',
    'transition-all duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        default: 'border-border hover:border-muted-foreground',
        filled: 'bg-muted border-transparent hover:bg-accent',
        outlined: 'border-2 border-border hover:border-muted-foreground',
      },
      size: {
        xs: 'h-7 px-2 text-xs', // 28px
        sm: 'h-8 px-3 text-sm', // 32px
        md: 'h-9 px-3 text-sm', // 36px - matches input-field pattern
        lg: 'h-12 px-4 text-base', // 48px
      },
      isOpen: {
        true: 'ring-2 ring-action border-action',
        false: '',
      },
      state: {
        default: '',
        error: 'border-danger-border',
        warning: 'border-warning-border',
        success: 'border-success-border',
      },
    },
    defaultVariants: {
      variant: 'outlined',
      size: 'md',
      isOpen: false,
      state: 'default',
    },
  }
);

// Dropdown menu styling - uses fixed positioning via portal
const dropdownVariants = cva(
  [
    'fixed z-[9999]',
    'bg-card border border-border rounded-lg shadow-lg',
    'max-h-60 overflow-auto',
    'py-1',
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

// Option styling
const optionVariants = cva(
  ['px-3 py-2 cursor-pointer text-sm', 'flex items-center gap-2', 'transition-colors duration-150'],
  {
    variants: {
      isSelected: {
        true: 'bg-accent text-accent-foreground',
        false: 'text-foreground',
      },
      isHighlighted: {
        true: 'bg-muted',
        false: 'hover:bg-muted',
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

// Select Component
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
      variant = defaultSelectProps.variant,
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
    // Determine closeOnSelect default based on multiple
    const shouldCloseOnSelect = closeOnSelect ?? !multiple;

    // Determine current state based on error/warning/success props
    const getCurrentState = () => {
      if (error) return 'error';
      if (warning) return 'warning';
      if (success) return 'success';
      return state;
    };

    const currentState = getCurrentState();

    // State
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [selectedValue, setSelectedValue] = useState(() => {
      if (value !== undefined) return value;
      if (defaultValue !== undefined) return defaultValue;
      return multiple ? [] : null;
    });

    // Refs
    const selectRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Typeahead refs for native select-style type-to-jump
    const typeaheadRef = useRef('');
    const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Dropdown position state for portal
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    // IDs
    const id = useId();
    const labelId = `${id}-label`;
    const descriptionId = `${id}-description`;
    const errorId = `${id}-error`;

    // Filter options based on search query
    const filteredOptions =
      searchable && searchQuery
        ? options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    // Get selected options for display
    const getSelectedOptions = useCallback(() => {
      const currentValue = value ?? selectedValue;
      // Check for null/undefined specifically, not falsy - empty string '' is a valid value
      if (currentValue === null || currentValue === undefined) return [];

      const values = Array.isArray(currentValue) ? currentValue : [currentValue];
      return options.filter(option => values.includes(option.value));
    }, [value, selectedValue, options]);

    const selectedOptions = getSelectedOptions();

    // Handle option selection
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

    // Handle clear selection
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

    // Handle select toggle
    const handleToggle = useCallback(() => {
      if (disabled) return;

      const newIsOpen = !isOpen;
      setIsOpen(newIsOpen);

      if (newIsOpen) {
        onOpen?.();
        // Focus search input if searchable
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

    // Handle keyboard navigation
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
            // Typeahead: skip for searchable selects and non-printable keys
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

    // Clean up typeahead timer on unmount
    useEffect(() => {
      return () => {
        if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
      };
    }, []);

    // Handle search input change
    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        onSearch?.(query);
        setHighlightedIndex(0);
      },
      [onSearch]
    );

    // Calculate dropdown position based on trigger element
    const updateDropdownPosition = useCallback(() => {
      if (!selectRef.current) return;
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px gap below trigger
        left: rect.left,
        width: rect.width,
      });
    }, []);

    // Update position when dropdown opens and on scroll/resize
    useEffect(() => {
      if (!isOpen) return;

      // Initial position calculation
      updateDropdownPosition();

      // Update on scroll (any scrollable ancestor) and resize
      const handleScrollOrResize = () => {
        updateDropdownPosition();
      };

      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
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

      // Return undefined explicitly when dropdown is not open
      return undefined;
    }, [isOpen]);

    // Generate classes
    const wrapperClasses = fullWidth ? 'relative w-full' : 'relative';
    const selectClasses = selectVariants({
      variant,
      size,
      isOpen,
      state: currentState,
      className,
    });

    const dropdownClasses = dropdownVariants({ isOpen });

    // Render display value
    const renderDisplayValueContent = () => {
      if (isLoading) {
        return <span className="text-muted-foreground">Loading...</span>;
      }

      if (selectedOptions.length === 0) {
        return <span className="text-muted-foreground opacity-40">{placeholder}</span>;
      }

      // Treat empty-value options as placeholders (e.g., { value: '', label: 'Select...' })
      const firstOption = selectedOptions[0];
      const isEmptyValueOption = firstOption.value === '' || firstOption.value === null;
      if (isEmptyValueOption && !multiple) {
        return <span className="text-muted-foreground opacity-40">{firstOption.label}</span>;
      }

      // Use custom renderValue if provided
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

    // Get current message for display
    const getCurrentMessage = () => {
      if (error) return { message: error, type: 'error' as const };
      if (warning) return { message: warning, type: 'warning' as const };
      if (success) return { message: success, type: 'success' as const };
      return null;
    };

    const currentMessage = getCurrentMessage();

    return (
      <div className={wrapperClasses}>
        {/* Label */}
        {label && (
          <label
            id={labelId}
            className="block text-sm font-medium text-secondary-foreground mb-1.5"
          >
            {label}
          </label>
        )}

        {/* Select Container */}
        <div
          ref={el => {
            // Use type assertion to safely assign to mutable refs
            (selectRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }}
          className={selectClasses}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="select-listbox"
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
          {/* Display Value */}
          <div className="flex items-center justify-between h-full">
            <div className="flex-1 truncate">{renderDisplayValueContent()}</div>

            <div className="flex items-center gap-1">
              {/* Clear Button */}
              {clearable && selectedOptions.length > 0 && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-accent rounded"
                  aria-label="Clear selection"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z" />
                  </svg>
                </button>
              )}

              {/* Dropdown Arrow */}
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dropdown Menu - rendered via portal to escape overflow containers */}
        {createPortal(
          <div
            ref={dropdownRef}
            className={dropdownClasses}
            data-select-dropdown
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              minWidth: dropdownPosition.width,
              maxHeight,
            }}
          >
            {/* Search Input */}
            {searchable && isOpen && (
              <div className="px-3 py-2 border-b border-border">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search options..."
                  className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-foreground placeholder:text-muted-foreground placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-action"
                />
              </div>
            )}

            {/* Options */}
            <div
              ref={optionsRef}
              role="listbox"
              id="select-listbox"
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty label should fallback to 'Select'
              aria-label={`${label || 'Select'} options`}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No options found</div>
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
                      tabIndex={isHighlighted ? 0 : -1}
                    >
                      {renderOption ? (
                        // Custom option rendering
                        renderOption(option, { isSelected, isHighlighted })
                      ) : (
                        // Default option rendering
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
                              <div className="text-xs text-muted-foreground truncate">
                                {option.description}
                              </div>
                            )}
                          </div>

                          {!multiple && isSelected && (
                            <svg
                              className="w-4 h-4 text-action"
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
          </div>,
          document.body
        )}

        {/* Description */}
        {description && (
          <p id={descriptionId} className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}

        {/* Error/Warning/Success Message */}
        {currentMessage && (
          <p
            id={errorId}
            className={`text-xs mt-1 ${
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

export type SelectVariantsProps = VariantProps<typeof selectVariants>;
