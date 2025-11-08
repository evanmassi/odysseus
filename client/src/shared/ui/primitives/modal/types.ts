/**
 * Modal Component Types
 * 
 * Type definitions for accessible Modal primitive components
 * Includes modal, modal header, modal footer, and modal body
 */

import type { ReactNode } from 'react';
import { ComponentProps } from 'react';

// Modal size types
export type ModalSize = 
  | 'xs'            // Extra small (384px max-width)
  | 'sm'            // Small (512px max-width)
  | 'md'            // Medium (768px max-width) - default
  | 'lg'            // Large (1024px max-width)
  | 'xl'            // Extra large (1280px max-width)
  | 'full';         // Full screen

// Modal variant types
export type ModalVariant = 
  | 'default'       // Standard modal
  | 'centered'      // Centered modal (default)
  | 'drawer'        // Side drawer modal
  | 'fullscreen';   // Fullscreen modal

// Modal placement for drawer variant
export type ModalPlacement = 
  | 'top'
  | 'right'
  | 'bottom'
  | 'left';

// Modal animation types
export type ModalAnimation = 
  | 'fade'          // Fade in/out
  | 'scale'         // Scale up/down
  | 'slide'         // Slide from placement direction
  | 'none';         // No animation

// Modal backdrop types
export type ModalBackdrop = 
  | 'default'       // Dark backdrop
  | 'light'         // Light backdrop
  | 'blur'          // Blurred backdrop
  | 'none';         // No backdrop

// Base modal props
export interface BaseModalProps {
  // Visibility
  isOpen: boolean;
  onClose: () => void;
  
  // Content
  children: ReactNode;
  
  // Styling
  variant?: ModalVariant;
  size?: ModalSize;
  placement?: ModalPlacement; // For drawer variant
  animation?: ModalAnimation;
  backdrop?: ModalBackdrop;
  
  // Behavior
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  preventClose?: boolean; // Prevent closing (for loading states)
  autoFocus?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
  lockBodyScroll?: boolean;
  
  // Accessibility
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  role?: 'dialog' | 'alertdialog';
  
  // Custom styling
  className?: string;
  backdropClassName?: string;
  contentClassName?: string;
  
  // Portal
  portalTarget?: Element | null;
  
  // Event handlers
  onOpen?: () => void;
  onOpened?: () => void;
  onClosing?: () => void;
  onClosed?: () => void;
  onBackdropClick?: (event: React.MouseEvent) => void;
  onEscapeKey?: (event: KeyboardEvent) => void;
}

// Modal ref type
export type ModalRef = HTMLDivElement;

// Main modal props
export interface ModalProps extends BaseModalProps {}

// Modal header props
export interface ModalHeaderProps {
  children: ReactNode;
  
  // Close button
  showCloseButton?: boolean;
  onClose?: () => void;
  closeButtonLabel?: string;
  
  // Styling
  className?: string;
  
  // Accessibility
  id?: string; // For aria-labelledby
}

// Modal body props
export interface ModalBodyProps {
  children: ReactNode;
  
  // Scrolling
  scrollable?: boolean;
  maxHeight?: string | number;
  
  // Padding
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  
  // Styling
  className?: string;
  
  // Accessibility
  id?: string; // For aria-describedby
}

// Modal footer props
export interface ModalFooterProps {
  children: ReactNode;
  
  // Layout
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  
  // Styling
  className?: string;
}

// Modal overlay props
export interface ModalOverlayProps {
  children: ReactNode;
  isOpen: boolean;
  backdrop?: ModalBackdrop;
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
}

// Modal content props
export interface ModalContentProps {
  children: ReactNode;
  variant?: ModalVariant;
  size?: ModalSize;
  placement?: ModalPlacement;
  animation?: ModalAnimation;
  className?: string;
}

// Modal portal props
export interface ModalPortalProps {
  children: ReactNode;
  target?: Element | null;
}

// Confirmation modal specific props
export interface ConfirmationModalProps extends Omit<BaseModalProps, 'children'> {
  // Content
  title: string;
  message: string | ReactNode;
  
  // Actions
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  
  // Styling
  confirmVariant?: 'primary' | 'danger' | 'success' | 'warning';
  isDestructive?: boolean;
  
  // State
  isLoading?: boolean;
  loadingText?: string;
}

// Alert modal specific props
export interface AlertModalProps extends Omit<BaseModalProps, 'children'> {
  // Content
  title: string;
  message: string | ReactNode;
  
  // Actions
  confirmText?: string;
  onConfirm?: () => void;
  
  // Type
  type?: 'info' | 'success' | 'warning' | 'error';
}

// Drawer modal specific props
export interface DrawerModalProps extends BaseModalProps {
  variant: 'drawer';
  placement?: ModalPlacement;
  width?: string | number; // For left/right drawers
  height?: string | number; // For top/bottom drawers
}

// Modal context type
export interface ModalContextValue {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  variant?: ModalVariant;
  headerId?: string;
  bodyId?: string;
}

// Modal style variants (for internal styling)
export interface ModalStyleVariants {
  variant: Record<ModalVariant, string>;
  size: Record<ModalSize, string>;
  placement: Record<ModalPlacement, string>;
  animation: Record<ModalAnimation, string>;
  backdrop: Record<ModalBackdrop, string>;
}

// Modal theme configuration
export interface ModalTheme {
  // Base styles
  overlay: string;
  content: string;
  
  // Variant styles
  variants: ModalStyleVariants['variant'];
  
  // Size styles
  sizes: ModalStyleVariants['size'];
  
  // Placement styles (for drawer)
  placements: ModalStyleVariants['placement'];
  
  // Animation styles
  animations: ModalStyleVariants['animation'];
  
  // Backdrop styles
  backdrops: ModalStyleVariants['backdrop'];
  
  // Component styles
  header: {
    base: string;
    closeButton: string;
  };
  
  body: {
    base: string;
    scrollable: string;
    padding: Record<'none' | 'sm' | 'md' | 'lg' | 'xl', string>;
  };
  
  footer: {
    base: string;
    justify: Record<'start' | 'center' | 'end' | 'between' | 'around', string>;
  };
}

// Default props
export const defaultModalProps: Partial<ModalProps> = {
  variant: 'centered',
  size: 'md',
  placement: 'right',
  animation: 'fade',
  backdrop: 'default',
  closeOnEscape: true,
  closeOnBackdropClick: true,
  preventClose: false,
  autoFocus: true,
  restoreFocus: true,
  trapFocus: true,
  lockBodyScroll: true,
  role: 'dialog',
};

export const defaultModalHeaderProps: Partial<ModalHeaderProps> = {
  showCloseButton: true,
  closeButtonLabel: 'Close modal',
};

export const defaultModalBodyProps: Partial<ModalBodyProps> = {
  scrollable: true,
  padding: 'md',
};

export const defaultModalFooterProps: Partial<ModalFooterProps> = {
  justify: 'end',
  spacing: 'md',
};

// Type guards
export const isModalSize = (value: string): value is ModalSize => {
  return ['xs', 'sm', 'md', 'lg', 'xl', 'full'].includes(value);
};

export const isModalVariant = (value: string): value is ModalVariant => {
  return ['default', 'centered', 'drawer', 'fullscreen'].includes(value);
};

export const isModalPlacement = (value: string): value is ModalPlacement => {
  return ['top', 'right', 'bottom', 'left'].includes(value);
};

export const isModalAnimation = (value: string): value is ModalAnimation => {
  return ['fade', 'scale', 'slide', 'none'].includes(value);
};

export const isModalBackdrop = (value: string): value is ModalBackdrop => {
  return ['default', 'light', 'blur', 'none'].includes(value);
};
