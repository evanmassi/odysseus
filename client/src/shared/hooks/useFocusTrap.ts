/**
 * Focus Trap Hook
 *
 * Traps keyboard focus within modal dialogs for WCAG 2.1 compliance.
 */

import { useRef, useEffect } from 'react';

interface UseFocusTrapOptions {
  isOpen?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  autoFocusFirstInput?: boolean;
}

export function useFocusTrap(options?: UseFocusTrapOptions): React.RefObject<HTMLDivElement> {
  const trapRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const { isOpen = true, initialFocusRef, autoFocusFirstInput = false } = options ?? {};

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const modal = trapRef.current;
    if (!modal) return;

    const timer = setTimeout(() => {
      let elementToFocus: HTMLElement | null = null;

      // Priority 1: Use specific ref if provided
      if (initialFocusRef?.current) {
        elementToFocus = initialFocusRef.current;
      }
      // Priority 2: Focus first input/textarea/select if autoFocusFirstInput enabled
      // Searches within <form> element first to respect semantic HTML boundaries
      // This skips warning banners, checkboxes, and other inputs outside the main form
      else if (autoFocusFirstInput) {
        const formElement = modal.querySelector('form');
        const searchContext = formElement ?? modal;
        const firstInput = searchContext.querySelector<HTMLElement>(FORM_INPUT_SELECTOR);
        elementToFocus = firstInput;

        // Fall back to first focusable if no form input found (e.g., lazy-loaded content)
        if (!elementToFocus) {
          const focusableElements = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
          elementToFocus = focusableElements[0] || null;
        }
      }
      // Priority 3: Default to first focusable element
      else {
        const focusableElements = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        elementToFocus = focusableElements[0] || null;
      }

      elementToFocus?.focus();
    }, INITIAL_FOCUS_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isOpen, initialFocusRef, autoFocusFirstInput]);

  // Tab/Shift+Tab focus cycling within modal
  // Note: Focus escape prevention is handled by the inert attribute on #root
  // via ModalPortal. This hook only handles cycling at modal boundaries.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const modal = trapRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return trapRef;
}

// 150ms balances modal animation time with perceived responsiveness.
// Too short = focus before render, too long = noticeable delay.
const INITIAL_FOCUS_DELAY_MS = 150;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(', ');

const FORM_INPUT_SELECTOR = [
  'input:not([disabled]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[contenteditable]',
].join(', ');
