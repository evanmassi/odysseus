import { useRef, useEffect } from 'react';

interface UseFocusTrapOptions {
  isOpen?: boolean;
  restoreFocus?: boolean;
  initialFocusDelay?: number;
  initialFocusRef?: React.RefObject<HTMLElement>;
  autoFocusFirstInput?: boolean;
}

/**
 * Focus trap for modal dialogs
 *
 * Ensures keyboard focus stays within modal (WCAG 2.1 compliance)
 * and restores focus to trigger element when closed.
 *
 * @param options.isOpen - Whether modal is currently open
 * @param options.restoreFocus - Restore focus to trigger on close (default: true)
 * @param options.initialFocusDelay - Delay before initial focus in ms (default: 150ms)
 * @param options.initialFocusRef - Specific element to focus (takes priority)
 * @param options.autoFocusFirstInput - Focus first input/textarea/select instead of first focusable element
 * @returns Ref to attach to modal container element
 */
export function useFocusTrap(options?: UseFocusTrapOptions): React.RefObject<HTMLDivElement> {
  const trapRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const {
    isOpen = true,
    restoreFocus = true,
    // 150ms balances modal animation time with perceived responsiveness
    // Too short = focus before render, too long = noticeable delay
    initialFocusDelay = 150,
    initialFocusRef,
    autoFocusFirstInput = false
  } = options ?? {};

  // Save focus on mount and restore on close/unmount
  useEffect(() => {
    if (isOpen) {
      // Save currently focused element when modal opens
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Restore focus when modal closes (isOpen changes to false) or unmounts
    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, restoreFocus]);

  // Initial focus when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const modal = trapRef.current;
    if (!modal) return;

    // Delay allows modal animation to complete before focus shifts
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
      }
      // Priority 3: Default to first focusable element
      else {
        const focusableElements = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        elementToFocus = focusableElements[0] || null;
      }

      elementToFocus?.focus();
    }, initialFocusDelay);

    return () => clearTimeout(timer);
  }, [isOpen, initialFocusDelay, initialFocusRef, autoFocusFirstInput]);

  // Tab/Shift+Tab focus cycling
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

// Comprehensive selector covers all interactive elements
// Excludes disabled/hidden elements per WCAG guidelines
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
  '[contenteditable]'
].join(', ');

// Form input selector - focuses first typeable field (skips buttons, checkboxes, radios)
// Used when autoFocusFirstInput is enabled
const FORM_INPUT_SELECTOR = [
  'input:not([disabled]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[contenteditable]'
].join(', ');
