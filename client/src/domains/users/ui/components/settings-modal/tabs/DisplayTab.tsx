/**
 * Display Preferences
 *
 * Theme and position display format settings.
 */
import { type ReactNode } from 'react';

import { Monitor, Moon, Save, Sun, type LucideIcon } from 'lucide-react';

import { Button, ConsolePanel, Subsection, UnsavedChangesIndicator } from '@shared/ui';

import type { PositionDisplayPreference, ThemePreference } from '@odysseus/shared-schemas';

const CARD_BASE =
  'relative border px-3 py-3 text-left ' +
  'transition-[background-color,border-color,box-shadow,color] duration-200 ' +
  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary/40';
const CARD_SELECTED =
  'border-primary/60 bg-[hsl(var(--primary)/0.10)] text-foreground ' +
  'shadow-[inset_0_0_12px_-2px_hsl(var(--primary)/0.30),0_0_18px_-4px_hsl(var(--primary)/0.50)]';
const CARD_UNSELECTED =
  'border-line-mid text-secondary-foreground ' +
  'shadow-[inset_0_0_12px_-3px_hsl(var(--primary)/0.10)] ' +
  'hover:border-primary/40 hover:text-foreground ' +
  'hover:shadow-[inset_0_0_12px_-2px_hsl(var(--primary)/0.22),0_0_14px_-6px_hsl(var(--primary)/0.42)]';

function SavedMarker() {
  return (
    <span className="absolute right-2 top-2 flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.16em] text-primary">
      <span
        aria-hidden
        className="h-1 w-1 rounded-full bg-primary shadow-[0_0_5px_hsl(var(--primary)/0.85)]"
      />
      Saved
    </span>
  );
}

function SampleChip({ isSelected, children }: { isSelected: boolean; children: ReactNode }) {
  return (
    <span
      className={`phosphor-text border px-1.5 py-0.5 font-mono ${
        isSelected
          ? 'border-primary/30 bg-primary/15 text-foreground'
          : 'border-transparent bg-foreground/[0.06] text-secondary-foreground'
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
  onSave: () => void;
  isSaving: boolean;
  dirtyCount: number;
}

export function DisplayTab({
  defaultPositionDisplay,
  savedPositionDisplay,
  onChange,
  theme,
  savedTheme,
  onThemeChange,
  onSave,
  isSaving,
  dirtyCount,
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
    <ConsolePanel intensity="soft">
      <Subsection title="Theme" index={1} accent>
        <div className="col-span-2 py-4">
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, label, description, Icon }) => {
              const isSelected = theme === value;
              const isSaved = savedTheme === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onThemeChange(value)}
                  className={`${CARD_BASE} ${isSelected ? CARD_SELECTED : CARD_UNSELECTED}`}
                >
                  {isSaved && <SavedMarker />}
                  <Icon
                    size={20}
                    className={`mb-2 ${
                      isSelected
                        ? 'text-primary [filter:drop-shadow(0_0_6px_hsl(var(--primary)/0.6))]'
                        : 'text-muted-foreground'
                    }`}
                  />
                  <h5 className={`text-sm font-semibold ${isSelected ? 'phosphor-text' : ''}`}>
                    {label}
                  </h5>
                  <p className="text-xs text-secondary-foreground">{description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </Subsection>

      <Subsection title="Position Format" index={2} accent>
        <div className="col-span-2 py-4">
          <p className="mb-3 text-xs text-secondary-foreground">
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
                  className={`${CARD_BASE} ${isSelected ? CARD_SELECTED : CARD_UNSELECTED}`}
                >
                  {isSaved && <SavedMarker />}
                  <h5 className={`mb-1 text-sm font-semibold ${isSelected ? 'phosphor-text' : ''}`}>
                    {label}
                  </h5>
                  <p className="mb-2 text-xs text-secondary-foreground">{description}</p>
                  <div className="flex items-center space-x-1 text-xs">
                    <SampleChip isSelected={isSelected}>{samples[0]}</SampleChip>
                    <SampleChip isSelected={isSelected}>{samples[1]}</SampleChip>
                    <span className="text-muted-foreground">...</span>
                    <SampleChip isSelected={isSelected}>{samples[2]}</SampleChip>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Subsection>

      <div className="flex items-center justify-between gap-4 border-t border-line-soft bg-shade/25 [background-image:linear-gradient(0deg,hsl(var(--foreground)/0.035)_0%,transparent_70%)] px-5 py-3">
        <UnsavedChangesIndicator count={dirtyCount} />
        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={dirtyCount === 0}
          isLoading={isSaving}
          loadingText="Saving..."
          leftIcon={<Save size={14} />}
        >
          Save Display Settings
        </Button>
      </div>
    </ConsolePanel>
  );
}
