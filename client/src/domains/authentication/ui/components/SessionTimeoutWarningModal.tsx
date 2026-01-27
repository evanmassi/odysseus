/**
 * Session Timeout Warning Modal
 *
 * Displays a countdown warning when the user's session is about to expire.
 * Features a circular progress ring that visually depletes as time runs out.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

import { LogOut } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAnimatedClose } from '@shared/hooks/useAnimatedClose';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { Button } from '@shared/ui';
import { ModalPortal } from '@shared/ui/components/ModalPortal';

const EXIT_DURATION = 200;

// Circle geometry for progress ring
const CIRCLE_RADIUS = 54;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

/**
 * Format milliseconds as MM:SS
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * SessionTimeoutWarningModal Component
 */
export function SessionTimeoutWarningModal() {
  const { sessionTimeoutWarning } = useModalStore();
  const { isOpen, timeRemainingMs, onStayLoggedIn, onLogout } = sessionTimeoutWarning;

  const stayLoggedInRef = useRef<HTMLButtonElement>(null);
  const initialTimeRef = useRef<number | null>(null);
  // Use ref for pending action to avoid stale closure issues with useAnimatedClose
  const pendingActionRef = useRef<'stayLoggedIn' | 'logout' | 'timeout' | null>(null);

  const [displayTime, setDisplayTime] = useState(timeRemainingMs);

  // Handle the actual close action after animation completes
  const handleCloseComplete = useCallback(() => {
    const action = pendingActionRef.current;
    if (action === 'stayLoggedIn') {
      onStayLoggedIn();
    } else if (action === 'logout') {
      onLogout('manual');
    } else if (action === 'timeout') {
      onLogout('timeout');
    }
    pendingActionRef.current = null;
    // Reset initial time ref when modal closes so next open captures fresh value
    initialTimeRef.current = null;
  }, [onStayLoggedIn, onLogout]);

  const { isVisible, isClosing, triggerClose } = useAnimatedClose({
    isOpen,
    onClose: handleCloseComplete,
    exitDuration: EXIT_DURATION,
  });

  // Focus trap for keyboard accessibility
  const trapRef = useFocusTrap({
    isOpen: isVisible,
    restoreFocus: true,
    initialFocusDelay: 150,
    initialFocusRef: stayLoggedInRef,
    autoFocusFirstInput: false,
  });

  // Capture initial time only once when modal first opens
  useEffect(() => {
    if (isOpen && timeRemainingMs > 0 && initialTimeRef.current === null) {
      initialTimeRef.current = timeRemainingMs;
      setDisplayTime(timeRemainingMs);
    }
  }, [isOpen, timeRemainingMs]);

  // Sync display time with server updates (but don't reset initial time)
  useEffect(() => {
    if (isVisible && !isClosing && timeRemainingMs > 0) {
      setDisplayTime(timeRemainingMs);
    }
  }, [timeRemainingMs, isVisible, isClosing]);

  // Local countdown timer
  useEffect(() => {
    if (!isVisible || isClosing) return;

    const interval = setInterval(() => {
      setDisplayTime(prev => {
        const newTime = Math.max(0, prev - 1000);
        if (newTime <= 0) {
          pendingActionRef.current = 'timeout';
          triggerClose();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, isClosing, triggerClose]);

  const handleStayLoggedIn = useCallback(() => {
    pendingActionRef.current = 'stayLoggedIn';
    triggerClose();
  }, [triggerClose]);

  const handleLogout = useCallback(() => {
    pendingActionRef.current = 'logout';
    triggerClose();
  }, [triggerClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible || isClosing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleStayLoggedIn();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleLogout();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isVisible, isClosing, handleStayLoggedIn, handleLogout]);

  if (!isVisible) return null;

  const backdropAnimationClass = isClosing
    ? 'animate-modal-backdrop-out'
    : 'animate-modal-backdrop-in';
  const modalAnimationClass = isClosing ? 'animate-modal-blowup-out' : 'animate-modal-blowup-in';

  const formattedTime = formatTime(displayTime);
  const isUrgent = displayTime <= 60000;

  // Progress calculation (1 = full, 0 = empty)
  const initialTime = initialTimeRef.current ?? timeRemainingMs;
  const progress = initialTime > 0 ? displayTime / initialTime : 0;
  const strokeOffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  // Color transitions from warning to danger
  const ringColor = isUrgent ? 'text-danger-bg' : 'text-warning-bg';
  const borderColor = isUrgent ? 'border-danger-border' : 'border-warning-border';

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 bg-[hsl(var(--overlay-emphasis))] flex items-center justify-center z-50 ${backdropAnimationClass}`}
      >
        <div
          ref={trapRef}
          role="alertdialog"
          aria-modal="true"
          aria-label="Session expiring warning"
          aria-describedby="session-timeout-message"
          className={`bg-card rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border ${borderColor} ${modalAnimationClass}`}
        >
          {/* Circular countdown timer */}
          <div className="flex flex-col items-center mb-5">
            <div className={`relative ${ringColor}`}>
              {/* Glow layer (behind the ring) */}
              <svg
                width="140"
                height="140"
                viewBox="0 0 120 120"
                className={`absolute inset-0 transform -rotate-90 ${isUrgent ? 'animate-countdown-pulse' : ''}`}
                style={{ filter: 'blur(6px)', opacity: 0.5 }}
              >
                <circle
                  cx="60"
                  cy="60"
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: CIRCLE_CIRCUMFERENCE,
                    strokeDashoffset: strokeOffset,
                    transition: 'stroke-dashoffset 1s linear',
                  }}
                />
              </svg>

              {/* Main ring */}
              <svg
                width="140"
                height="140"
                viewBox="0 0 120 120"
                className="relative transform -rotate-90"
              >
                {/* Background track */}
                <circle
                  cx="60"
                  cy="60"
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-15"
                />
                {/* Progress ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: CIRCLE_CIRCUMFERENCE,
                    strokeDashoffset: strokeOffset,
                    transition: 'stroke-dashoffset 1s linear',
                  }}
                />
              </svg>

              {/* Timer text centered in ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-3xl font-mono font-normal tracking-tight ${ringColor}`}
                  role="timer"
                  aria-live="polite"
                  aria-label={`Time remaining: ${formattedTime}`}
                >
                  {formattedTime}
                </span>
              </div>
            </div>

            <p
              id="session-timeout-message"
              className="text-sm text-muted-foreground mt-3 text-center"
            >
              Your session will expire due to inactivity
            </p>
          </div>

          {/* Actions - right aligned */}
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut size={16} />}
            >
              Log Out
            </Button>
            <Button ref={stayLoggedInRef} variant="primary" size="sm" onClick={handleStayLoggedIn}>
              Stay Logged In
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
