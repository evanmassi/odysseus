import type { CSSProperties } from 'react';

import { Power } from 'lucide-react';

import { useResolvedTheme } from '@shared/hooks';

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
  const isDark = useResolvedTheme() === 'dark';
  const isActiveLight = isActive && !isDark;

  const handleClick = () => {
    if (isLoading) return;
    if (isActive) onDeactivate();
    else onActivate();
  };

  const bodyTone = isActiveLight
    ? 'bg-success-bg/10 border-success-bg/45 shadow-standard-success hover:bg-success-bg/20 hover:border-success-bg hover:shadow-standard-success-hover active:bg-success-bg/[0.28]'
    : isActive
      ? 'border-success-bg dark:shadow-[inset_0_0_14px_-2px_hsl(var(--color-success-bg)/0.45),0_0_22px_-2px_hsl(var(--color-success-bg)/0.55)] dark:hover:shadow-[inset_0_0_16px_-2px_hsl(var(--color-success-bg)/0.6),0_0_32px_-2px_hsl(var(--color-success-bg)/0.8)]'
      : 'border-line-mid hover:border-line-strong dark:hover:shadow-[0_0_20px_-4px_hsl(var(--foreground)/0.28)]';

  const glyphTone = isActive
    ? 'text-success-text dark:[filter:drop-shadow(0_0_3px_hsl(var(--color-success-text)/0.85))]'
    : 'text-foreground/40';

  const bgStyle: CSSProperties = isActiveLight
    ? {}
    : {
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
        lock-on group relative flex h-10 w-10 items-center justify-center border
        transition-[background,border-color,box-shadow] duration-200
        ${bodyTone}
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
