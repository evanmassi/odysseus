/**
 * Select Component
 *
 * Accessible select dropdown primitive following design system tokens
 * Supports single/multi selection, search, and full WCAG AA compliance
 */

import React, { forwardRef, useState, useRef, useCallback, useId, useEffect } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

// Basic select option interface
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
}

// Select component props
export interface SelectProps {
  // Options
  options: SelectOption[];
  value?: string | number | (string | number)[];
  defaultValue?: string | number | (string | number)[];

  // Behavior
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;

  // Appearance
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;

  // Label and description
  label?: string;
  description?: string;
  error?: string;

  // Event handlers
  onChange?: (value: string | number | (string | number)[] | null) => void;
  onSearch?: (query: string) => void;
  onOpen?: () => void;
  onClose?: () => void;

  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;

  // Styling
  className?: string;

  // Advanced
  maxHeight?: number;
  closeOnSelect?: boolean;
}

// Select styling
const selectVariants = cva(
  [
    // Base styles
    'relative w-full cursor-pointer',
    'bg-white border rounded-md',
    'transition-all duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        default: 'border-neutral-300 hover:border-neutral-400',
        filled: 'bg-neutral-100 border-transparent hover:bg-neutral-200',
        outlined: 'border-2 border-neutral-300 hover:border-neutral-400',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
      isOpen: {
        true: 'ring-2 ring-primary-500 border-primary-500',
        false: '',
      },
      hasError: {
        true: 'border-error-500 focus:border-error-500 focus:ring-error-500',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'outlined',
      size: 'md',
      isOpen: false,
      hasError: false,
    },
  }
);

// Dropdown menu styling
const dropdownVariants = cva(
  [
    'absolute z-50 w-full mt-1',
    'bg-white border border-neutral-300 rounded-md shadow-lg',
    'max-h-60 overflow-auto',
    'py-1',
  ],
  {
    variants: {
      isOpen: {
        true: 'opacity-100 translate-y-0',
        false: 'opacity-0 -translate-y-2 pointer-events-none',
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
        true: 'bg-primary-100 text-primary-900',
        false: 'text-neutral-900',
      },
      isHighlighted: {
        true: 'bg-primary-50',
        false: 'hover:bg-neutral-50',
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

// Simple Select Component (Basic Implementation)
export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      multiple = false,
      searchable = false,
      clearable = false,
      disabled = false,
      loading = false,
      variant = 'outlined',
      size = 'md',
      placeholder = 'Select an option...',
      label,
      description,
      error,
      onChange,
      onSearch,
      onOpen,
      onClose,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      className,
      maxHeight = 240,
      closeOnSelect = !multiple,
      ...props
    },
    ref
  ) => {
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
      if (!currentValue) return [];

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

        if (closeOnSelect) {
          setIsOpen(false);
          setSearchQuery('');
        }
      },
      [multiple, selectedValue, value, onChange, closeOnSelect]
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
        }
      },
      [isOpen, highlightedIndex, filteredOptions, handleOptionSelect, onOpen, onClose]
    );

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

    // Close dropdown on outside click
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
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
    const selectClasses = selectVariants({
      variant,
      size,
      isOpen,
      hasError: Boolean(error),
      className,
    });

    const dropdownClasses = dropdownVariants({ isOpen });

    // Render display value
    const renderDisplayValue = () => {
      if (loading) {
        return <span className="text-neutral-500">Loading...</span>;
      }

      if (selectedOptions.length === 0) {
        return <span className="text-neutral-400">{placeholder}</span>;
      }

      if (multiple && selectedOptions.length > 1) {
        return <span className="text-neutral-900">{selectedOptions.length} items selected</span>;
      }

      const firstOption = selectedOptions[0];
      return (
        <span className="text-neutral-900 flex items-center gap-2">
          {firstOption.icon && <span>{firstOption.icon}</span>}
          {firstOption.label}
        </span>
      );
    };

    return (
      <div className="relative">
        {/* Label */}
        {label && (
          <label id={labelId} className="block text-sm font-medium text-neutral-700 mb-1.5">
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
            [ariaDescribedBy, description ? descriptionId : null, error ? errorId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          tabIndex={disabled ? -1 : 0}
          {...props}
        >
          {/* Display Value */}
          <div className="flex items-center justify-between">
            <div className="flex-1 truncate">{renderDisplayValue()}</div>

            <div className="flex items-center gap-1">
              {/* Clear Button */}
              {clearable && selectedOptions.length > 0 && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-neutral-200 rounded focus-ring-default"
                  aria-label="Clear selection"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z" />
                  </svg>
                </button>
              )}

              {/* Dropdown Arrow */}
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
              </svg>
            </div>
          </div>

          {/* Dropdown Menu */}
          <div className={dropdownClasses} style={{ maxHeight }}>
            {/* Search Input */}
            {searchable && isOpen && (
              <div className="px-3 py-2 border-b border-neutral-200">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search options..."
                  className="input w-full px-2 py-1 text-sm border border-neutral-300 rounded"
                />
              </div>
            )}

            {/* Options */}
            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty label is meaningless for accessibility, use default 'Select' */}
            <div
              ref={optionsRef}
              role="listbox"
              id="select-listbox"
              aria-label={`${label || 'Select'} options`}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-neutral-500">No options found</div>
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
                      {multiple && (
                        <div className="flex items-center">
                          <input type="checkbox" checked={isSelected} readOnly className="mr-2" />
                        </div>
                      )}

                      {option.icon && <span className="flex-shrink-0">{option.icon}</span>}

                      <div className="flex-1 min-w-0">
                        <div className="truncate">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-neutral-500 truncate">
                            {option.description}
                          </div>
                        )}
                      </div>

                      {!multiple && isSelected && (
                        <svg
                          className="w-4 h-4 text-primary-600"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p id={descriptionId} className="text-xs text-neutral-500 mt-1">
            {description}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p id={errorId} className="text-xs text-error-600 mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export type SelectVariantsProps = VariantProps<typeof selectVariants>;
