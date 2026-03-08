/**
 * Display Preferences
 *
 * Theme and position display format settings.
 */
import { type ReactNode } from 'react';

import { Monitor, Moon, Sun, Table2, type LucideIcon } from 'lucide-react';

import type { PositionDisplayPreference, ThemePreference } from '@odysseus/shared-schemas';

const SELECTED_CLASS =
  'bg-action [[data-theme=dark]_&]:bg-action/70 border-action [[data-theme=dark]_&]:border-action/70 text-white shadow-md';
const UNSELECTED_CLASS =
  'bg-card border-border text-secondary-foreground hover:border-action hover:bg-action/10';

function ActiveBadge({ isSelected }: { isSelected: boolean }) {
  return (
    <span
      className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
        isSelected ? 'bg-white/20 text-white' : 'bg-action text-white'
      }`}
    >
      Active
    </span>
  );
}

function SampleChip({ isSelected, children }: { isSelected: boolean; children: ReactNode }) {
  return (
    <span
      className={`font-mono px-1.5 py-0.5 rounded ${
        isSelected ? 'bg-action-hover text-white' : 'bg-muted text-secondary-foreground'
      }`}
    >
      {children}
    </span>
  );
}

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  { value: 'light', label: 'Light', description: 'Bright appearance', Icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Reduced brightness', Icon: Moon },
  { value: 'auto', label: 'System', description: 'Match OS setting', Icon: Monitor },
];

const FORMAT_OPTIONS: {
  value: 'numeric' | 'alphanumeric' | null;
  label: string;
  description: string;
  samples: string[];
}[] = [
  {
    value: 'numeric',
    label: 'Numeric',
    description: 'Sequential numbers',
    samples: ['1', '2', '81'],
  },
  {
    value: 'alphanumeric',
    label: 'Alphanumeric',
    description: 'Row letter + column',
    samples: ['A1', 'B2', 'I9'],
  },
  {
    value: null,
    label: 'System Default',
    description: 'Alphanumeric format',
    samples: ['A1', 'B2', 'I9'],
  },
];

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
      <div className="flex items-center space-x-2 pb-3 border-b border-border">
        <Table2 size={22} className="text-secondary-foreground" />
        <h3 className="text-xl font-semibold text-card-foreground">Display</h3>
      </div>

      {/* Theme Section */}
      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-3">Theme</h4>

        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, description, Icon }) => {
            const isSelected = theme === value;
            const isSaved = savedTheme === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => onThemeChange(value)}
                className={`px-3 py-3 rounded-lg border-2 text-left transition-all relative ${
                  isSelected ? SELECTED_CLASS : UNSELECTED_CLASS
                }`}
              >
                {isSaved && <ActiveBadge isSelected={isSelected} />}
                <Icon
                  size={20}
                  className={`mb-2 ${isSelected ? 'text-white' : 'text-secondary-foreground'}`}
                />
                <h5 className="text-sm font-semibold">{label}</h5>
                <p
                  className={`text-xs ${isSelected ? 'text-white/80' : 'text-secondary-foreground'}`}
                >
                  {description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Position Display Format Section */}
      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">
          Position Display Format
        </h4>
        <p className="text-xs text-secondary-foreground mb-3">
          Choose how position labels are displayed throughout the application.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {FORMAT_OPTIONS.map(({ value, label, description, samples }) => {
            const isSelected = currentFormat === value;
            const isSaved = savedFormat === value;

            return (
              <button
                key={label}
                type="button"
                onClick={() => handleFormatChange(value)}
                className={`px-3 py-2 rounded-lg border-2 text-left transition-all relative ${
                  isSelected ? SELECTED_CLASS : UNSELECTED_CLASS
                }`}
              >
                {isSaved && <ActiveBadge isSelected={isSelected} />}
                <h5 className="text-sm font-semibold mb-1">{label}</h5>
                <p
                  className={`text-xs mb-2 ${isSelected ? 'text-white/80' : 'text-secondary-foreground'}`}
                >
                  {description}
                </p>
                <div className="flex items-center space-x-1 text-xs">
                  <SampleChip isSelected={isSelected}>{samples[0]}</SampleChip>
                  <SampleChip isSelected={isSelected}>{samples[1]}</SampleChip>
                  <span>...</span>
                  <SampleChip isSelected={isSelected}>{samples[2]}</SampleChip>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
