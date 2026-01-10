import { useState, useCallback, useEffect, useRef } from 'react';

interface UseAnimatedCloseOptions {
  isOpen: boolean;
  onClose: () => void;
  exitDuration: number;
}

interface UseAnimatedCloseReturn {
  isVisible: boolean;
  isClosing: boolean;
  triggerClose: () => void;
}

/**
 * Manages modal visibility to allow exit animations before unmount.
 *
 * Handles two close flows:
 * - Internal: X button calls triggerClose → animate → call onClose
 * - External: Parent sets isOpen=false → animate → unmount (no onClose needed)
 */
export function useAnimatedClose({
  isOpen,
  onClose,
  exitDuration,
}: UseAnimatedCloseOptions): UseAnimatedCloseReturn {
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(isOpen);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen && !wasOpen) {
      // Opening: show immediately
      setIsVisible(true);
      setIsClosing(false);
    } else if (!isOpen && wasOpen && !isClosing) {
      // External close: parent set isOpen=false, trigger exit animation
      setIsClosing(true);

      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, exitDuration);
    }
  }, [isOpen, isClosing, exitDuration]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const triggerClose = useCallback(() => {
    if (isClosing) return;

    setIsClosing(true);

    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }, exitDuration);
  }, [isClosing, exitDuration, onClose]);

  return {
    isVisible,
    isClosing,
    triggerClose,
  };
}
