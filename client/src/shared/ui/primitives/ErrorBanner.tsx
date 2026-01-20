import { useState, useEffect } from 'react';

import { AlertTriangle, X, Copy } from 'lucide-react';

import { logger } from '@shared/infrastructure/logger';

interface ErrorDisplayProps {
  errors: string[];
  onClear: () => void;
}

export function ErrorBanner({ errors, onClear }: ErrorDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(errors.length > 0);
  }, [errors]);

  const copyErrors = () => {
    const errorText = errors.join('\n\n');
    void (async () => {
      try {
        await navigator.clipboard.writeText(errorText);
      } catch (error) {
        logger.error('Failed to copy errors to clipboard', { error });
      }
    })();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-2xl mx-auto">
      <div className="bg-danger-light border border-danger-border rounded-lg p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-danger-text mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-danger-text mb-2">
                Connection Errors ({errors.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {errors.slice(-3).map((error, index) => (
                  <div
                    key={index}
                    className="text-xs text-danger-text font-mono bg-danger-light p-2 rounded border border-danger-border"
                  >
                    {error}
                  </div>
                ))}
              </div>
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={copyErrors}
                  className="flex items-center space-x-1 text-xs text-danger-text hover:text-danger-hover"
                >
                  <Copy size={12} />
                  <span>Copy All Errors</span>
                </button>
                <button
                  onClick={onClear}
                  className="text-xs text-danger-text hover:text-danger-hover"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-danger-text opacity-60 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
