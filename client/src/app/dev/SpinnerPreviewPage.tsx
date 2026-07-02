/**
 * Spinner Preview (Dev Only)
 *
 * Live-tune the counter-rotating brand loader — ring/snowflake speeds, size, breathe —
 * and preview it dropped into the boot-splash layout. An entry in the dev surface
 * preview gallery (/__dev/modals).
 */

import { useId, useState } from 'react';

import OdysseusLogo from '@shared/assets/odysseus-logo-thick.svg?react';
import { LoadingSpinner } from '@shared/ui';

interface Preset {
  label: string;
  ring: number;
  flake: number;
}

// Comparison points: balanced lead, ring-led, matched, slow, and flake-led.
const PRESETS: Preset[] = [
  { label: 'Ring-led 9 / 6', ring: 9, flake: 6 },
  { label: 'Gentle 12 / 8', ring: 12, flake: 8 },
  { label: 'Matched 7 / 7', ring: 7, flake: 7 },
  { label: 'Slow drift 16 / 11', ring: 16, flake: 11 },
  { label: 'Flake-led 6 / 9', ring: 6, flake: 9 },
];

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="flex items-center justify-between text-caption text-muted-foreground"
      >
        <span>{label}</span>
        <span className="font-mono text-data-sm text-foreground">
          {value}
          {suffix}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="accent-primary"
      />
    </div>
  );
}

export function SpinnerPreviewPage() {
  const [ring, setRing] = useState(15);
  const [flake, setFlake] = useState(10);
  const [size, setSize] = useState(96);
  const [breathe, setBreathe] = useState(false);

  return (
    <div className="fixed inset-0 z-40 overflow-auto bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-8 py-12">
        <header className="mb-8">
          <span className="type-label text-label-2xs tracking-label-wide text-primary">
            Dev · Odysseus spinner
          </span>
          <h1 className="mt-1 text-xl font-semibold">Counter-rotating loader</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            O ring spins clockwise, snowflake counter-clockwise. Tune the speeds, then see it in the
            boot splash. Use the top-right switch to check both themes.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <section className="flex flex-col gap-4 rounded-lg border border-line-soft bg-card p-6">
            <h2 className="type-label text-label-xs text-muted-foreground">Controls</h2>
            <Slider
              label="Ring revolution"
              value={ring}
              min={3}
              max={20}
              step={0.5}
              suffix="s"
              onChange={setRing}
            />
            <Slider
              label="Snowflake revolution"
              value={flake}
              min={3}
              max={20}
              step={0.5}
              suffix="s"
              onChange={setFlake}
            />
            <Slider
              label="Size"
              value={size}
              min={32}
              max={220}
              step={4}
              suffix="px"
              onChange={setSize}
            />
            <button
              type="button"
              onClick={() => setBreathe(b => !b)}
              className={`mt-1 self-start rounded-md border px-3 py-1.5 font-mono text-data-sm transition-colors ${
                breathe
                  ? 'border-primary/60 bg-primary text-primary-foreground'
                  : 'border-line-soft bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              Breathe {breathe ? 'on' : 'off'}
            </button>

            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setRing(preset.ring);
                    setFlake(preset.flake);
                  }}
                  className="rounded-md border border-line-soft bg-card px-2.5 py-1 text-caption text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col items-center justify-center gap-4 rounded-lg border border-line-soft bg-card p-6">
            <h2 className="type-label text-label-xs text-muted-foreground">Live</h2>
            <div
              className="flex items-center justify-center"
              style={{ minWidth: 220, minHeight: 220 }}
            >
              <LoadingSpinner
                size={size}
                ringDuration={ring}
                flakeDuration={flake}
                breathe={breathe}
                className="text-foreground"
              />
            </div>
            <span className="font-mono text-caption text-muted-foreground">
              ring {ring}s · flake {flake}s
            </span>
          </section>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 type-label text-label-xs text-muted-foreground">
            Boot splash, in situ
          </h2>
          <div className="auth-field relative flex h-[420px] items-center justify-center overflow-hidden rounded-lg border border-line-soft">
            <div className="flex flex-col items-center gap-6">
              <LoadingSpinner
                size={96}
                ringDuration={ring}
                flakeDuration={flake}
                breathe={breathe}
                className="text-[rgb(var(--auth-text))]"
              />
              <div className="flex flex-col items-center gap-3">
                <OdysseusLogo
                  className="h-7 w-auto text-[rgb(var(--auth-text-dim))] drop-shadow-icon-bloom"
                  aria-label="Odysseus"
                />
                <span className="phosphor-text type-label text-label-2xs tracking-ceremonial text-[rgb(var(--auth-text-mute))]">
                  [ Initializing ]
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
