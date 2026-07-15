/**
 * Autocomplete Input
 *
 * Text input with keyboard-navigable dropdown suggestions. Supports free text entry.
 */

import React, {
  forwardRef,
  useState,
  useRef,
  useCallback,
  useId,
  useEffect,
  useLayoutEffect,
} from 'react';

import { createPortal } from 'react-dom';

import { useMergedRef } from '@shared/hooks';

import { ScrollArea } from '../scroll-area/ScrollArea';

import type { AutocompleteProps, AutocompleteRef, AutocompleteOption } from './types';

const POPUP_SHADOW = 'shadow-[var(--popup-shadow)]';

const MIN_CHARS = 2;
const BLUR_CLOSE_DELAY_MS = 150;

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
      'aria-label': ariaLabel,
      inputClassName,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const blurTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const listboxId = useId();

    const combinedRef = useMergedRef(ref, inputRef);

    const shouldShow = isOpen && value.length >= MIN_CHARS && options.length > 0;

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

    useLayoutEffect(() => {
      if (!shouldShow) return;

      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }, [shouldShow, updateDropdownPosition]);

    useEffect(() => () => clearTimeout(blurTimerRef.current), []);

    useEffect(() => {
      setHighlightedIndex(-1);
    }, [options]);

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
          if (e.key === 'ArrowDown' && value.length >= MIN_CHARS && options.length > 0) {
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
      [shouldShow, highlightedIndex, options, handleSelect, value.length]
    );

    const handleFocus = useCallback(() => {
      clearTimeout(blurTimerRef.current);
      if (value.length >= MIN_CHARS && options.length > 0) {
        setIsOpen(true);
      }
    }, [value.length, options.length]);

    const handleBlur = useCallback((e: React.FocusEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (containerRef.current?.contains(relatedTarget)) return;
      blurTimerRef.current = setTimeout(() => setIsOpen(false), BLUR_CLOSE_DELAY_MS);
    }, []);

    const stateBorder =
      state === 'error'
        ? 'border-danger-border'
        : state === 'warning'
          ? 'border-warning-border'
          : 'border-line-faint hover:border-foreground/30';

    const dropdown = shouldShow
      ? createPortal(
          <div style={dropdownStyle} role="listbox" id={listboxId}>
            <ScrollArea className={`bg-card border border-line-mid max-h-48 ${POPUP_SHADOW}`}>
              <div className="py-1">
                {options.map((option, index) => {
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={option.value}
                      id={`${listboxId}-option-${index}`}
                      ref={el => {
                        optionRefs.current[index] = el;
                      }}
                      role="option"
                      tabIndex={-1}
                      aria-selected={isHighlighted}
                      className={`px-3 py-1.5 cursor-pointer text-body transition-colors duration-150 ${
                        isHighlighted ? 'bg-foreground/5' : 'hover:bg-foreground/5'
                      }`}
                      onMouseDown={e => {
                        e.preventDefault();
                        handleSelect(option);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <span className="font-medium">{option.label}</span>
                      {option.secondary && (
                        <span className="text-foreground/50 ml-2 text-caption">
                          ({option.secondary})
                        </span>
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
      <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : ''}`}>
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
            `w-full h-9 px-3 text-body bg-[hsl(var(--input-well))] border ${stateBorder} text-foreground placeholder:text-foreground/40 transition-[border-color,background,box-shadow] duration-200 focus:outline-none focus:border-primary/70 focus:bg-primary/[0.04] focus:shadow-[var(--input-focus-shadow)] disabled:opacity-50 disabled:cursor-not-allowed`
          }
        />
        {dropdown}
      </div>
    );
  }
);

Autocomplete.displayName = 'Autocomplete';
