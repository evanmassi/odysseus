/**
 * Animated Close Hook Tests
 *
 * Covers internal/external close flows and timer cancellation on reopen.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useAnimatedClose } from './useAnimatedClose';

const EXIT_DURATION = 200;

describe('useAnimatedClose', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cancels the pending close when reopened within the exit window', () => {
    const onClose = vi.fn();
    const { result, rerender } = renderHook(props => useAnimatedClose(props), {
      initialProps: { isOpen: true, onClose, exitDuration: EXIT_DURATION },
    });

    expect(result.current.isVisible).toBe(true);

    rerender({ isOpen: false, onClose, exitDuration: EXIT_DURATION });
    expect(result.current.isClosing).toBe(true);

    // Reopen partway through the exit animation, before the close timer fires
    act(() => {
      vi.advanceTimersByTime(EXIT_DURATION / 2);
    });
    rerender({ isOpen: true, onClose, exitDuration: EXIT_DURATION });
    expect(result.current.isVisible).toBe(true);
    expect(result.current.isClosing).toBe(false);

    // The original close timer must not fire and hide the reopened modal
    act(() => {
      vi.advanceTimersByTime(EXIT_DURATION);
    });
    expect(result.current.isVisible).toBe(true);
  });

  it('runs the exit animation then calls onClose on internal close', () => {
    const onClose = vi.fn();
    const { result } = renderHook(props => useAnimatedClose(props), {
      initialProps: { isOpen: true, onClose, exitDuration: EXIT_DURATION },
    });

    act(() => {
      result.current.triggerClose();
    });
    expect(result.current.isClosing).toBe(true);
    expect(result.current.isVisible).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(EXIT_DURATION);
    });
    expect(result.current.isVisible).toBe(false);
    expect(result.current.isClosing).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('runs the exit animation on external close without calling onClose', () => {
    const onClose = vi.fn();
    const { result, rerender } = renderHook(props => useAnimatedClose(props), {
      initialProps: { isOpen: true, onClose, exitDuration: EXIT_DURATION },
    });

    rerender({ isOpen: false, onClose, exitDuration: EXIT_DURATION });
    expect(result.current.isClosing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(EXIT_DURATION);
    });
    expect(result.current.isVisible).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});
