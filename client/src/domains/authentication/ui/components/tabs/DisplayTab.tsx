/**
 * Display Tab
 *
 * Allows users to set display-related preferences:
 * - Theme (light/dark/auto)
 * - Position display format (numeric/alphanumeric)
 */
import { Monitor, Moon, Sun, Table2 } from 'lucide-react';

import type { PositionDisplayPreference, ThemePreference } from '@odysseus/shared-schemas';

interface DisplayTabProps {
  defaultPositionDisplay: PositionDisplayPreference | null | undefined;
  savedPositionDisplay: PositionDisplayPreference | null | undefined;
  onChange: (preference: PositionDisplayPreference | undefined) => void;
  theme: ThemePreference;
  savedTheme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}

export function DisplayTab({
  defaultPositionDisplay,
  savedPositionDisplay,
  onChange,
  theme,
  savedTheme,
  onThemeChange,
}: DisplayTabProps) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-3 border-b border-border">
        <Table2 size={22} className="text-secondary-foreground" />
        <h3 className="text-xl font-semibold text-card-foreground">Display</h3>
      </div>

      {/* Theme Section */}
      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">Theme</h4>
        <p className="text-xs text-secondary-foreground mb-3">
          Choose your preferred color scheme. &quot;System&quot; follows your operating
          system&apos;s theme preference.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {/* Light Option */}
          <button
            type="button"
            onClick={() => onThemeChange('light')}
            className={`px-3 py-3 rounded-lg border-2 text-left transition-all relative focus-ring-default ${
              theme === 'light'
                ? 'bg-action [[data-theme=dark]_&]:bg-action/70 border-action [[data-theme=dark]_&]:border-action/70 text-white shadow-md'
                : 'bg-card border-border text-secondary-foreground hover:border-action hover:bg-action/10'
            }`}
          >
            {savedTheme === 'light' && (
              <span
                className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
                  theme === 'light' ? 'bg-white/20 text-white' : 'bg-action text-white'
                }`}
              >
                Active
              </span>
            )}
            <Sun
              size={20}
              className={`mb-2 ${theme === 'light' ? 'text-white' : 'text-secondary-foreground'}`}
            />
            <h5 className="text-sm font-semibold">Light</h5>
            <p
              className={`text-xs ${theme === 'light' ? 'text-white/80' : 'text-secondary-foreground'}`}
            >
              Bright appearance
            </p>
          </button>

          {/* Dark Option */}
          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            className={`px-3 py-3 rounded-lg border-2 text-left transition-all relative focus-ring-default ${
              theme === 'dark'
                ? 'bg-action [[data-theme=dark]_&]:bg-action/70 border-action [[data-theme=dark]_&]:border-action/70 text-white shadow-md'
                : 'bg-card border-border text-secondary-foreground hover:border-action hover:bg-action/10'
            }`}
          >
            {savedTheme === 'dark' && (
              <span
                className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
                  theme === 'dark' ? 'bg-white/20 text-white' : 'bg-action text-white'
                }`}
              >
                Active
              </span>
            )}
            <Moon
              size={20}
              className={`mb-2 ${theme === 'dark' ? 'text-white' : 'text-secondary-foreground'}`}
            />
            <h5 className="text-sm font-semibold">Dark</h5>
            <p
              className={`text-xs ${theme === 'dark' ? 'text-white/80' : 'text-secondary-foreground'}`}
            >
              Reduced brightness
            </p>
          </button>

          {/* System Option */}
          <button
            type="button"
            onClick={() => onThemeChange('auto')}
            className={`px-3 py-3 rounded-lg border-2 text-left transition-all relative focus-ring-default ${
              theme === 'auto'
                ? 'bg-action [[data-theme=dark]_&]:bg-action/70 border-action [[data-theme=dark]_&]:border-action/70 text-white shadow-md'
                : 'bg-card border-border text-secondary-foreground hover:border-action hover:bg-action/10'
            }`}
          >
            {savedTheme === 'auto' && (
              <span
                className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
                  theme === 'auto' ? 'bg-white/20 text-white' : 'bg-action text-white'
                }`}
              >
                Active
              </span>
            )}
            <Monitor
              size={20}
              className={`mb-2 ${theme === 'auto' ? 'text-white' : 'text-secondary-foreground'}`}
            />
            <h5 className="text-sm font-semibold">System</h5>
            <p
              className={`text-xs ${theme === 'auto' ? 'text-white/80' : 'text-secondary-foreground'}`}
            >
              Match OS setting
            </p>
          </button>
        </div>
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
                ? 'bg-action [[data-theme=dark]_&]:bg-action/70 border-action [[data-theme=dark]_&]:border-action/70 text-white shadow-md'
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
                ? 'bg-action [[data-theme=dark]_&]:bg-action/70 border-action [[data-theme=dark]_&]:border-action/70 text-white shadow-md'
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
                ? 'bg-action [[data-theme=dark]_&]:bg-action/70 border-action [[data-theme=dark]_&]:border-action/70 text-white shadow-md'
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
