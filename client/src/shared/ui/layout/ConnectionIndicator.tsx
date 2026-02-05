import { useState, useEffect } from 'react';

import { WifiOff, RotateCw } from 'lucide-react';

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionIndicator({ connected }: ConnectionStatusProps) {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [hasBeenConnected, setHasBeenConnected] = useState(false);

  useEffect(() => {
    if (connected && !hasBeenConnected) {
      // First time connecting - don't show anything, just mark as connected
      setHasBeenConnected(true);
      return;
    }

    if (!connected && hasBeenConnected) {
      // Actually disconnected after being connected - show warning
      setShouldShow(true);
      setIsReconnecting(false);
      // Return undefined explicitly to satisfy TypeScript
      return undefined;
    } else if (connected && shouldShow && !isReconnecting) {
      // Reconnected after being disconnected - show success briefly
      setIsReconnecting(true);

      // Auto-dismiss after showing success
      const timer = setTimeout(() => {
        setShouldShow(false);
        setIsReconnecting(false);
      }, 2000);

      return () => clearTimeout(timer);
    }

    // Fallback return for any other cases
    return undefined;
  }, [connected, hasBeenConnected, shouldShow, isReconnecting]);

  // Only render when there's something to show
  if (!shouldShow) return null;

  const getStatusConfig = () => {
    if (!connected) {
      return {
        icon: <WifiOff size={16} />,
        text: 'Connection Lost',
        className: 'bg-danger-light text-danger-text border border-danger-border',
      };
    } else if (isReconnecting) {
      return {
        icon: <RotateCw size={16} className="animate-spin" />,
        text: 'Reconnected',
        className: 'bg-success-light text-success-text border border-success-border',
      };
    }

    return null;
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 transition-all duration-300 ease-in-out animate-bounce-in">
      <div
        className={`connection-status flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium shadow-lg ${config.className}`}
      >
        {config.icon}
        <span>{config.text}</span>
      </div>
    </div>
  );
}
