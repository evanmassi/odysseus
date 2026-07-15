/**
 * Modal Store
 *
 * Centralized open/close state for the app's confirmation dialogs and modals.
 */

import type { ReactNode } from 'react';

import { create } from 'zustand';

import type { PositionKey } from '@domains/tubes';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface UnsavedConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface TubeEditorModalState {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'bulk';
  tubeId?: string; // Single edit mode - tube ID only
  tubeIds?: string[]; // Bulk edit mode - tube IDs only
  positions?: PositionKey[]; // Add mode - position keys
  rackId?: string;
  boxId?: string;
  previousFocusElement?: HTMLElement | null;
  preserveSelection?: boolean; // Don't restore focus to specific position (for bulk operations)
}

interface LockTubesModalState {
  isOpen: boolean;
  tubeIds: string[];
}

interface ShareAccessModalState {
  isOpen: boolean;
  tubeIds: string[];
}

interface SessionTimeoutWarningState {
  isOpen: boolean;
  timeRemainingMs: number;
  onStayLoggedIn: () => void;
  onLogout: (reason: 'manual' | 'timeout') => void;
}

interface LocalModalState {
  deleteConfirm: ConfirmDialogState;
  overwriteConfirm: ConfirmDialogState;
  unsavedConfirm: UnsavedConfirmState;
  tubeEditorModal: TubeEditorModalState;
  lockTubesModal: LockTubesModalState;
  shareAccessModal: ShareAccessModalState;
  sessionTimeoutWarning: SessionTimeoutWarningState;
}

interface ConfirmDialogConfig {
  title: string;
  message: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ModalActions {
  showDeleteConfirm: (config: ConfirmDialogConfig) => void;
  hideDeleteConfirm: () => void;

  showOverwriteConfirm: (config: ConfirmDialogConfig) => void;
  hideOverwriteConfirm: () => void;

  showUnsavedConfirm: (config: {
    title?: string;
    message?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  hideUnsavedConfirm: () => void;

  showTubeEditorModal: (
    config: Omit<TubeEditorModalState, 'isOpen' | 'previousFocusElement'>
  ) => void;
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
}

const initialConfirmDialog: ConfirmDialogState = {
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

const buildConfirmState = (
  config: ConfirmDialogConfig,
  defaultCancel: () => void
): ConfirmDialogState => ({
  isOpen: true,
  title: config.title,
  message: config.message,
  confirmText: config.confirmText,
  onConfirm: config.onConfirm,
  onCancel: config.onCancel ?? defaultCancel,
});

// Exported raw for direct .getState() access from non-React code (e.g., authStore)
export const modalStore = create<LocalModalState & ModalActions>((set, get) => ({
  deleteConfirm: initialConfirmDialog,
  overwriteConfirm: initialConfirmDialog,
  unsavedConfirm: initialUnsavedConfirm,
  tubeEditorModal: initialTubeEditorModal,
  lockTubesModal: initialLockTubesModal,
  shareAccessModal: initialShareAccessModal,
  sessionTimeoutWarning: initialSessionTimeoutWarning,

  showDeleteConfirm: config => {
    set({ deleteConfirm: buildConfirmState(config, () => get().hideDeleteConfirm()) });
  },

  // hide* methods only set isOpen to false — keeps other data stable for exit animation
  hideDeleteConfirm: () => {
    set(state => ({
      deleteConfirm: { ...state.deleteConfirm, isOpen: false },
    }));
  },

  showOverwriteConfirm: config => {
    set({ overwriteConfirm: buildConfirmState(config, () => get().hideOverwriteConfirm()) });
  },

  hideOverwriteConfirm: () => {
    set(state => ({
      overwriteConfirm: { ...state.overwriteConfirm, isOpen: false },
    }));
  },

  showUnsavedConfirm: config => {
    set({
      unsavedConfirm: {
        isOpen: true,
        title: config.title ?? 'Unsaved Changes',
        message: config.message ?? 'You have unsaved changes. Are you sure you want to close?',
        onConfirm: config.onConfirm,
        onCancel: config.onCancel ?? (() => get().hideUnsavedConfirm()),
      },
    });
  },

  hideUnsavedConfirm: () => {
    set(state => ({
      unsavedConfirm: { ...state.unsavedConfirm, isOpen: false },
    }));
  },

  showTubeEditorModal: config => {
    // Capture focus BEFORE modal opens (before React renders)
    // For bulk operations with preserveSelection, don't capture focus element
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
    set(state => ({
      tubeEditorModal: { ...state.tubeEditorModal, isOpen: false },
    }));
  },

  showLockTubesModal: tubeIds => {
    set({
      lockTubesModal: {
        isOpen: true,
        tubeIds,
      },
    });
  },

  hideLockTubesModal: () => {
    set(state => ({
      lockTubesModal: { ...state.lockTubesModal, isOpen: false },
    }));
  },

  showShareAccessModal: tubeIds => {
    set({
      shareAccessModal: {
        isOpen: true,
        tubeIds,
      },
    });
  },

  hideShareAccessModal: () => {
    set(state => ({
      shareAccessModal: { ...state.shareAccessModal, isOpen: false },
    }));
  },

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
}));

export const useModalStore = modalStore;
