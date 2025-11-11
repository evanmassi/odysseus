/**
 * MODAL STORE
 * 
 * Declarative modal API with complete lifecycle management.
 * Replaces old Zustand-based system with type-safe, scalable architecture.
 */

import { create } from 'zustand';

import { type PositionKey } from '@shared/types/grid';

interface DeleteConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  previousFocusElement?: HTMLElement | null;
}

interface OverwriteConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  previousFocusElement?: HTMLElement | null;
}

interface TubeEditorModalState {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'batch';
  tubeId?: string;        // Single edit mode - tube ID only
  tubeIds?: string[];     // Batch edit mode - tube IDs only
  positions?: PositionKey[];   // Add mode - position keys
  rackId?: string;
  boxId?: string;
  previousFocusElement?: HTMLElement | null;
  preserveSelection?: boolean;  // Don't restore focus to specific position (for batch operations)
}

interface LocalModalState {
  deleteConfirm: DeleteConfirmState;
  overwriteConfirm: OverwriteConfirmState;
  tubeEditorModal: TubeEditorModalState;
}

interface ModalActions {
  showDeleteConfirm: (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  hideDeleteConfirm: () => void;

  showOverwriteConfirm: (config: {
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  hideOverwriteConfirm: () => void;

  showTubeEditorModal: (config: {
    mode: 'add' | 'edit' | 'batch';
    tubeId?: string;        // Single edit mode
    tubeIds?: string[];     // Batch edit mode
    positions?: PositionKey[];   // Add mode
    rackId?: string;
    boxId?: string;
    preserveSelection?: boolean;  // Don't restore focus to specific position (for batch operations)
  }) => void;
  hideTubeEditorModal: () => void;

  hideAllModals: () => void;
}

const initialDeleteConfirm: DeleteConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  onCancel: () => {}
};

const initialOverwriteConfirm: OverwriteConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  onCancel: () => {}
};

const initialTubeEditorModal: TubeEditorModalState = {
  isOpen: false,
  mode: 'add'
};

/**
 * Global modal store
 */
const modalStore = create<LocalModalState & ModalActions>((set, get) => ({
  // Initial state
  deleteConfirm: initialDeleteConfirm,
  overwriteConfirm: initialOverwriteConfirm,
  tubeEditorModal: initialTubeEditorModal,

  // Delete confirmation actions
  showDeleteConfirm: (config) => {
    // Capture focus BEFORE modal opens (before React renders)
    const previousFocusElement = document.activeElement as HTMLElement;

    set({
      deleteConfirm: {
        isOpen: true,
        title: config.title,
        message: config.message,
        onConfirm: config.onConfirm,
        onCancel: config.onCancel ?? (() => get().hideDeleteConfirm()),
        previousFocusElement
      }
    });
  },

  hideDeleteConfirm: () => {
    set({ deleteConfirm: initialDeleteConfirm });
  },

  // Overwrite confirmation actions
  showOverwriteConfirm: (config) => {
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
        previousFocusElement
      }
    });
  },

  hideOverwriteConfirm: () => {
    set({ overwriteConfirm: initialOverwriteConfirm });
  },

  // Tube modal actions
  showTubeEditorModal: (config) => {
    // Capture focus BEFORE modal opens (before React renders)
    // For batch operations with preserveSelection, don't capture focus element
    const previousFocusElement = config.preserveSelection
      ? null
      : document.activeElement as HTMLElement;

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
        preserveSelection: config.preserveSelection
      }
    });
  },

  hideTubeEditorModal: () => {
    set({ tubeEditorModal: initialTubeEditorModal });
  },

  // Utility to hide all modals
  hideAllModals: () => {
    set({
      deleteConfirm: initialDeleteConfirm,
      overwriteConfirm: initialOverwriteConfirm,
      tubeEditorModal: initialTubeEditorModal
    });
  }
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
    tubeEditorModal: state.tubeEditorModal,
    
    // Actions
    showDeleteConfirm: state.showDeleteConfirm,
    hideDeleteConfirm: state.hideDeleteConfirm,
    showOverwriteConfirm: state.showOverwriteConfirm,
    hideOverwriteConfirm: state.hideOverwriteConfirm,
    showTubeEditorModal: state.showTubeEditorModal,
    hideTubeEditorModal: state.hideTubeEditorModal,
    hideAllModals: state.hideAllModals
  };
};
