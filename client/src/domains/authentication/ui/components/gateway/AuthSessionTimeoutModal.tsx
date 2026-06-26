/**
 * Session Timeout Warning Modal
 *
 * Displays a countdown warning when the user's session is about to expire.
 * Phosphor digits and a diamond depletion track that warm amber → crimson as time runs out.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

import { LogOut } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAnimatedClose, useFocusTrap } from '@shared/hooks';
import { AlertBanner, Button } from '@shared/ui';
import { ModalPortal } from '@shared/ui/components/overlays/ModalPortal';

const EXIT_DURATION = 200;

const DIAMOND_COUNT = 24;

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function AuthSessionTimeoutModal() {
  const { sessionTimeoutWarning } = useModalStore();
  const { isOpen, timeRemainingMs, onStayLoggedIn, onLogout } = sessionTimeoutWarning;

  const stayLoggedInRef = useRef<HTMLButtonElement>(null);
  const initialTimeRef = useRef<number | null>(null);
  // Use ref for pending action to avoid stale closure issues with useAnimatedClose
  const pendingActionRef = useRef<'stayLoggedIn' | 'logout' | 'timeout' | null>(null);

  const [displayTime, setDisplayTime] = useState(timeRemainingMs);

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

  const trapRef = useFocusTrap({
    isOpen: isVisible,
    initialFocusRef: stayLoggedInRef,
  });

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
  const initialTime = initialTimeRef.current ?? timeRemainingMs;
  const progress = initialTime > 0 ? displayTime / initialTime : 0;
  const state = displayTime > 60000 ? 'calm' : displayTime > 15000 ? 'warn' : 'crit';
  const litDiamonds = Math.round(progress * DIAMOND_COUNT);

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
          data-state={state}
          className={`auth-console-chrome session-timeout-modal p-6 w-full max-w-lg mx-4 ${modalAnimationClass}`}
        >
          {/* Phosphor countdown readout + diamond depletion track */}
          <div className="mb-6">
            <div className="st-readout mb-3">
              <span
                className="st-time font-mono"
                data-text={formattedTime}
                role="timer"
                aria-live="polite"
                aria-label={`Time remaining: ${formattedTime}`}
              >
                {formattedTime}
              </span>
              <span className="st-caption">Remaining</span>
            </div>
            <div className="st-track" aria-hidden>
              {Array.from({ length: DIAMOND_COUNT }, (_, i) => {
                const spent = i >= litDiamonds;
                const lead = i === litDiamonds - 1;
                return (
                  <span
                    key={i}
                    className={`st-slot${spent ? ' is-spent' : ''}${lead ? ' is-lead' : ''}`}
                  >
                    <span className="st-diamond" />
                  </span>
                );
              })}
            </div>
          </div>

          <div id="session-timeout-message" className="mb-5">
            <AlertBanner variant={state === 'calm' ? 'warning' : 'error'} spacing="none">
              Your session will expire due to inactivity
            </AlertBanner>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut size={16} />}
            >
              Log Out
            </Button>
            <Button ref={stayLoggedInRef} variant="solid" size="sm" onClick={handleStayLoggedIn}>
              Stay Logged In
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
