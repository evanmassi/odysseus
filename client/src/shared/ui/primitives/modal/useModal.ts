/**
 * useModal Hook
 * 
 * React hook for managing modal state and accessibility features
 * Includes focus trapping, escape key handling, and body scroll lock
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

// Modal configuration options
export interface ModalOptions {
  // Focus management
  autoFocus?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
  
  // Keyboard handling
  closeOnEscape?: boolean;
  
  // Backdrop behavior
  closeOnBackdropClick?: boolean;
  
  // Body scroll lock
  lockBodyScroll?: boolean;
  
  // Animation
  animationDuration?: number;
}

// Default modal options
const defaultOptions: ModalOptions = {
  autoFocus: true,
  restoreFocus: true,
  trapFocus: true,
  closeOnEscape: true,
  closeOnBackdropClick: true,
  lockBodyScroll: true,
  animationDuration: 200,
};

// Focus trap utility
const createFocusTrap = (element: HTMLElement) => {
  const getFocusableElements = (): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');
    
    return Array.from(element.querySelectorAll(focusableSelectors)) as HTMLElement[];
  };
  
  const handleTabKey = (event: KeyboardEvent) => {
    const focusableElements = getFocusableElements();
    
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  const activate = () => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
    
    element.addEventListener('keydown', handleTabKey);
  };
  
  const deactivate = () => {
    element.removeEventListener('keydown', handleTabKey);
  };
  
  return { activate, deactivate };
};

// Body scroll lock utility
const bodyScrollLock = {
  locked: false,
  originalOverflow: '',
  originalPaddingRight: '',
  
  lock() {
    if (this.locked) return;
    
    // Store original values
    this.originalOverflow = document.body.style.overflow;
    this.originalPaddingRight = document.body.style.paddingRight;
    
    // Calculate scrollbar width
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Apply lock styles
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    this.locked = true;
  },
  
  unlock() {
    if (!this.locked) return;
    
    // Restore original values
    document.body.style.overflow = this.originalOverflow;
    document.body.style.paddingRight = this.originalPaddingRight;
    
    this.locked = false;
  },
};

// Main useModal hook
export const useModal = (options: ModalOptions = {}) => {
  // Memoize config to prevent infinite loops in hook dependencies
  const config = useMemo(
    () => ({ ...defaultOptions, ...options }),
    [options]
  );
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const focusTrapRef = useRef<{ activate: () => void; deactivate: () => void } | null>(null);
  
  // Handle modal opening
  const handleOpen = useCallback(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;
    
    // Store currently focused element
    if (config.restoreFocus) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }
    
    // Lock body scroll
    if (config.lockBodyScroll) {
      bodyScrollLock.lock();
    }
    
    // Setup focus trap
    if (config.trapFocus) {
      focusTrapRef.current = createFocusTrap(modalElement);
      focusTrapRef.current.activate();
    }
    
    // Auto focus modal or first focusable element
    if (config.autoFocus) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        if (modalElement.hasAttribute('tabindex')) {
          modalElement.focus();
        } else {
          const firstFocusable = modalElement.querySelector(
            'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            modalElement.focus();
          }
        }
      }, config.animationDuration);
    }
  }, [config]);
  
  // Handle modal closing
  const handleClose = useCallback(() => {
    // Deactivate focus trap
    if (focusTrapRef.current) {
      focusTrapRef.current.deactivate();
      focusTrapRef.current = null;
    }
    
    // Unlock body scroll
    if (config.lockBodyScroll) {
      bodyScrollLock.unlock();
    }
    
    // Restore focus
    if (config.restoreFocus && previousActiveElementRef.current) {
      // Small delay to ensure modal is removed from DOM
      setTimeout(() => {
        previousActiveElementRef.current?.focus();
        previousActiveElementRef.current = null;
      }, config.animationDuration);
    }
  }, [config]);
  
  // Handle escape key
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (config.closeOnEscape && event.key === 'Escape') {
      event.preventDefault();
      handleClose();
      
      // Dispatch custom close event
      const closeEvent = new CustomEvent('modal:close', {
        detail: { reason: 'escape' },
      });
      modalRef.current?.dispatchEvent(closeEvent);
    }
  }, [config.closeOnEscape, handleClose]);
  
  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (config.closeOnBackdropClick && event.target === event.currentTarget) {
      event.preventDefault();
      handleClose();
      
      // Dispatch custom close event
      const closeEvent = new CustomEvent('modal:close', {
        detail: { reason: 'backdrop' },
      });
      modalRef.current?.dispatchEvent(closeEvent);
    }
  }, [config.closeOnBackdropClick, handleClose]);
  
  // Setup event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleEscape]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Ensure cleanup happens even if component unmounts unexpectedly
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
      }
      
      if (config.lockBodyScroll && bodyScrollLock.locked) {
        bodyScrollLock.unlock();
      }
      
      if (config.restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [config.lockBodyScroll, config.restoreFocus]);
  
  return {
    modalRef,
    handleOpen,
    handleClose,
    handleBackdropClick,
    config,
  };
};

// Utility hook for modal state management
export interface UseModalStateOptions {
  initialOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export const useModalState = (options: UseModalStateOptions = {}) => {
  const { initialOpen = false, onOpen, onClose } = options;
  const [isOpen, setIsOpen] = useState(initialOpen);
  
  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);
  
  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);
  
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);
  
  return {
    isOpen,
    open,
    close,
    toggle,
  };
};
