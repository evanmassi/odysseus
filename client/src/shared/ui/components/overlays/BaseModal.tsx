/**
 * Base Modal
 *
 * Reusable modal with animation, focus trap, and nested Escape support
 */
import React from 'react';

import { X } from 'lucide-react';

import { useAnimatedClose, useFocusTrap, useModalKeyboardNavigation } from '@shared/hooks';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { NubDivider } from '@shared/ui/primitives/nub-divider/NubDivider';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';

import { ModalPortal } from './ModalPortal';

export type ModalSize = 'sm' | 'md' | 'md-lg' | 'lg' | 'xl' | 'full';
export type ModalAnimation = 'zoom' | 'slide';
export type TabOrientation = 'horizontal' | 'vertical';
export type ModalChassis = 'default' | 'lit';

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
  /** Footer pinned to the bottom of the tab content area (above the modal footer) */
  tabFooter?: React.ReactNode;
  /** Content pinned to the bottom of the vertical tab sidebar */
  tabSidebarFooter?: React.ReactNode;
  /** Surface treatment: 'default' = bg-card rounded card; 'lit' = ConsolePanel with primary emission. */
  chassis?: ModalChassis;
  /** Strip rendered between header and body. Only honored when chassis='lit'. */
  locator?: React.ReactNode;
  contentClassName?: string;
  dataAttribute?: string;
  className?: string;
  mode?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  'md-lg': 'max-w-[736px]',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  full: 'max-w-[90vw]',
};

const ANIMATION_CLASSES: Record<ModalAnimation, { enter: string; exit: string }> = {
  zoom: { enter: 'animate-modal-reveal-in', exit: 'animate-modal-reveal-out' },
  slide: { enter: 'animate-modal-reveal-in', exit: 'animate-modal-reveal-out' }, // TODO: implement distinct slide animation
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
  tabFooter,
  tabSidebarFooter,
  chassis = 'lit',
  locator,
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
  const isLit = chassis === 'lit';
  const chassisIntensity = size === 'lg' || size === 'xl' || size === 'full' ? 'medium' : 'lit';

  const borderClass = isLit ? 'border-line-faint' : 'border-border';
  // Lit chrome (footer/tabs/sidebar) gets a dark wash so it sits on top of the
  // chassis lighting. The header stays transparent so it reads body-tone — the
  // light is concentrated inside the form, framed by the dark locator + footer.
  const surfaceClass = isLit ? 'bg-shade/15' : 'bg-card';
  const headerSurface = isLit ? '' : 'bg-card';

  const headerBlock = (
    <div className={`${headerSurface} px-6 py-3 border-b ${borderClass} flex-shrink-0`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 text-muted-foreground">{icon}</div>
          <div>
            <h2
              id="modal-title"
              className={
                isLit
                  ? 'text-lg font-medium text-foreground'
                  : 'text-lg font-bold text-card-foreground'
              }
            >
              {title}
            </h2>
            {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
          </div>
        </div>
        <button
          onClick={triggerClose}
          className={`p-1.5 ${isLit ? '' : 'rounded-lg'} text-muted-foreground hover:text-foreground ${isLit ? 'hover:bg-foreground/5' : 'hover:bg-accent'} transition-colors`}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );

  const locatorBlock =
    isLit && locator ? (
      <div className="relative flex-shrink-0 border-b border-line-faint bg-surface-void shadow-[inset_0_1px_3px_hsl(var(--recess)/0.45),inset_0_0_0_1px_hsl(var(--foreground)/0.05)] dark:bg-shade/35 dark:shadow-none px-6 py-2.5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/[0.05]"
        />
        {locator}
        <NubDivider tone="primary" className="absolute inset-x-0 -bottom-px" />
      </div>
    ) : null;

  const bodyBlock = (
    <div className={`flex-1 min-h-0 flex ${hasVerticalTabs ? 'flex-row' : 'flex-col'}`}>
      {hasVerticalTabs && (
        <div
          className={`w-48 ${surfaceClass} border-r ${borderClass} py-4 flex-shrink-0 flex flex-col`}
        >
          <div className="flex-1">{tabs}</div>
          {tabSidebarFooter && <div className="px-3 pb-2">{tabSidebarFooter}</div>}
        </div>
      )}

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <ScrollArea className="flex-1" tabIndex={-1}>
          <div className={contentClassName}>{children}</div>
        </ScrollArea>

        {tabFooter && (
          <div className={`border-t ${borderClass} px-6 py-2 ${surfaceClass} flex-shrink-0`}>
            {tabFooter}
          </div>
        )}
      </div>
    </div>
  );

  const footerBlock = footer ? (
    <div className={`relative border-t ${borderClass} px-6 py-3 ${surfaceClass} flex-shrink-0`}>
      {isLit && <NubDivider tone="primary" className="absolute inset-x-0 -top-px" />}
      {footer}
    </div>
  ) : null;

  const tabsBlock =
    tabs && tabOrientation === 'horizontal' ? (
      <div className={`flex-shrink-0 border-b ${borderClass} ${surfaceClass}`}>{tabs}</div>
    ) : null;

  const innerChildren = (
    <>
      {headerBlock}
      {locatorBlock}
      {tabsBlock}
      {bodyBlock}
      {footerBlock}
    </>
  );

  const sharedClassName = `w-full ${sizeClass} mx-4 ${heightClass} ${modalAnimationClass} ${pointerEventsClass} flex flex-col overflow-hidden ${className}`;

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 bg-[hsl(var(--overlay))] z-50 ${backdropAnimationClass} ${isClosing ? 'pointer-events-none' : ''}`}
      />

      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        {isLit ? (
          <ConsolePanel
            intensity={chassisIntensity}
            className={sharedClassName}
            // ConsolePanel renders its own border; we add the dialog role and refs via wrapper props.
          >
            <div
              ref={trapRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              {...dataAttrs}
              className="flex flex-1 flex-col min-h-0"
            >
              {innerChildren}
            </div>
          </ConsolePanel>
        ) : (
          <div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            {...dataAttrs}
            className={`bg-card rounded-2xl shadow-2xl shadow-black/10 border border-border ${sharedClassName}`}
          >
            {innerChildren}
          </div>
        )}
      </div>
    </ModalPortal>
  );
}
