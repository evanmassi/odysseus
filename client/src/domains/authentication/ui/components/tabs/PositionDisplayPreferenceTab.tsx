/**
 * Position Display Preference Tab
 *
 * Allows users to set their default position display format preference.
 * This setting determines how position labels are displayed throughout the app,
 * unless overridden at the lab or box level.
 *
 * Note: User preferences store only the format (numeric/alphanumeric).
 * Full configs with grid-specific details are generated when applied to boxes.
 */
import { Table2 } from 'lucide-react';

import type { PositionDisplayPreference } from '@odysseus/shared-schemas';

interface PositionDisplayPreferenceTabProps {
  defaultPositionDisplay: PositionDisplayPreference | null | undefined;
  savedPositionDisplay: PositionDisplayPreference | null | undefined;
  onChange: (preference: PositionDisplayPreference | undefined) => void;
}

export function PositionDisplayPreferenceTab({
  defaultPositionDisplay,
  savedPositionDisplay,
  onChange,
}: PositionDisplayPreferenceTabProps) {
  const currentFormat = defaultPositionDisplay?.format ?? null;
  const savedFormat = savedPositionDisplay?.format ?? null;

  const handleFormatChange = (format: 'numeric' | 'alphanumeric' | null) => {
    if (format === null) {
      onChange(undefined);
    } else {
      onChange({ format });
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-3 border-b border-gray-200 mb-4">
        <Table2 size={22} className="text-gray-700" />
        <h3 className="text-xl font-semibold text-gray-900">Display Preferences</h3>
      </div>

      {/* Position Display Format Section */}
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-2">Position Display Format</h4>
        <p className="text-xs text-gray-600 mb-3">
          Choose how position labels are displayed throughout the application.
          This is your personal preference and won&apos;t affect other users.
        </p>

        {/* Segmented Control with Inline Descriptions */}
        <div className="grid grid-cols-3 gap-2">
          {/* Numeric Option */}
          <button
            type="button"
            onClick={() => handleFormatChange('numeric')}
            className={`px-3 py-2 rounded-lg border-2 text-left transition-all relative ${
              currentFormat === 'numeric'
                ? 'bg-action border-action text-white shadow-md'
                : 'bg-white border-gray-300 text-gray-700 hover:border-action hover:bg-action/10'
            }`}
          >
            {savedFormat === 'numeric' && (
              <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
                currentFormat === 'numeric'
                  ? 'bg-white/20 text-white'
                  : 'bg-action text-white'
              }`}>
                Active
              </span>
            )}
            <h5 className="text-sm font-semibold mb-1">Numeric</h5>
            <p className={`text-xs mb-2 ${currentFormat === 'numeric' ? 'text-white/80' : 'text-gray-600'}`}>
              Sequential numbers
            </p>
            <div className="flex items-center space-x-1 text-xs">
              <span className={`font-mono px-1.5 py-0.5 rounded ${
                currentFormat === 'numeric'
                  ? 'bg-action-hover text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>1</span>
              <span className={`font-mono px-1.5 py-0.5 rounded ${
                currentFormat === 'numeric'
                  ? 'bg-action-hover text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>2</span>
              <span>...</span>
              <span className={`font-mono px-1.5 py-0.5 rounded ${
                currentFormat === 'numeric'
                  ? 'bg-action-hover text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>81</span>
            </div>
          </button>

          {/* Alphanumeric Option */}
          <button
            type="button"
            onClick={() => handleFormatChange('alphanumeric')}
            className={`px-3 py-2 rounded-lg border-2 text-left transition-all relative ${
              currentFormat === 'alphanumeric'
                ? 'bg-action border-action text-white shadow-md'
                : 'bg-white border-gray-300 text-gray-700 hover:border-action hover:bg-action/10'
            }`}
          >
            {savedFormat === 'alphanumeric' && (
              <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
                currentFormat === 'alphanumeric'
                  ? 'bg-white/20 text-white'
                  : 'bg-action text-white'
              }`}>
                Active
              </span>
            )}
            <h5 className="text-sm font-semibold mb-1">Alphanumeric</h5>
            <p className={`text-xs mb-2 ${currentFormat === 'alphanumeric' ? 'text-white/80' : 'text-gray-600'}`}>
              Row letter + column
            </p>
            <div className="flex items-center space-x-1 text-xs">
              <span className={`font-mono px-1.5 py-0.5 rounded ${
                currentFormat === 'alphanumeric'
                  ? 'bg-action-hover text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>A1</span>
              <span className={`font-mono px-1.5 py-0.5 rounded ${
                currentFormat === 'alphanumeric'
                  ? 'bg-action-hover text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>B2</span>
              <span>...</span>
              <span className={`font-mono px-1.5 py-0.5 rounded ${
                currentFormat === 'alphanumeric'
                  ? 'bg-action-hover text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>I9</span>
            </div>
          </button>

          {/* System Default Option */}
          <button
            type="button"
            onClick={() => handleFormatChange(null)}
            className={`px-3 py-2 rounded-lg border-2 text-left transition-all relative ${
              !currentFormat
                ? 'bg-action border-action text-white shadow-md'
                : 'bg-white border-gray-300 text-gray-700 hover:border-action hover:bg-action/10'
            }`}
          >
            {!savedFormat && (
              <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
                !currentFormat
                  ? 'bg-white/20 text-white'
                  : 'bg-action text-white'
              }`}>
                Active
              </span>
            )}
            <h5 className="text-sm font-semibold mb-1">System Default</h5>
            <p className={`text-xs mb-2 ${!currentFormat ? 'text-white/80' : 'text-gray-600'}`}>
              Alphanumeric format
            </p>
            <div className="flex items-center space-x-1 text-xs">
              <span className={`font-mono px-1.5 py-0.5 rounded ${
                !currentFormat
                  ? 'bg-action-hover text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>A1</span>
              <span className={`font-mono px-1.5 py-0.5 rounded ${
                !currentFormat
                  ? 'bg-action-hover text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>B2</span>
              <span>...</span>
              <span className={`font-mono px-1.5 py-0.5 rounded ${
                !currentFormat
                  ? 'bg-action-hover text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>I9</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
