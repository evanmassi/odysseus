import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

/**
 * Context value provided by AnimatedPresence wrapper.
 */
interface AnimatedPresenceContextValue {
  /** True during exit animation - modal should apply exit animation classes */
  isClosing: boolean;
  /** True when wrapped in AnimatedPresence - modal should skip its own isOpen check */
  isWrapped: boolean;
}

/**
 * Context for AnimatedPresence state.
 * Exported so modals can reset context for nested children.
 */
export const AnimatedPresenceContext = createContext<AnimatedPresenceContextValue>({
  isClosing: false,
  isWrapped: false,
});

/**
 * Hook for modals to read animation state from AnimatedPresence wrapper.
 *
 * @returns Context with:
 *   - isClosing: true during exit animation
 *   - isWrapped: true when inside AnimatedPresence (modal should skip isOpen check)
 */
export function useAnimatedPresence(): AnimatedPresenceContextValue {
  return useContext(AnimatedPresenceContext);
}

interface AnimatedPresenceProps {
  /** Controls visibility - when false, exit animation plays before unmount */
  isOpen: boolean;
  /** Content to animate */
  children: ReactNode;
  /** Exit animation duration in ms (default: 300) */
  exitDuration?: number;
}

/**
 * Wrapper that keeps children mounted during exit animations.
 *
 * Pattern: Wrap modal at render site, modal reads isClosing from context
 * to apply appropriate animation classes to its elements.
 */
export function AnimatedPresence({ isOpen, children, exitDuration = 300 }: AnimatedPresenceProps) {
  const [isVisible, setIsVisible] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Opening: show immediately
      setIsVisible(true);
      setIsClosing(false);
    } else if (isVisible && !isClosing) {
      // Closing: trigger exit animation, delay unmount
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, exitDuration);
      return () => clearTimeout(timer);
    }
    // No cleanup needed for other states
    return undefined;
  }, [isOpen, isVisible, isClosing, exitDuration]);

  if (!isVisible) return null;

  return (
    <AnimatedPresenceContext.Provider value={{ isClosing, isWrapped: true }}>
      {children}
    </AnimatedPresenceContext.Provider>
  );
}
