/**
 * Modal Store Tests
 *
 * Tests declarative modal API with complete lifecycle management.
 */

import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { modalStore } from './modalStore';

describe('modalStore', () => {
  beforeEach(() => {
    // Reset all modals to initial state
    act(() => {
      modalStore.getState().hideAllModals();
    });
  });

  describe('Initial State', () => {
    it('should have all modals closed initially', () => {
      const state = modalStore.getState();

      expect(state.deleteConfirm.isOpen).toBe(false);
      expect(state.overwriteConfirm.isOpen).toBe(false);
      expect(state.unsavedConfirm.isOpen).toBe(false);
      expect(state.tubeEditorModal.isOpen).toBe(false);
      expect(state.lockTubesModal.isOpen).toBe(false);
      expect(state.shareAccessModal.isOpen).toBe(false);
      expect(state.printLabelModal.isOpen).toBe(false);
      expect(state.sessionTimeoutWarning.isOpen).toBe(false);
    });
  });

  describe('Delete Confirm Modal', () => {
    it('should open delete confirm modal', () => {
      const onConfirm = vi.fn();

      act(() => {
        modalStore.getState().showDeleteConfirm({
          title: 'Delete Item',
          message: 'Are you sure?',
          onConfirm,
        });
      });

      const state = modalStore.getState().deleteConfirm;
      expect(state.isOpen).toBe(true);
      expect(state.title).toBe('Delete Item');
      expect(state.message).toBe('Are you sure?');
    });

    it('should close delete confirm modal', () => {
      act(() => {
        modalStore.getState().showDeleteConfirm({
          title: 'Test',
          message: 'Test',
          onConfirm: vi.fn(),
        });
        modalStore.getState().hideDeleteConfirm();
      });

      expect(modalStore.getState().deleteConfirm.isOpen).toBe(false);
    });

    it('should preserve data for exit animation on close', () => {
      act(() => {
        modalStore.getState().showDeleteConfirm({
          title: 'Keep Me',
          message: 'During Animation',
          onConfirm: vi.fn(),
        });
        modalStore.getState().hideDeleteConfirm();
      });

      const state = modalStore.getState().deleteConfirm;
      expect(state.isOpen).toBe(false);
      expect(state.title).toBe('Keep Me');
    });

    it('should include custom confirm text', () => {
      act(() => {
        modalStore.getState().showDeleteConfirm({
          title: 'Test',
          message: 'Test',
          confirmText: 'Delete Forever',
          onConfirm: vi.fn(),
        });
      });

      expect(modalStore.getState().deleteConfirm.confirmText).toBe('Delete Forever');
    });
  });

  describe('Overwrite Confirm Modal', () => {
    it('should open overwrite confirm modal', () => {
      const onConfirm = vi.fn();

      act(() => {
        modalStore.getState().showOverwriteConfirm({
          title: 'Overwrite Data',
          message: 'Existing data will be lost',
          onConfirm,
        });
      });

      const state = modalStore.getState().overwriteConfirm;
      expect(state.isOpen).toBe(true);
      expect(state.title).toBe('Overwrite Data');
    });

    it('should close overwrite confirm modal', () => {
      act(() => {
        modalStore.getState().showOverwriteConfirm({
          title: 'Test',
          message: 'Test',
          onConfirm: vi.fn(),
        });
        modalStore.getState().hideOverwriteConfirm();
      });

      expect(modalStore.getState().overwriteConfirm.isOpen).toBe(false);
    });
  });

  describe('Unsaved Confirm Modal', () => {
    it('should open with default title and message', () => {
      act(() => {
        modalStore.getState().showUnsavedConfirm({
          onConfirm: vi.fn(),
        });
      });

      const state = modalStore.getState().unsavedConfirm;
      expect(state.isOpen).toBe(true);
      expect(state.title).toBe('Unsaved Changes');
      expect(state.message).toContain('unsaved changes');
    });

    it('should allow custom title and message', () => {
      act(() => {
        modalStore.getState().showUnsavedConfirm({
          title: 'Custom Title',
          message: 'Custom message',
          onConfirm: vi.fn(),
        });
      });

      const state = modalStore.getState().unsavedConfirm;
      expect(state.title).toBe('Custom Title');
      expect(state.message).toBe('Custom message');
    });

    it('should close unsaved confirm modal', () => {
      act(() => {
        modalStore.getState().showUnsavedConfirm({ onConfirm: vi.fn() });
        modalStore.getState().hideUnsavedConfirm();
      });

      expect(modalStore.getState().unsavedConfirm.isOpen).toBe(false);
    });
  });

  describe('Tube Editor Modal', () => {
    it('should open in add mode', () => {
      act(() => {
        modalStore.getState().showTubeEditorModal({
          mode: 'add',
          positions: ['tank-1:rack-1:box-1:1', 'tank-1:rack-1:box-1:2'],
        });
      });

      const state = modalStore.getState().tubeEditorModal;
      expect(state.isOpen).toBe(true);
      expect(state.mode).toBe('add');
      expect(state.positions).toEqual(['tank-1:rack-1:box-1:1', 'tank-1:rack-1:box-1:2']);
    });

    it('should open in edit mode with tubeId', () => {
      act(() => {
        modalStore.getState().showTubeEditorModal({
          mode: 'edit',
          tubeId: 'tube-123',
        });
      });

      const state = modalStore.getState().tubeEditorModal;
      expect(state.isOpen).toBe(true);
      expect(state.mode).toBe('edit');
      expect(state.tubeId).toBe('tube-123');
    });

    it('should open in batch mode with tubeIds', () => {
      act(() => {
        modalStore.getState().showTubeEditorModal({
          mode: 'batch',
          tubeIds: ['tube-1', 'tube-2', 'tube-3'],
        });
      });

      const state = modalStore.getState().tubeEditorModal;
      expect(state.isOpen).toBe(true);
      expect(state.mode).toBe('batch');
      expect(state.tubeIds).toEqual(['tube-1', 'tube-2', 'tube-3']);
    });

    it('should handle preserveSelection flag', () => {
      act(() => {
        modalStore.getState().showTubeEditorModal({
          mode: 'batch',
          tubeIds: ['tube-1'],
          preserveSelection: true,
        });
      });

      const state = modalStore.getState().tubeEditorModal;
      expect(state.preserveSelection).toBe(true);
      expect(state.previousFocusElement).toBeNull();
    });

    it('should close tube editor modal', () => {
      act(() => {
        modalStore.getState().showTubeEditorModal({ mode: 'add' });
        modalStore.getState().hideTubeEditorModal();
      });

      expect(modalStore.getState().tubeEditorModal.isOpen).toBe(false);
    });
  });

  describe('Lock Tubes Modal', () => {
    it('should open with tube IDs', () => {
      act(() => {
        modalStore.getState().showLockTubesModal(['tube-1', 'tube-2']);
      });

      const state = modalStore.getState().lockTubesModal;
      expect(state.isOpen).toBe(true);
      expect(state.tubeIds).toEqual(['tube-1', 'tube-2']);
    });

    it('should close lock tubes modal', () => {
      act(() => {
        modalStore.getState().showLockTubesModal(['tube-1']);
        modalStore.getState().hideLockTubesModal();
      });

      expect(modalStore.getState().lockTubesModal.isOpen).toBe(false);
    });
  });

  describe('Share Access Modal', () => {
    it('should open with tube IDs', () => {
      act(() => {
        modalStore.getState().showShareAccessModal(['tube-1', 'tube-2']);
      });

      const state = modalStore.getState().shareAccessModal;
      expect(state.isOpen).toBe(true);
      expect(state.tubeIds).toEqual(['tube-1', 'tube-2']);
    });

    it('should close share access modal', () => {
      act(() => {
        modalStore.getState().showShareAccessModal(['tube-1']);
        modalStore.getState().hideShareAccessModal();
      });

      expect(modalStore.getState().shareAccessModal.isOpen).toBe(false);
    });
  });

  describe('Print Label Modal', () => {
    it('should open with tube ID', () => {
      act(() => {
        modalStore.getState().showPrintLabelModal('tube-123');
      });

      const state = modalStore.getState().printLabelModal;
      expect(state.isOpen).toBe(true);
      expect(state.tubeId).toBe('tube-123');
    });

    it('should close print label modal', () => {
      act(() => {
        modalStore.getState().showPrintLabelModal('tube-1');
        modalStore.getState().hidePrintLabelModal();
      });

      expect(modalStore.getState().printLabelModal.isOpen).toBe(false);
    });
  });

  describe('Session Timeout Warning', () => {
    it('should open with time and callbacks', () => {
      const onStayLoggedIn = vi.fn();
      const onLogout = vi.fn();

      act(() => {
        modalStore.getState().showSessionTimeoutWarning({
          timeRemainingMs: 60000,
          onStayLoggedIn,
          onLogout,
        });
      });

      const state = modalStore.getState().sessionTimeoutWarning;
      expect(state.isOpen).toBe(true);
      expect(state.timeRemainingMs).toBe(60000);
    });

    it('should update time remaining', () => {
      act(() => {
        modalStore.getState().showSessionTimeoutWarning({
          timeRemainingMs: 60000,
          onStayLoggedIn: vi.fn(),
          onLogout: vi.fn(),
        });
        modalStore.getState().updateSessionTimeoutWarning(30000);
      });

      expect(modalStore.getState().sessionTimeoutWarning.timeRemainingMs).toBe(30000);
    });

    it('should not update time if modal closed', () => {
      act(() => {
        modalStore.getState().updateSessionTimeoutWarning(30000);
      });

      expect(modalStore.getState().sessionTimeoutWarning.timeRemainingMs).toBe(0);
    });

    it('should close session timeout warning', () => {
      act(() => {
        modalStore.getState().showSessionTimeoutWarning({
          timeRemainingMs: 60000,
          onStayLoggedIn: vi.fn(),
          onLogout: vi.fn(),
        });
        modalStore.getState().hideSessionTimeoutWarning();
      });

      expect(modalStore.getState().sessionTimeoutWarning.isOpen).toBe(false);
    });
  });

  describe('hideAllModals()', () => {
    it('should close all open modals', () => {
      act(() => {
        modalStore.getState().showDeleteConfirm({
          title: 'Test',
          message: 'Test',
          onConfirm: vi.fn(),
        });
        modalStore.getState().showTubeEditorModal({ mode: 'add' });
        modalStore.getState().showLockTubesModal(['tube-1']);
        modalStore.getState().hideAllModals();
      });

      const state = modalStore.getState();
      expect(state.deleteConfirm.isOpen).toBe(false);
      expect(state.tubeEditorModal.isOpen).toBe(false);
      expect(state.lockTubesModal.isOpen).toBe(false);
    });
  });

  describe('useModalStore hook', () => {
    it('should provide state and actions via direct store access', () => {
      // Access store directly since hook can't be called outside React component
      const state = modalStore.getState();

      // Check state properties exist
      expect(state.deleteConfirm).toBeDefined();
      expect(state.tubeEditorModal).toBeDefined();

      // Check action functions exist
      expect(typeof state.showDeleteConfirm).toBe('function');
      expect(typeof state.hideDeleteConfirm).toBe('function');
      expect(typeof state.hideAllModals).toBe('function');
    });
  });
});
