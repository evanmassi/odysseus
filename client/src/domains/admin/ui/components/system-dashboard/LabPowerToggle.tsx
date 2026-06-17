/**
 * Lab Power Toggle
 *
 * Square activate/deactivate control with corner-tick framing and a status-lit body.
 */

import type { CSSProperties } from 'react';

import { Power } from 'lucide-react';

interface LabPowerToggleProps {
  isActive: boolean;
  isLoading: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

const TICK_BASE = 'pointer-events-none absolute h-[3px] w-[3px] transition-colors duration-200';

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

  const tickTone = isActive
    ? 'border-success-bg/70 group-hover:border-success-bg'
    : 'border-line-mid group-hover:border-line-strong';

  const glyphTone = isActive
    ? 'text-success-text [filter:drop-shadow(0_0_3px_hsl(var(--color-success-text)/0.85))]'
    : 'text-foreground/40';

  const bgStyle: CSSProperties = {
    background: isActive
      ? `radial-gradient(circle at 50% 35%, hsl(var(--color-success-bg)/0.35), hsl(var(--color-success-bg)/0.05) 70%), hsl(var(--card))`
      : `radial-gradient(circle at 50% 35%, hsl(var(--sheen) / 0.025), hsl(var(--sheen) / 0) 60%), hsl(var(--card))`,
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
        group relative flex h-10 w-10 items-center justify-center border
        transition-[background,border-color,box-shadow] duration-200
        ${bodyTone}
        ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
    >
      <span aria-hidden className={`${TICK_BASE} -top-1 -left-1 border-t border-l ${tickTone}`} />
      <span aria-hidden className={`${TICK_BASE} -top-1 -right-1 border-t border-r ${tickTone}`} />
      <span
        aria-hidden
        className={`${TICK_BASE} -bottom-1 -left-1 border-b border-l ${tickTone}`}
      />
      <span
        aria-hidden
        className={`${TICK_BASE} -bottom-1 -right-1 border-b border-r ${tickTone}`}
      />
      <Power
        size={16}
        strokeWidth={1.6}
        className={`transition-[color,filter] duration-200 ${glyphTone}`}
      />
    </button>
  );
}
