/**
 * Session Timeout Warning Modal
 *
 * Displays a countdown warning when the user's session is about to expire.
 * Allows user to extend session ("Stay Logged In") or log out immediately.
 */

import type { FC } from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';

import { Clock, LogOut } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@shared/ui/primitives/modal/Modal';

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
export const SessionTimeoutWarningModal: FC = () => {
  const { sessionTimeoutWarning } = useModalStore();
  const { isOpen, timeRemainingMs, onStayLoggedIn, onLogout } = sessionTimeoutWarning;

  // Ref for focusing the primary action button
  const stayLoggedInRef = useRef<HTMLButtonElement>(null);

  // Local countdown state for smooth animation
  const [displayTime, setDisplayTime] = useState(timeRemainingMs);

  // Sync with server-provided time
  useEffect(() => {
    setDisplayTime(timeRemainingMs);
  }, [timeRemainingMs]);

  // Focus the "Stay Logged In" button when modal opens (accessible focus management)
  useEffect(() => {
    if (isOpen && stayLoggedInRef.current) {
      stayLoggedInRef.current.focus();
    }
  }, [isOpen]);

  // Local countdown timer (updates every second for smooth display)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setDisplayTime(prev => {
        const newTime = Math.max(0, prev - 1000);
        // If time runs out, trigger timeout logout (not manual)
        if (newTime <= 0) {
          onLogout('timeout');
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onLogout]);

  // Handle stay logged in
  const handleStayLoggedIn = useCallback(() => {
    onStayLoggedIn();
  }, [onStayLoggedIn]);

  // Handle manual logout (user clicked "Log Out" button)
  const handleLogout = useCallback(() => {
    onLogout('manual');
  }, [onLogout]);

  if (!isOpen) return null;

  const formattedTime = formatTime(displayTime);
  const isUrgent = displayTime <= 60000; // Less than 1 minute

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleStayLoggedIn} // Closing modal = staying logged in
      size="sm"
      backdrop="frost"
      animation="scale"
      closeOnBackdropClick={false}
      closeOnEscape={false}
      preventClose={false}
      aria-label="Session timeout warning"
    >
      <ModalHeader showCloseButton={false}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isUrgent ? 'bg-red-100' : 'bg-amber-100'}`}>
            <Clock size={24} className={isUrgent ? 'text-red-600' : 'text-amber-600'} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Session Expiring Soon</h2>
        </div>
      </ModalHeader>

      <ModalBody padding="md">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Your session will expire due to inactivity.</p>

          {/* Countdown display */}
          <div
            className={`text-5xl font-mono font-bold mb-4 ${
              isUrgent ? 'text-red-600' : 'text-amber-600'
            }`}
            role="timer"
            aria-live="polite"
            aria-label={`Time remaining: ${formattedTime}`}
          >
            {formattedTime}
          </div>

          <p className="text-sm text-gray-500">
            Click &quot;Stay Logged In&quot; to continue your session.
          </p>
        </div>
      </ModalBody>

      <ModalFooter justify="center" spacing="md">
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
        >
          <LogOut size={18} />
          Log Out
        </button>
        <button
          ref={stayLoggedInRef}
          type="button"
          onClick={handleStayLoggedIn}
          className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
        >
          Stay Logged In
        </button>
      </ModalFooter>
    </Modal>
  );
};
