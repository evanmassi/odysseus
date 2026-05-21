/**
 * Lab Power Toggle
 *
 * Square activate/deactivate control with a status-lit ring.
 */

import type { CSSProperties } from 'react';

import { Power } from 'lucide-react';

interface LabPowerToggleProps {
  isActive: boolean;
  isLoading: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function LabPowerToggle({
  isActive,
  isLoading,
  onActivate,
  onDeactivate,
}: LabPowerToggleProps) {
  const handleClick = () => {
    if (isLoading) return;
    if (isActive) onDeactivate();
    else onActivate();
  };

  const bodyTone = isActive
    ? 'border-success-bg shadow-[inset_0_0_14px_-2px_hsl(var(--color-success-bg)/0.45),0_0_22px_-2px_hsl(var(--color-success-bg)/0.55)] hover:shadow-[inset_0_0_16px_-2px_hsl(var(--color-success-bg)/0.6),0_0_32px_-2px_hsl(var(--color-success-bg)/0.8)]'
    : 'border-line-mid hover:border-line-strong hover:shadow-[0_0_20px_-4px_hsl(var(--foreground)/0.28)]';

  const ringTone = isActive
    ? 'before:border-success-bg/60 before:shadow-[0_0_14px_-2px_hsl(var(--color-success-bg)/0.35)] hover:before:border-success-bg/80 hover:before:shadow-[0_0_20px_-2px_hsl(var(--color-success-bg)/0.55)]'
    : 'before:border-line-soft hover:before:border-line-mid';

  const glyphTone = isActive
    ? 'text-success-text [filter:drop-shadow(0_0_3px_hsl(var(--color-success-text)/0.85))]'
    : 'text-foreground/40';

  const bgStyle: CSSProperties = {
    background: isActive
      ? `radial-gradient(circle at 50% 35%, hsl(var(--color-success-bg)/0.35), hsl(var(--color-success-bg)/0.05) 70%), hsl(var(--card))`
      : `radial-gradient(circle at 50% 35%, rgba(255,255,255,0.025), rgba(255,255,255,0) 60%), hsl(var(--card))`,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isActive ? 'Deactivate lab' : 'Activate lab'}
      aria-pressed={isActive}
      style={bgStyle}
      className={`
        relative flex h-10 w-10 items-center justify-center border
        transition-[background,border-color,box-shadow] duration-200
        before:absolute before:inset-[-4px]
        before:border before:border-dashed before:content-['']
        before:transition-[border-color,box-shadow] before:duration-200
        ${bodyTone}
        ${ringTone}
        ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
    >
      <Power
        size={16}
        strokeWidth={1.6}
        className={`transition-[color,filter] duration-200 ${glyphTone}`}
      />
    </button>
  );
}
