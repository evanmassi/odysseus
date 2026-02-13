/**
 * Grid Tooltip
 *
 * Singleton tooltip for TubeGrid using controlled Tooltip component.
 * Positions anchor element at hovered cell, delegates all tooltip behavior to base component.
 */
import { useState, useEffect, useRef } from 'react';

import { Lock, ShieldCheck, ShieldUser } from 'lucide-react';
import { createPortal } from 'react-dom';

import { Tooltip } from '@shared/ui';

import { parseDonorInfo } from '../../../utils/colorSystem';

import type { TubeData } from '@domains/tubes/types';

export type LockVariant = 'own' | 'shared' | 'admin-override' | 'other';

interface GridTooltipProps {
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

export function GridTooltip({ tube, anchorRect, lockVariant, lockOwnerName }: GridTooltipProps) {
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
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="font-semibold text-white">{cellType}</span>
        {tube.sample?.species && (
          <>
            <span className="text-white/30">·</span>
            <span className="text-tooltip-muted">{tube.sample.species}</span>
          </>
        )}
      </div>
      {donorInfo.internal && (
        <div className="text-white">
          <span className="text-tooltip-muted">Int. ID:</span> {donorInfo.internal}
        </div>
      )}
      {donorInfo.source && (
        <div className="text-white">
          <span className="text-tooltip-muted">Src. ID:</span> {sourceId}
        </div>
      )}
      {tube.sample?.lotNumber && (
        <div className="text-white">
          <span className="text-tooltip-muted">Lot #:</span> {tube.sample.lotNumber}
        </div>
      )}
      {tube.sample?.cultureCondition && (
        <div className="text-white">
          <span className="text-tooltip-muted">Cond.:</span> {tube.sample.cultureCondition}
        </div>
      )}
      {LockIcon && lockLabel && (
        <>
          <div className="border-t border-white/20 my-0.5" />
          <div
            className={`flex items-center gap-1.5 ${isLockedOut ? 'text-red-300' : 'text-white'}`}
          >
            <LockIcon size={11} strokeWidth={2.5} />
            <span>{lockLabel}</span>
          </div>
          {tube.lockNote && (
            <div className="text-tooltip-muted italic">&ldquo;{tube.lockNote}&rdquo;</div>
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
      >
        {/* Explicit pixel dimensions - percentages don't work with display:contents wrapper */}
        <div style={{ width: anchorRect.width, height: anchorRect.height }} />
      </Tooltip>
    </div>,
    document.body
  );
}
