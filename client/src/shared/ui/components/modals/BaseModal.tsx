/**
 * Shared modal wrapper with built-in animation, focus trap, and keyboard handling.
 * Self-contained: manages its own exit animation timing and nested modal Escape support.
 */

import React from 'react';

import { X } from 'lucide-react';

import { useModalKeyboardNavigation } from '@shared/hooks/keyboard/useModalKeyboardNavigation';
import { useAnimatedClose } from '@shared/hooks/useAnimatedClose';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalAnimation = 'zoom' | 'slide';
export type TabOrientation = 'horizontal' | 'vertical';

export interface BaseModalProps {
  isOpen: boolean;
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  subtitle?: string;
  size?: ModalSize;
  /** Locks height at 85vh with scrollable content area */
  fixedHeight?: boolean;
  animation?: ModalAnimation;
  tabs?: React.ReactNode;
  tabOrientation?: TabOrientation;
  footer?: React.ReactNode;
  contentClassName?: string;
  dataAttribute?: string;
  className?: string;
  mode?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  full: 'max-w-[90vw]',
};

const ANIMATION_CLASSES: Record<ModalAnimation, { enter: string; exit: string }> = {
  zoom: { enter: 'animate-modal-reveal-in', exit: 'animate-modal-reveal-out' },
  slide: { enter: 'animate-modal-reveal-in', exit: 'animate-modal-reveal-out' },
};

const EXIT_DURATION_MS = 300;

export function BaseModal({
  isOpen,
  title,
  icon,
  onClose,
  children,
  subtitle,
  size = 'lg',
  fixedHeight = false,
  animation = 'zoom',
  tabs,
  tabOrientation = 'horizontal',
  footer,
  contentClassName = 'p-6',
  dataAttribute,
  className = '',
  mode,
}: BaseModalProps) {
  const { isVisible, isClosing, triggerClose } = useAnimatedClose({
    isOpen,
    onClose,
    exitDuration: EXIT_DURATION_MS,
  });

  // Focus trap must exist before keyboard hook so we can pass containerRef
  const trapRef = useFocusTrap({
    isOpen: isVisible,
    restoreFocus: true,
    autoFocusFirstInput: true,
  });

  // containerRef scopes Escape to this modal only (nested modal support)
  useModalKeyboardNavigation({
    onEscape: triggerClose,
    enabled: isVisible && !isClosing,
    containerRef: trapRef,
  });

  if (!isVisible) return null;

  const dataAttrs: Record<string, string> = {};
  if (dataAttribute) {
    dataAttrs[dataAttribute] = '';
  }
  if (mode) {
    dataAttrs['data-mode'] = mode;
  }

  const sizeClass = SIZE_CLASSES[size];
  const animationClasses = ANIMATION_CLASSES[animation];
  const modalAnimationClass = isClosing ? animationClasses.exit : animationClasses.enter;
  const backdropAnimationClass = isClosing
    ? 'animate-modal-backdrop-out'
    : 'animate-modal-backdrop-in';
  const heightClass = fixedHeight ? 'h-[85vh]' : 'max-h-[90vh]';
  const hasVerticalTabs = tabs && tabOrientation === 'vertical';
  const pointerEventsClass = isClosing ? 'pointer-events-none' : 'pointer-events-auto';

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 ${backdropAnimationClass} ${isClosing ? 'pointer-events-none' : ''}`}
        style={{ willChange: 'backdrop-filter' }}
      />

      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          {...dataAttrs}
          className={`bg-background rounded-2xl w-full ${sizeClass} mx-4 ${heightClass} shadow-2xl shadow-black/10 border border-border ${modalAnimationClass} ${pointerEventsClass} flex flex-col overflow-hidden ${className}`}
        >
          <div className="bg-background px-6 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 text-muted-foreground">{icon}</div>
                <div>
                  <h2 id="modal-title" className="text-lg font-bold text-foreground">
                    {title}
                  </h2>
                  {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
                </div>
              </div>
              <button
                onClick={triggerClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-secondary-foreground hover:bg-accent transition-colors focus-ring-default"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {tabs && tabOrientation === 'horizontal' && (
            <div className="flex-shrink-0 border-b border-border bg-background">{tabs}</div>
          )}

          <div className={`flex-1 min-h-0 flex ${hasVerticalTabs ? 'flex-row' : 'flex-col'}`}>
            {hasVerticalTabs && (
              <div className="w-48 bg-background border-r border-border py-4 flex-shrink-0">
                {tabs}
              </div>
            )}

            <div className={`flex-1 overflow-y-auto min-w-0 ${hasVerticalTabs ? '' : ''}`}>
              <div className={contentClassName}>{children}</div>
            </div>
          </div>

          {footer && (
            <div className="border-t border-border px-6 py-3 bg-background flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
