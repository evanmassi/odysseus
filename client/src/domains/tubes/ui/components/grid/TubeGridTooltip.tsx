/**
 * Grid Tooltip
 *
 * Singleton tooltip for TubeGrid using controlled Tooltip component.
 * Positions anchor element at hovered cell, delegates all tooltip behavior to base component.
 */
import { useState, useEffect, useRef } from 'react';

import { Lock, ShieldCheck, ShieldUser } from 'lucide-react';
import { createPortal } from 'react-dom';

import { NubDivider, ScrimHalo, Tooltip } from '@shared/ui';

import { parseDonorInfo } from '../../../utils/tubeColorCoding';

import type { LockVariant, TubeData } from '@domains/tubes/types';

interface TubeGridTooltipProps {
  tube: TubeData | null;
  anchorRect: DOMRect | null;
  lockVariant?: LockVariant;
  lockOwnerName?: string;
}

const TOOLTIP_DELAY = 400;

const lockIcons = {
  own: Lock,
  shared: ShieldCheck,
  'admin-override': ShieldUser,
  other: Lock,
} as const;

const lockLabels: Record<LockVariant, (name: string) => string> = {
  own: () => 'Locked by you',
  shared: name => `Shared by ${name}`,
  'admin-override': name => `Locked by ${name} (admin override)`,
  other: name => `Locked by ${name}`,
};

const CORNER_PINS = [
  'left-2 top-2',
  'right-2 top-2',
  'bottom-2 left-2',
  'bottom-2 right-2',
] as const;

function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-tooltip-muted">
        {label}
      </span>
      <span className="font-mono text-[11px] text-tooltip-foreground">{value}</span>
    </div>
  );
}

export function TubeGridTooltip({
  tube,
  anchorRect,
  lockVariant,
  lockOwnerName,
}: TubeGridTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (tube && anchorRect) {
      timerRef.current = window.setTimeout(() => {
        setIsOpen(true);
      }, TOOLTIP_DELAY);
    } else {
      setIsOpen(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [tube, anchorRect]);

  if (!tube || !anchorRect) {
    return null;
  }

  const donorInfo = parseDonorInfo(tube);

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty cellType should show fallback
  const cellType = tube.sample?.cellType || 'Unknown';
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty donorSourceId should fall back to computed source
  const sourceId = tube.sample?.donorSourceId || donorInfo.source;

  const LockIcon = lockVariant ? lockIcons[lockVariant] : null;
  const lockLabel = lockVariant && lockOwnerName ? lockLabels[lockVariant](lockOwnerName) : null;
  const isLockedOut = lockVariant === 'other';

  const tooltipContent = (
    <div className="relative isolate min-w-[172px] max-w-[260px] px-4 py-3.5">
      <ScrimHalo />
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-full h-1.5 w-1.5 -translate-x-1/2 bg-foreground shadow-[0_0_5px_hsl(var(--foreground)/0.8)]"
      />
      {CORNER_PINS.map(pos => (
        <span
          key={pos}
          aria-hidden
          className={`pointer-events-none absolute h-0.5 w-1.5 bg-foreground shadow-[0_0_5px_hsl(var(--foreground)/0.8)] ${pos}`}
        />
      ))}

      <div className="mb-2 flex items-baseline gap-1.5">
        <span className="text-[15px] font-semibold leading-tight text-tooltip-foreground">
          {cellType}
        </span>
        {tube.sample?.species && (
          <>
            <span className="text-tooltip-foreground/30">·</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-tooltip-muted">
              {tube.sample.species}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {donorInfo.internal && <LedgerRow label="Int ID" value={donorInfo.internal} />}
        {donorInfo.source && <LedgerRow label="Src ID" value={sourceId} />}
        {tube.sample?.lotNumber && <LedgerRow label="Lot" value={tube.sample.lotNumber} />}
        {tube.sample?.cultureCondition && (
          <LedgerRow label="Cond" value={tube.sample.cultureCondition} />
        )}
      </div>

      {LockIcon && lockLabel && (
        <>
          <NubDivider tone="neutral" className="relative my-2" />
          <div
            className={`flex items-center gap-1.5 ${isLockedOut ? 'text-danger-text' : 'text-tooltip-foreground'}`}
          >
            <LockIcon size={11} strokeWidth={2.5} />
            <span className="font-mono text-[10.5px]">{lockLabel}</span>
          </div>
          {tube.lockNote && (
            <div className="mt-1 font-mono text-[10px] italic text-tooltip-muted">
              &ldquo;{tube.lockNote}&rdquo;
            </div>
          )}
        </>
      )}
    </div>
  );

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: anchorRect.top,
        left: anchorRect.left,
        width: anchorRect.width,
        height: anchorRect.height,
        pointerEvents: 'none',
      }}
    >
      <Tooltip
        content={tooltipContent}
        open={isOpen}
        onOpenChange={setIsOpen}
        delayDuration={0}
        side="top"
        bare
      >
        {/* Explicit pixel dimensions - percentages don't work with display:contents wrapper */}
        <div style={{ width: anchorRect.width, height: anchorRect.height }} />
      </Tooltip>
    </div>,
    document.body
  );
}
