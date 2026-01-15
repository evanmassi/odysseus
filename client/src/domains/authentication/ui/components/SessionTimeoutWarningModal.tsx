/**
 * Session Timeout Warning Modal
 *
 * Displays a countdown warning when the user's session is about to expire.
 * Allows user to extend session ("Stay Logged In") or log out immediately.
 *
 * Styled to match ConfirmDialog pattern for visual consistency.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

import { Clock, LogOut } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAnimatedClose } from '@shared/hooks/useAnimatedClose';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';

const EXIT_DURATION = 200;

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
 *
 * Shows a countdown timer warning the user their session will expire.
 * Provides options to extend the session or log out.
 */
export function SessionTimeoutWarningModal() {
  const { sessionTimeoutWarning } = useModalStore();
  const { isOpen, timeRemainingMs, onStayLoggedIn, onLogout } = sessionTimeoutWarning;

  // Ref for focusing the primary action button
  const stayLoggedInRef = useRef<HTMLButtonElement>(null);

  // Local countdown state for smooth animation
  const [displayTime, setDisplayTime] = useState(timeRemainingMs);
  const [pendingAction, setPendingAction] = useState<'stayLoggedIn' | 'logout' | 'timeout' | null>(
    null
  );

  // Handle the actual close action after animation completes
  const handleCloseComplete = useCallback(() => {
    if (pendingAction === 'stayLoggedIn') {
      onStayLoggedIn();
    } else if (pendingAction === 'logout') {
      onLogout('manual');
    } else if (pendingAction === 'timeout') {
      onLogout('timeout');
    }
    setPendingAction(null);
  }, [pendingAction, onStayLoggedIn, onLogout]);

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

  // Sync with server-provided time
  useEffect(() => {
    setDisplayTime(timeRemainingMs);
  }, [timeRemainingMs]);

  // Local countdown timer (updates every second for smooth display)
  useEffect(() => {
    if (!isVisible || isClosing) return;

    const interval = setInterval(() => {
      setDisplayTime(prev => {
        const newTime = Math.max(0, prev - 1000);
        // If time runs out, trigger timeout logout (not manual)
        if (newTime <= 0) {
          setPendingAction('timeout');
          triggerClose();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, isClosing, triggerClose]);

  // Handle stay logged in
  const handleStayLoggedIn = useCallback(() => {
    setPendingAction('stayLoggedIn');
    triggerClose();
  }, [triggerClose]);

  // Handle manual logout (user clicked "Log Out" button)
  const handleLogout = useCallback(() => {
    setPendingAction('logout');
    triggerClose();
  }, [triggerClose]);

  // Keyboard navigation: Enter confirms (stay logged in), Escape logs out
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
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isVisible, isClosing, handleStayLoggedIn, handleLogout]);

  if (!isVisible) return null;

  const backdropAnimationClass = isClosing
    ? 'animate-modal-backdrop-out'
    : 'animate-modal-backdrop-in';
  const modalAnimationClass = isClosing ? 'animate-modal-blowup-out' : 'animate-modal-blowup-in';

  const formattedTime = formatTime(displayTime);
  const isUrgent = displayTime <= 60000; // Less than 1 minute

  // Warning variant styling (matching ConfirmDialog pattern)
  const styles = {
    iconBg: isUrgent ? 'bg-danger-light' : 'bg-warning-light',
    iconColor: isUrgent ? 'text-danger-bg' : 'text-warning-bg',
    border: isUrgent ? 'border-danger-border' : 'border-warning-border',
    shadow: isUrgent ? 'shadow-red-500/30' : 'shadow-yellow-500/30',
    timerColor: isUrgent ? 'text-danger-bg' : 'text-warning-bg',
  };

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 ${backdropAnimationClass}`}
      >
        <div
          ref={trapRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-timeout-title"
          aria-describedby="session-timeout-message"
          className={`bg-background rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl ${styles.shadow} border ${styles.border} ${modalAnimationClass}`}
        >
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 ${styles.iconBg} rounded-full`}>
                <Clock className={`w-6 h-6 ${styles.iconColor}`} />
              </div>
              <h2 id="session-timeout-title" className="text-xl font-bold text-foreground">
                Session Expiring Soon
              </h2>
            </div>
          </div>

          {/* Message and Timer */}
          <div className="text-center mb-8">
            <p id="session-timeout-message" className="text-muted-foreground mb-4">
              Your session will expire due to inactivity.
            </p>

            {/* Countdown display */}
            <div
              className={`text-5xl font-mono font-bold mb-4 ${styles.timerColor}`}
              role="timer"
              aria-live="polite"
              aria-label={`Time remaining: ${formattedTime}`}
            >
              {formattedTime}
            </div>

            <p className="text-sm text-muted-foreground">
              Click &quot;Stay Logged In&quot; to continue your session.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-center space-x-3">
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-secondary px-6 inline-flex items-center gap-2"
            >
              <LogOut size={18} />
              Log Out
            </button>
            <button
              ref={stayLoggedInRef}
              type="button"
              onClick={handleStayLoggedIn}
              className="btn btn-primary px-6 font-medium"
            >
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
