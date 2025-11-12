/**
 * Modal Component
 * 
 * Accessible modal primitive with focus trapping, escape handling, and backdrop
 * Supports multiple sizes, variants, animations, and full WCAG AA compliance
 */

import React, { createContext, useContext, useEffect, forwardRef, useId } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { createPortal } from 'react-dom';

import { useModalFocusTrap } from '../../../hooks/keyboard';

import {
  defaultModalProps,
  defaultModalHeaderProps,
  defaultModalBodyProps,
  defaultModalFooterProps
} from './types';
import { useModal } from './useModal';


import type { 
  ModalProps, 
  ModalHeaderProps, 
  ModalBodyProps, 
  ModalFooterProps,
  ModalRef,
  ModalContextValue} from './types';

// Modal context for sharing state between components
const ModalContext = createContext<ModalContextValue | null>(null);

// Hook to use modal context
const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('Modal components must be used within a Modal');
  }
  return context;
};

// Modal overlay styling
const overlayVariants = cva(
  [
    // Base overlay styles
    'fixed inset-0 z-modal',
    'flex items-center justify-center',
    'transition-all duration-200 ease-out',
  ],
  {
    variants: {
      backdrop: {
        default: 'bg-black bg-opacity-50',
        light: 'bg-white bg-opacity-75',
        blur: 'bg-black bg-opacity-25 backdrop-blur-sm',
        none: 'bg-transparent',
      },
      isOpen: {
        true: 'opacity-100',
        false: 'opacity-0 pointer-events-none',
      },
    },
    defaultVariants: {
      backdrop: 'default',
      isOpen: false,
    },
  }
);

// Modal content styling
const contentVariants = cva(
  [
    // Base content styles
    'relative z-10',
    'bg-white rounded-lg',
    'shadow-xl',
    'transition-all duration-200 ease-out',
    'max-h-screen overflow-hidden',
    'focus:outline-none',
  ],
  {
    variants: {
      variant: {
        default: 'mx-4',
        centered: 'mx-4',
        drawer: 'h-full',
        fullscreen: 'w-screen h-screen rounded-none',
      },
      size: {
        xs: 'w-full max-w-xs',      // 384px
        sm: 'w-full max-w-sm',      // 512px  
        md: 'w-full max-w-md',      // 768px
        lg: 'w-full max-w-lg',      // 1024px
        xl: 'w-full max-w-xl',      // 1280px
        full: 'w-full max-w-full',  // Full width
      },
      animation: {
        fade: '',
        scale: 'transform-gpu',
        slide: 'transform-gpu',
        none: '',
      },
      placement: {
        top: 'rounded-t-none',
        right: 'rounded-r-none ml-auto h-full',
        bottom: 'rounded-b-none',
        left: 'rounded-l-none mr-auto h-full',
      },
      isOpen: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      // Scale animation states
      {
        animation: 'scale',
        isOpen: true,
        className: 'scale-100',
      },
      {
        animation: 'scale', 
        isOpen: false,
        className: 'scale-95',
      },
      
      // Slide animation states for drawer
      {
        variant: 'drawer',
        placement: 'right',
        isOpen: true,
        className: 'translate-x-0',
      },
      {
        variant: 'drawer',
        placement: 'right',
        isOpen: false,
        className: 'translate-x-full',
      },
      {
        variant: 'drawer',
        placement: 'left',
        isOpen: true,
        className: 'translate-x-0',
      },
      {
        variant: 'drawer',
        placement: 'left',
        isOpen: false,
        className: '-translate-x-full',
      },
      {
        variant: 'drawer',
        placement: 'top',
        isOpen: true,
        className: 'translate-y-0',
      },
      {
        variant: 'drawer',
        placement: 'top',
        isOpen: false,
        className: '-translate-y-full',
      },
      {
        variant: 'drawer',
        placement: 'bottom',
        isOpen: true,
        className: 'translate-y-0',
      },
      {
        variant: 'drawer',
        placement: 'bottom',
        isOpen: false,
        className: 'translate-y-full',
      },
      
      // Fullscreen variant
      {
        variant: 'fullscreen',
        size: 'full',
        className: 'max-w-none max-h-none',
      },
      
      // Drawer specific sizing
      {
        variant: 'drawer',
        size: 'xs',
        className: 'max-w-xs',
      },
      {
        variant: 'drawer',
        size: 'sm',
        className: 'max-w-sm',
      },
      {
        variant: 'drawer',
        size: 'md',
        className: 'max-w-md',
      },
      {
        variant: 'drawer',
        size: 'lg',
        className: 'max-w-lg',
      },
      {
        variant: 'drawer',
        size: 'xl',
        className: 'max-w-xl',
      },
    ],
    defaultVariants: {
      variant: 'centered',
      size: 'md',
      animation: 'fade',
      placement: 'right',
      isOpen: false,
    },
  }
);

// Close button component
interface CloseButtonProps {
  onClose: () => void;
  label?: string;
  className?: string;
}

const CloseButton: React.FC<CloseButtonProps> = ({ onClose, label = 'Close', className = '' }) => (
  <button
    type="button"
    onClick={onClose}
    className={`
      btn absolute top-4 right-4 z-10
      p-1 rounded-md
      text-neutral-400 hover:text-neutral-600
      hover:bg-neutral-100
      transition-colors duration-150
      ${className}
    `}
    aria-label={label}
  >
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </button>
);

// Main Modal component
export const Modal = forwardRef<ModalRef, ModalProps>(
  (
    {
      // Core props
      isOpen,
      onClose,
      children,
      
      // Styling props
      variant = defaultModalProps.variant,
      size = defaultModalProps.size,
      placement = defaultModalProps.placement,
      animation = defaultModalProps.animation,
      backdrop = defaultModalProps.backdrop,
      className,
      backdropClassName,
      contentClassName,
      
      // Behavior props
      closeOnEscape = defaultModalProps.closeOnEscape,
      closeOnBackdropClick = defaultModalProps.closeOnBackdropClick,
      preventClose = defaultModalProps.preventClose,
      autoFocus = defaultModalProps.autoFocus,
      restoreFocus = defaultModalProps.restoreFocus,
      trapFocus = defaultModalProps.trapFocus,
      lockBodyScroll = defaultModalProps.lockBodyScroll,
      
      // Accessibility props
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      role = defaultModalProps.role,
      
      // Portal props
      portalTarget,
      
      // Event handlers
      onOpen,
      onOpened,
      onClosing,
      onClosed,
      onBackdropClick,
      onEscapeKey,
      
      ...props
    },
    ref
  ) => {
    // Use modal hook for accessibility features
    const { modalRef, handleBackdropClick } = useModal({
      autoFocus,
      restoreFocus,
      trapFocus,
      closeOnEscape: closeOnEscape && !preventClose,
      closeOnBackdropClick: closeOnBackdropClick && !preventClose,
      lockBodyScroll,
    });
    
    // Enhanced focus trap with keyboard navigation
    const focusTrap = useModalFocusTrap({
      autoFocus,
      returnFocus: restoreFocus,
    });
    
    // Generate unique IDs for accessibility
    const headerId = `modal-header-${useId()}`;
    const bodyId = `modal-body-${useId()}`;
    
    // Handle lifecycle events
    useEffect(() => {
      if (isOpen) {
        onOpen?.();
        // Delay for animation
        const timer = setTimeout(() => onOpened?.(), 200);
        return () => clearTimeout(timer);
      } else {
        onClosing?.();
        // Delay for animation
        const timer = setTimeout(() => onClosed?.(), 200);
        return () => clearTimeout(timer);
      }
    }, [isOpen, onOpen, onOpened, onClosing, onClosed]);
    
    // Handle escape key
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen && closeOnEscape && !preventClose) {
          onEscapeKey?.(event);
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, preventClose, onClose, onEscapeKey]);
    
    // Handle backdrop click
    const handleBackdropClickInternal = (event: React.MouseEvent) => {
      if (event.target === event.currentTarget && closeOnBackdropClick && !preventClose) {
        onBackdropClick?.(event);
        onClose();
      }
      handleBackdropClick(event);
    };
    
    // Generate classes
    const overlayClasses = overlayVariants({ 
      backdrop,
      isOpen,
      className: `${backdropClassName ?? ''} ${className ?? ''}`
    });
    
    const contentClasses = contentVariants({
      variant,
      size,
      animation,
      placement,
      isOpen,
      className: contentClassName,
    });
    
    // Modal context value
    const contextValue: ModalContextValue = {
      isOpen,
      onClose,
      size,
      variant,
      headerId,
      bodyId,
    };
    
    // Don't render anything if not open (unless animating)
    if (!isOpen) return null;
    
    // Portal target
    const target = portalTarget ?? (typeof window !== 'undefined' ? document.body : null);
    if (!target) return null;
    
    // Modal content
    const modalContent = (
      <div
        className={overlayClasses}
        onClick={handleBackdropClickInternal}
        role="presentation"
      >
        <div
          ref={(element) => {
            // Use type assertion to safely assign to mutable refs
            (modalRef as React.MutableRefObject<HTMLDivElement | null>).current = element;
            (focusTrap as React.MutableRefObject<HTMLElement | null>).current = element;
            if (typeof ref === 'function') {
              ref(element);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLDivElement | null>).current = element;
            }
          }}
          className={contentClasses}
          role={role}
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy ?? headerId}
          aria-describedby={ariaDescribedBy ?? bodyId}
          tabIndex={-1}
          {...props}
        >
          <ModalContext.Provider value={contextValue}>
            {children}
          </ModalContext.Provider>
        </div>
      </div>
    );
    
    return createPortal(modalContent, target);
  }
);

// Modal Header component
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  showCloseButton = defaultModalHeaderProps.showCloseButton,
  onClose,
  closeButtonLabel = defaultModalHeaderProps.closeButtonLabel,
  className = '',
  id,
}) => {
  const { onClose: contextOnClose, headerId } = useModalContext();
  const finalOnClose = onClose ?? contextOnClose;
  const finalId = id ?? headerId;
  
  return (
    <div
      id={finalId}
      className={`
        relative px-6 py-4 border-b border-neutral-200
        ${className}
      `}
    >
      {children}
      {showCloseButton && (
        <CloseButton 
          onClose={finalOnClose} 
          label={closeButtonLabel}
        />
      )}
    </div>
  );
};

// Modal Body component  
export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  scrollable = defaultModalBodyProps.scrollable,
  maxHeight,
  padding = defaultModalBodyProps.padding,
  className = '',
  id,
}) => {
  const { bodyId } = useModalContext();
  const finalId = id ?? bodyId;
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };
  
  const scrollableClasses = scrollable 
    ? 'overflow-y-auto' 
    : 'overflow-hidden';
  
  const style = maxHeight ? { maxHeight } : undefined;
  
  return (
    <div
      id={finalId}
      className={`
        ${paddingClasses[padding!]} 
        ${scrollableClasses}
        ${className}
      `}
      style={style}
    >
      {children}
    </div>
  );
};

// Modal Footer component
export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  justify = defaultModalFooterProps.justify,
  spacing = defaultModalFooterProps.spacing,
  className = '',
}) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };
  
  const spacingClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };
  
  return (
    <div
      className={`
        flex items-center px-6 py-4 
        border-t border-neutral-200 
        ${justifyClasses[justify!]} 
        ${spacingClasses[spacing!]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Display names for debugging
Modal.displayName = 'Modal';
ModalHeader.displayName = 'ModalHeader';
ModalBody.displayName = 'ModalBody';
ModalFooter.displayName = 'ModalFooter';

// Export types for external use
export type ModalVariantsProps = VariantProps<typeof contentVariants>;
