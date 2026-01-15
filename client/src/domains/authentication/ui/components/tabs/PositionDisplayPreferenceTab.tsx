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
      <div className="flex items-center space-x-2 pb-3 border-b border-border mb-4">
        <Table2 size={22} className="text-secondary-foreground" />
        <h3 className="text-xl font-semibold text-card-foreground">Display Preferences</h3>
      </div>

      {/* Position Display Format Section */}
      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">
          Position Display Format
        </h4>
        <p className="text-xs text-secondary-foreground mb-3">
          Choose how position labels are displayed throughout the application. This is your personal
          preference and won&apos;t affect other users.
        </p>

        {/* Segmented Control with Inline Descriptions */}
        <div className="grid grid-cols-3 gap-2">
          {/* Numeric Option */}
          <button
            type="button"
            onClick={() => handleFormatChange('numeric')}
            className={`px-3 py-2 rounded-lg border-2 text-left transition-all relative focus-ring-default ${
              currentFormat === 'numeric'
                ? 'bg-action border-action text-white shadow-md'
                : 'bg-card border-border text-secondary-foreground hover:border-action hover:bg-action/10'
            }`}
          >
            {savedFormat === 'numeric' && (
              <span
                className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
                  currentFormat === 'numeric' ? 'bg-white/20 text-white' : 'bg-action text-white'
                }`}
              >
                Active
              </span>
            )}
            <h5 className="text-sm font-semibold mb-1">Numeric</h5>
            <p
              className={`text-xs mb-2 ${currentFormat === 'numeric' ? 'text-white/80' : 'text-secondary-foreground'}`}
            >
              Sequential numbers
            </p>
            <div className="flex items-center space-x-1 text-xs">
              <span
                className={`font-mono px-1.5 py-0.5 rounded ${
                  currentFormat === 'numeric'
                    ? 'bg-action-hover text-white'
                    : 'bg-muted text-secondary-foreground'
                }`}
              >
                1
              </span>
              <span
                className={`font-mono px-1.5 py-0.5 rounded ${
                  currentFormat === 'numeric'
                    ? 'bg-action-hover text-white'
                    : 'bg-muted text-secondary-foreground'
                }`}
              >
                2
              </span>
              <span>...</span>
              <span
                className={`font-mono px-1.5 py-0.5 rounded ${
                  currentFormat === 'numeric'
                    ? 'bg-action-hover text-white'
                    : 'bg-muted text-secondary-foreground'
                }`}
              >
                81
              </span>
            </div>
          </button>

          {/* Alphanumeric Option */}
          <button
            type="button"
            onClick={() => handleFormatChange('alphanumeric')}
            className={`px-3 py-2 rounded-lg border-2 text-left transition-all relative focus-ring-default ${
              currentFormat === 'alphanumeric'
                ? 'bg-action border-action text-white shadow-md'
                : 'bg-card border-border text-secondary-foreground hover:border-action hover:bg-action/10'
            }`}
          >
            {savedFormat === 'alphanumeric' && (
              <span
                className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
                  currentFormat === 'alphanumeric'
                    ? 'bg-white/20 text-white'
                    : 'bg-action text-white'
                }`}
              >
                Active
              </span>
            )}
            <h5 className="text-sm font-semibold mb-1">Alphanumeric</h5>
            <p
              className={`text-xs mb-2 ${currentFormat === 'alphanumeric' ? 'text-white/80' : 'text-secondary-foreground'}`}
            >
              Row letter + column
            </p>
            <div className="flex items-center space-x-1 text-xs">
              <span
                className={`font-mono px-1.5 py-0.5 rounded ${
                  currentFormat === 'alphanumeric'
                    ? 'bg-action-hover text-white'
                    : 'bg-muted text-secondary-foreground'
                }`}
              >
                A1
              </span>
              <span
                className={`font-mono px-1.5 py-0.5 rounded ${
                  currentFormat === 'alphanumeric'
                    ? 'bg-action-hover text-white'
                    : 'bg-muted text-secondary-foreground'
                }`}
              >
                B2
              </span>
              <span>...</span>
              <span
                className={`font-mono px-1.5 py-0.5 rounded ${
                  currentFormat === 'alphanumeric'
                    ? 'bg-action-hover text-white'
                    : 'bg-muted text-secondary-foreground'
                }`}
              >
                I9
              </span>
            </div>
          </button>

          {/* System Default Option */}
          <button
            type="button"
            onClick={() => handleFormatChange(null)}
            className={`px-3 py-2 rounded-lg border-2 text-left transition-all relative focus-ring-default ${
              !currentFormat
                ? 'bg-action border-action text-white shadow-md'
                : 'bg-card border-border text-secondary-foreground hover:border-action hover:bg-action/10'
            }`}
          >
            {!savedFormat && (
              <span
                className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
                  !currentFormat ? 'bg-white/20 text-white' : 'bg-action text-white'
                }`}
              >
                Active
              </span>
            )}
            <h5 className="text-sm font-semibold mb-1">System Default</h5>
            <p
              className={`text-xs mb-2 ${!currentFormat ? 'text-white/80' : 'text-secondary-foreground'}`}
            >
              Alphanumeric format
            </p>
            <div className="flex items-center space-x-1 text-xs">
              <span
                className={`font-mono px-1.5 py-0.5 rounded ${
                  !currentFormat
                    ? 'bg-action-hover text-white'
                    : 'bg-muted text-secondary-foreground'
                }`}
              >
                A1
              </span>
              <span
                className={`font-mono px-1.5 py-0.5 rounded ${
                  !currentFormat
                    ? 'bg-action-hover text-white'
                    : 'bg-muted text-secondary-foreground'
                }`}
              >
                B2
              </span>
              <span>...</span>
              <span
                className={`font-mono px-1.5 py-0.5 rounded ${
                  !currentFormat
                    ? 'bg-action-hover text-white'
                    : 'bg-muted text-secondary-foreground'
                }`}
              >
                I9
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
