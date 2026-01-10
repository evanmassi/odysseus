/**
 * BaseModal - Single source of truth for modal structure.
 *
 * Supports: size variants, tabs (horizontal/vertical), footers, animations.
 * All modals should use this for consistency and reduced technical debt.
 */

import React from 'react';

import { X } from 'lucide-react';

import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';

/** Size variants map to max-width classes */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/** Animation variants */
export type ModalAnimation = 'zoom' | 'slide';

/** Tab orientation for different layouts */
export type TabOrientation = 'horizontal' | 'vertical';

export interface BaseModalProps {
  /** Modal title text */
  title: string;

  /** Icon component to display before title */
  icon: React.ReactNode;

  /** Close handler */
  onClose: () => void;

  /** Modal content */
  children: React.ReactNode;

  /** Optional subtitle below title */
  subtitle?: string;

  /** Size variant (default: 'lg') */
  size?: ModalSize;

  /** Fixed height mode - enables scrollable content area */
  fixedHeight?: boolean;

  /** Animation style (default: 'zoom') */
  animation?: ModalAnimation;

  /** Tabs slot - renders based on tabOrientation */
  tabs?: React.ReactNode;

  /** Tab orientation (default: 'horizontal') */
  tabOrientation?: TabOrientation;

  /** Footer slot - renders at bottom with border */
  footer?: React.ReactNode;

  /** Optional classes for content area (default: 'p-6') */
  contentClassName?: string;

  /** Optional data attribute for testing/tracking */
  dataAttribute?: string;

  /** Optional additional classes for container */
  className?: string;

  /** Optional mode identifier (e.g., "edit", "create") */
  mode?: string;
}

/** Size to Tailwind class mapping */
const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  full: 'max-w-[90vw]',
};

const ANIMATION_CLASSES: Record<ModalAnimation, string> = {
  zoom: 'animate-modal-scale',
  slide: 'animate-modal-slide',
};

export function BaseModal({
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
  const trapRef = useFocusTrap({
    isOpen: true,
    restoreFocus: true,
    autoFocusFirstInput: true,
  });

  // Build data attributes object
  const dataAttrs: Record<string, string> = {};
  if (dataAttribute) {
    dataAttrs[dataAttribute] = '';
  }
  if (mode) {
    dataAttrs['data-mode'] = mode;
  }

  const sizeClass = SIZE_CLASSES[size];
  const animationClass = ANIMATION_CLASSES[animation];
  const heightClass = fixedHeight ? 'h-[85vh]' : 'max-h-[90vh]';
  const hasVerticalTabs = tabs && tabOrientation === 'vertical';

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 animate-modal-backdrop"
        style={{ willChange: 'backdrop-filter' }}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          ref={trapRef}
          {...dataAttrs}
          className={`bg-white rounded-2xl w-full ${sizeClass} mx-4 ${heightClass} shadow-2xl shadow-black/10 border border-gray-200 ${animationClass} pointer-events-auto flex flex-col overflow-hidden ${className}`}
        >
          {/* Header */}
          <div className="bg-white px-6 py-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 text-slate-500">{icon}</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                  {subtitle && <p className="text-slate-500 text-xs">{subtitle}</p>}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-ring-default"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Horizontal Tabs (if provided) */}
          {tabs && tabOrientation === 'horizontal' && (
            <div className="flex-shrink-0 border-b border-gray-200 bg-white">{tabs}</div>
          )}

          {/* Body - handles vertical tabs layout */}
          <div className={`flex-1 min-h-0 flex ${hasVerticalTabs ? 'flex-row' : 'flex-col'}`}>
            {/* Vertical Tabs Sidebar (if provided) */}
            {hasVerticalTabs && (
              <div className="w-48 bg-white border-r border-gray-200 py-4 flex-shrink-0">
                {tabs}
              </div>
            )}

            {/* Content Area */}
            <div className={`flex-1 overflow-y-auto min-w-0 ${hasVerticalTabs ? '' : ''}`}>
              <div className={contentClassName}>{children}</div>
            </div>
          </div>

          {/* Footer (if provided) */}
          {footer && (
            <div className="border-t border-gray-200 px-6 py-3 bg-white flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
