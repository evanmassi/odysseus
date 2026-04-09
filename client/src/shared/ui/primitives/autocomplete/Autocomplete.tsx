/**
 * Autocomplete Input
 *
 * Text input with keyboard-navigable dropdown suggestions. Supports free text entry.
 */

import React, { forwardRef, useState, useRef, useCallback, useId, useEffect } from 'react';

import { createPortal } from 'react-dom';

import { ScrollArea } from '../scroll-area/ScrollArea';

import type { AutocompleteProps, AutocompleteRef, AutocompleteOption } from './types';

export const Autocomplete = forwardRef<AutocompleteRef, AutocompleteProps>(
  (
    {
      options,
      value = '',
      onChange,
      onSelect,
      placeholder,
      disabled = false,
      state = 'default',
      fullWidth = false,
      minChars = 2,
      'aria-label': ariaLabel,
      className = '',
      inputClassName,
      renderOption,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const listboxId = useId();

    const combinedRef = useCallback(
      (node: HTMLInputElement | null) => {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref]
    );

    const shouldShow = isOpen && value.length >= minChars && options.length > 0;

    const updateDropdownPosition = useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }, []);

    useEffect(() => {
      if (!shouldShow) return;

      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }, [shouldShow, updateDropdownPosition]);

    useEffect(() => {
      setHighlightedIndex(-1);
    }, [options]);

    // Scroll highlighted option into view
    useEffect(() => {
      if (highlightedIndex >= 0) {
        optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange?.(newValue);
        setIsOpen(true);
      },
      [onChange]
    );

    const handleSelect = useCallback(
      (option: AutocompleteOption) => {
        onChange?.(option.value);
        onSelect?.(option);
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
      },
      [onChange, onSelect]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!shouldShow) {
          if (e.key === 'ArrowDown' && value.length >= minChars && options.length > 0) {
            e.preventDefault();
            setIsOpen(true);
          }
          return;
        }

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
            break;

          case 'ArrowUp':
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
            break;

          case 'Enter':
            if (highlightedIndex >= 0) {
              e.preventDefault();
              handleSelect(options[highlightedIndex]);
            }
            break;

          case 'Escape':
            e.preventDefault();
            setIsOpen(false);
            setHighlightedIndex(-1);
            break;

          case 'Tab':
            setIsOpen(false);
            setHighlightedIndex(-1);
            break;
        }
      },
      [shouldShow, highlightedIndex, options, handleSelect, value.length, minChars]
    );

    const handleFocus = useCallback(() => {
      if (value.length >= minChars && options.length > 0) {
        setIsOpen(true);
      }
    }, [value.length, minChars, options.length]);

    const handleBlur = useCallback((e: React.FocusEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (containerRef.current?.contains(relatedTarget)) return;
      setTimeout(() => setIsOpen(false), 150);
    }, []);

    const stateClasses =
      state === 'error'
        ? 'border-2 border-danger-border'
        : state === 'warning'
          ? 'border-2 border-warning-border'
          : 'border border-border hover:border-muted-foreground';

    const dropdown = shouldShow
      ? createPortal(
          <div style={dropdownStyle} role="listbox" id={listboxId}>
            <ScrollArea className="bg-card border border-border rounded-lg shadow-lg max-h-48">
              <div className="py-1">
                {options.map((option, index) => {
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={option.value}
                      ref={el => {
                        optionRefs.current[index] = el;
                      }}
                      role="option"
                      tabIndex={-1}
                      aria-selected={isHighlighted}
                      className={`px-3 py-1.5 cursor-pointer text-sm transition-colors duration-150 ${
                        isHighlighted ? 'bg-muted' : 'hover:bg-muted'
                      }`}
                      onMouseDown={e => {
                        e.preventDefault();
                        handleSelect(option);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      {renderOption ? (
                        renderOption(option, { isHighlighted })
                      ) : (
                        <>
                          <span className="font-medium">{option.label}</span>
                          {option.secondary && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({option.secondary})
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>,
          document.body
        )
      : null;

    return (
      <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
        <input
          ref={combinedRef}
          type="text"
          role="combobox"
          aria-expanded={shouldShow}
          aria-controls={shouldShow ? listboxId : undefined}
          aria-activedescendant={
            shouldShow && highlightedIndex >= 0
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          aria-autocomplete="list"
          aria-label={ariaLabel}
          autoComplete="off"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={
            inputClassName ??
            `w-full h-9 px-3 text-sm rounded-lg bg-card text-foreground placeholder:text-muted-foreground placeholder:opacity-40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${stateClasses}`
          }
        />
        {dropdown}
      </div>
    );
  }
);

Autocomplete.displayName = 'Autocomplete';
