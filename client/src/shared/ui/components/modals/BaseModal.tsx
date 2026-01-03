/**
 * BaseModal - Modal Wrapper with Focus Trapping
 *
 * Single source of truth for modal visual structure across the application.
 * Handles presentation and accessibility (focus trapping, WCAG 2.1 compliance).
 *
 * Pattern: Composition over configuration
 * - Visual consistency without rigid constraints
 * - Built-in focus trap for keyboard accessibility
 * - Each modal retains full control over behavior
 *
 * @example
 * <BaseModal
 *   icon={<Pencil />}
 *   title="Edit Tube"
 *   onClose={onClose}
 *   dataAttribute="data-tube-modal"
 * >
 *   <form>...</form>
 * </BaseModal>
 */

import React from 'react';

import { X } from 'lucide-react';

import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';

export interface BaseModalProps {
  /** Modal title text */
  title: string;

  /** Icon component to display before title */
  icon: React.ReactNode;

  /** Close handler */
  onClose: () => void;

  /** Modal content */
  children: React.ReactNode;

  /** Optional data attribute for testing/tracking (e.g., "data-tube-modal") */
  dataAttribute?: string;

  /** Optional additional classes for container */
  className?: string;

  /** Optional mode identifier (e.g., "edit", "create") */
  mode?: string;
}

/**
 * BaseModal Component
 *
 * Provides consistent visual structure and accessibility:
 * - Backdrop with blur
 * - Header with icon, title, and close button
 * - Content area with controlled padding
 * - Standardized animations and shadows
 * - Built-in focus trapping (WCAG 2.1 compliant)
 */
export function BaseModal({
  title,
  icon,
  onClose,
  children,
  dataAttribute,
  className = '',
  mode,
}: BaseModalProps) {
  // Focus trap for keyboard accessibility
  // Automatically restores focus to trigger element when modal closes
  // autoFocusFirstInput skips buttons and focuses first input/textarea/select
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

  return (
    <ModalPortal>
      {/* Backdrop - Static, no animation, GPU accelerated */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-50"
        style={{ willChange: 'backdrop-filter' }}
      />

      {/* Modal Content - Animated separately */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          ref={trapRef}
          {...dataAttrs}
          className={`bg-odysseus-surface rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/10 animate-zoom-in-98 pointer-events-auto ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 text-slate-500">{icon}</div>
              <h2 className="text-xl font-semibold text-odysseus-dark">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-enhanced"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-3">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}
