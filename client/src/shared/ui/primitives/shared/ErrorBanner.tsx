import { useState, useEffect } from 'react';

import { AlertTriangle, X, Copy } from 'lucide-react';

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
        console.error('Failed to copy errors to clipboard:', error);
      }
    })();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-red-500 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Connection Errors ({errors.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {errors.slice(-3).map((error, index) => (
                  <div key={index} className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={copyErrors}
                  className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-800"
                >
                  <Copy size={12} />
                  <span>Copy All Errors</span>
                </button>
                <button
                  onClick={onClear}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-red-400 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
