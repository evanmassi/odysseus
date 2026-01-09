/**
 * Modal Store
 *
 * Declarative modal API with complete lifecycle management.
 */

import type { ReactNode } from 'react';

import { create } from 'zustand';

import { type PositionKey } from '@shared/types/GridSelection';

interface DeleteConfirmState {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  previousFocusElement?: HTMLElement | null;
}

interface OverwriteConfirmState {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  previousFocusElement?: HTMLElement | null;
}

interface UnsavedConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  previousFocusElement?: HTMLElement | null;
}

interface TubeEditorModalState {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'batch';
  tubeId?: string; // Single edit mode - tube ID only
  tubeIds?: string[]; // Batch edit mode - tube IDs only
  positions?: PositionKey[]; // Add mode - position keys
  rackId?: string;
  boxId?: string;
  previousFocusElement?: HTMLElement | null;
  preserveSelection?: boolean; // Don't restore focus to specific position (for batch operations)
}

interface LockTubesModalState {
  isOpen: boolean;
  tubeIds: string[];
  previousFocusElement?: HTMLElement | null;
}

interface ShareAccessModalState {
  isOpen: boolean;
  tubeIds: string[];
  previousFocusElement?: HTMLElement | null;
}

interface SessionTimeoutWarningState {
  isOpen: boolean;
  timeRemainingMs: number;
  onStayLoggedIn: () => void;
  onLogout: (reason: 'manual' | 'timeout') => void;
}

interface LocalModalState {
  deleteConfirm: DeleteConfirmState;
  overwriteConfirm: OverwriteConfirmState;
  unsavedConfirm: UnsavedConfirmState;
  tubeEditorModal: TubeEditorModalState;
  lockTubesModal: LockTubesModalState;
  shareAccessModal: ShareAccessModalState;
  sessionTimeoutWarning: SessionTimeoutWarningState;
}

interface ModalActions {
  showDeleteConfirm: (config: {
    title: string;
    message: ReactNode;
    confirmText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  hideDeleteConfirm: () => void;

  showOverwriteConfirm: (config: {
    title: string;
    message: ReactNode;
    confirmText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  hideOverwriteConfirm: () => void;

  showUnsavedConfirm: (config: {
    title?: string;
    message?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  hideUnsavedConfirm: () => void;

  showTubeEditorModal: (config: {
    mode: 'add' | 'edit' | 'batch';
    tubeId?: string; // Single edit mode
    tubeIds?: string[]; // Batch edit mode
    positions?: PositionKey[]; // Add mode
    rackId?: string;
    boxId?: string;
    preserveSelection?: boolean; // Don't restore focus to specific position (for batch operations)
  }) => void;
  hideTubeEditorModal: () => void;

  showLockTubesModal: (tubeIds: string[]) => void;
  hideLockTubesModal: () => void;

  showShareAccessModal: (tubeIds: string[]) => void;
  hideShareAccessModal: () => void;

  showSessionTimeoutWarning: (config: {
    timeRemainingMs: number;
    onStayLoggedIn: () => void;
    onLogout: (reason: 'manual' | 'timeout') => void;
  }) => void;
  updateSessionTimeoutWarning: (timeRemainingMs: number) => void;
  hideSessionTimeoutWarning: () => void;

  hideAllModals: () => void;
}

const initialDeleteConfirm: DeleteConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  onCancel: () => {},
};

const initialOverwriteConfirm: OverwriteConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  onCancel: () => {},
};

const initialUnsavedConfirm: UnsavedConfirmState = {
  isOpen: false,
  title: 'Unsaved Changes',
  message: 'You have unsaved changes. Are you sure you want to close?',
  onConfirm: () => {},
  onCancel: () => {},
};

const initialTubeEditorModal: TubeEditorModalState = {
  isOpen: false,
  mode: 'add',
};

const initialLockTubesModal: LockTubesModalState = {
  isOpen: false,
  tubeIds: [],
};

const initialShareAccessModal: ShareAccessModalState = {
  isOpen: false,
  tubeIds: [],
};

const initialSessionTimeoutWarning: SessionTimeoutWarningState = {
  isOpen: false,
  timeRemainingMs: 0,
  onStayLoggedIn: () => {},
  onLogout: (_reason: 'manual' | 'timeout') => {},
};

/**
 * Global modal store
 *
 * Export the raw store for direct access (e.g., getState() from non-React code)
 */
export const modalStore = create<LocalModalState & ModalActions>((set, get) => ({
  // Initial state
  deleteConfirm: initialDeleteConfirm,
  overwriteConfirm: initialOverwriteConfirm,
  unsavedConfirm: initialUnsavedConfirm,
  tubeEditorModal: initialTubeEditorModal,
  lockTubesModal: initialLockTubesModal,
  shareAccessModal: initialShareAccessModal,
  sessionTimeoutWarning: initialSessionTimeoutWarning,

  // Delete confirmation actions
  showDeleteConfirm: config => {
    // Capture focus BEFORE modal opens (before React renders)
    const previousFocusElement = document.activeElement as HTMLElement;

    set({
      deleteConfirm: {
        isOpen: true,
        title: config.title,
        message: config.message,
        confirmText: config.confirmText,
        onConfirm: config.onConfirm,
        onCancel: config.onCancel ?? (() => get().hideDeleteConfirm()),
        previousFocusElement,
      },
    });
  },

  hideDeleteConfirm: () => {
    set({ deleteConfirm: initialDeleteConfirm });
  },

  // Overwrite confirmation actions
  showOverwriteConfirm: config => {
    // Capture focus BEFORE modal opens (before React renders)
    const previousFocusElement = document.activeElement as HTMLElement;

    set({
      overwriteConfirm: {
        isOpen: true,
        title: config.title,
        message: config.message,
        confirmText: config.confirmText,
        onConfirm: config.onConfirm,
        onCancel: config.onCancel ?? (() => get().hideOverwriteConfirm()),
        previousFocusElement,
      },
    });
  },

  hideOverwriteConfirm: () => {
    set({ overwriteConfirm: initialOverwriteConfirm });
  },

  // Unsaved changes confirmation actions
  showUnsavedConfirm: config => {
    const previousFocusElement = document.activeElement as HTMLElement;

    set({
      unsavedConfirm: {
        isOpen: true,
        title: config.title ?? 'Unsaved Changes',
        message: config.message ?? 'You have unsaved changes. Are you sure you want to close?',
        onConfirm: config.onConfirm,
        onCancel: config.onCancel ?? (() => get().hideUnsavedConfirm()),
        previousFocusElement,
      },
    });
  },

  hideUnsavedConfirm: () => {
    set({ unsavedConfirm: initialUnsavedConfirm });
  },

  // Tube modal actions
  showTubeEditorModal: config => {
    // Capture focus BEFORE modal opens (before React renders)
    // For batch operations with preserveSelection, don't capture focus element
    const previousFocusElement = config.preserveSelection
      ? null
      : (document.activeElement as HTMLElement);

    set({
      tubeEditorModal: {
        isOpen: true,
        mode: config.mode,
        tubeId: config.tubeId,
        tubeIds: config.tubeIds,
        positions: config.positions,
        rackId: config.rackId,
        boxId: config.boxId,
        previousFocusElement,
        preserveSelection: config.preserveSelection,
      },
    });
  },

  hideTubeEditorModal: () => {
    set({ tubeEditorModal: initialTubeEditorModal });
  },

  // Lock tubes modal actions
  showLockTubesModal: tubeIds => {
    const previousFocusElement = document.activeElement as HTMLElement;
    set({
      lockTubesModal: {
        isOpen: true,
        tubeIds,
        previousFocusElement,
      },
    });
  },

  hideLockTubesModal: () => {
    set({ lockTubesModal: initialLockTubesModal });
  },

  // Share access modal actions
  showShareAccessModal: tubeIds => {
    const previousFocusElement = document.activeElement as HTMLElement;
    set({
      shareAccessModal: {
        isOpen: true,
        tubeIds,
        previousFocusElement,
      },
    });
  },

  hideShareAccessModal: () => {
    set({ shareAccessModal: initialShareAccessModal });
  },

  // Session timeout warning actions
  showSessionTimeoutWarning: config => {
    set({
      sessionTimeoutWarning: {
        isOpen: true,
        timeRemainingMs: config.timeRemainingMs,
        onStayLoggedIn: config.onStayLoggedIn,
        onLogout: config.onLogout,
      },
    });
  },

  updateSessionTimeoutWarning: timeRemainingMs => {
    const current = get().sessionTimeoutWarning;
    if (current.isOpen) {
      set({
        sessionTimeoutWarning: {
          ...current,
          timeRemainingMs,
        },
      });
    }
  },

  hideSessionTimeoutWarning: () => {
    set({ sessionTimeoutWarning: initialSessionTimeoutWarning });
  },

  // Utility to hide all modals
  hideAllModals: () => {
    set({
      deleteConfirm: initialDeleteConfirm,
      overwriteConfirm: initialOverwriteConfirm,
      unsavedConfirm: initialUnsavedConfirm,
      tubeEditorModal: initialTubeEditorModal,
      lockTubesModal: initialLockTubesModal,
      shareAccessModal: initialShareAccessModal,
      sessionTimeoutWarning: initialSessionTimeoutWarning,
    });
  },
}));

/**
 * Hook for accessing modal store
 */
export const useModalStore = () => {
  const state = modalStore();

  return {
    // State
    deleteConfirm: state.deleteConfirm,
    overwriteConfirm: state.overwriteConfirm,
    unsavedConfirm: state.unsavedConfirm,
    tubeEditorModal: state.tubeEditorModal,
    lockTubesModal: state.lockTubesModal,
    shareAccessModal: state.shareAccessModal,
    sessionTimeoutWarning: state.sessionTimeoutWarning,

    // Actions
    showDeleteConfirm: state.showDeleteConfirm,
    hideDeleteConfirm: state.hideDeleteConfirm,
    showOverwriteConfirm: state.showOverwriteConfirm,
    hideOverwriteConfirm: state.hideOverwriteConfirm,
    showUnsavedConfirm: state.showUnsavedConfirm,
    hideUnsavedConfirm: state.hideUnsavedConfirm,
    showTubeEditorModal: state.showTubeEditorModal,
    hideTubeEditorModal: state.hideTubeEditorModal,
    showLockTubesModal: state.showLockTubesModal,
    hideLockTubesModal: state.hideLockTubesModal,
    showShareAccessModal: state.showShareAccessModal,
    hideShareAccessModal: state.hideShareAccessModal,
    showSessionTimeoutWarning: state.showSessionTimeoutWarning,
    updateSessionTimeoutWarning: state.updateSessionTimeoutWarning,
    hideSessionTimeoutWarning: state.hideSessionTimeoutWarning,
    hideAllModals: state.hideAllModals,
  };
};
