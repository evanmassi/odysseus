/**
 * Keyboard Hooks Index
 *
 * Centralized export of all keyboard navigation and focus management hooks
 */

// Import all hooks first

import {
  useKeyboardNavigation,
  useTubeGridKeyboardNavigation,
  useListKeyboardNavigation,
} from './useKeyboardNavigation';

import {
  useFocusTrap,
  useModalFocusTrap,
  useDropdownFocusTrap,
  useFocusRestore,
  useSkipLinks,
} from './useFocusTrap';

import {
  useTabOrder,
  useFormTabOrder,
} from './useTabOrder';

// Navigation hooks
export {
  useKeyboardNavigation,
  useTubeGridKeyboardNavigation,
  useListKeyboardNavigation,
};

export type {
  GridPosition,
  SelectionRange,
  KeyboardNavigationConfig,
} from './useKeyboardNavigation';

// Focus management hooks
export {
  useFocusTrap,
  useModalFocusTrap,
  useDropdownFocusTrap,
  useFocusRestore,
  useSkipLinks,
};

export type {
  FocusTrapConfig,
} from './useFocusTrap';

// Tab order hooks
export {
  useTabOrder,
  useFormTabOrder,
};

export type {
  TabOrderItem,
  TabOrderConfig,
} from './useTabOrder';

// Consolidated keyboard utilities
export const KeyboardHooks = {
  // Navigation
  useKeyboardNavigation,
  useTubeGridKeyboardNavigation,
  useListKeyboardNavigation,

  // Focus management
  useFocusTrap,
  useModalFocusTrap,
  useDropdownFocusTrap,
  useFocusRestore,
  useSkipLinks,

  // Tab order
  useTabOrder,
  useFormTabOrder,
} as const;
