/**
 * Error Store Tests
 *
 * Tests global error state management for the application.
 */

import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useErrorStore } from './errorStore';

// Mock logger to prevent console noise
vi.mock('@shared/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Mock window event listeners to prevent side effects
const originalAddEventListener = window.addEventListener;
beforeEach(() => {
  window.addEventListener = vi.fn();
});
afterEach(() => {
  window.addEventListener = originalAddEventListener;
});

describe('errorStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useErrorStore.getState().clearErrors();
    });
  });

  describe('Initial State', () => {
    it('should have empty errors array initially', () => {
      const state = useErrorStore.getState();
      expect(state.errors).toEqual([]);
    });
  });

  describe('addError()', () => {
    it('should add error with timestamp prefix', () => {
      act(() => {
        useErrorStore.getState().addError('Test error message');
      });

      const errors = useErrorStore.getState().errors;
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/^\[\d{1,2}:\d{2}:\d{2}/); // Timestamp format
      expect(errors[0]).toContain('Test error message');
    });

    it('should add multiple errors in order', () => {
      act(() => {
        const store = useErrorStore.getState();
        store.addError('First error');
        store.addError('Second error');
        store.addError('Third error');
      });

      const errors = useErrorStore.getState().errors;
      expect(errors).toHaveLength(3);
      expect(errors[0]).toContain('First error');
      expect(errors[1]).toContain('Second error');
      expect(errors[2]).toContain('Third error');
    });

    it('should keep only last 10 errors', () => {
      act(() => {
        const store = useErrorStore.getState();
        for (let i = 1; i <= 12; i++) {
          store.addError(`Error ${i}`);
        }
      });

      const errors = useErrorStore.getState().errors;
      expect(errors).toHaveLength(10);
      expect(errors[0]).toContain('Error 3'); // First two dropped
      expect(errors[9]).toContain('Error 12');
    });

    it('should format error with locale time string', () => {
      const mockDate = new Date(2025, 0, 15, 14, 30, 45);
      vi.setSystemTime(mockDate);

      act(() => {
        useErrorStore.getState().addError('Timed error');
      });

      const errors = useErrorStore.getState().errors;
      expect(errors[0]).toMatch(/\[2:30:45 PM\]|\[14:30:45\]/); // Locale-dependent format
    });
  });

  describe('clearErrors()', () => {
    it('should clear all errors', () => {
      act(() => {
        const store = useErrorStore.getState();
        store.addError('Error 1');
        store.addError('Error 2');
      });

      expect(useErrorStore.getState().errors).toHaveLength(2);

      act(() => {
        useErrorStore.getState().clearErrors();
      });

      expect(useErrorStore.getState().errors).toHaveLength(0);
    });

    it('should handle clearing empty store gracefully', () => {
      act(() => {
        useErrorStore.getState().clearErrors();
      });

      expect(useErrorStore.getState().errors).toEqual([]);
    });
  });
});
