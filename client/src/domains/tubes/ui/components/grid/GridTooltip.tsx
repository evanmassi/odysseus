/**
 * Grid Tooltip
 *
 * Singleton tooltip for TubeGrid using controlled Tooltip component.
 * Positions anchor element at hovered cell, delegates all tooltip behavior to base component.
 */
import { useState, useEffect, useRef } from 'react';

import { createPortal } from 'react-dom';

import { Tooltip } from '@shared/ui';

import { parseDonorInfo } from '../../../utils/colorSystem';

import type { TubeData } from '@domains/tubes/types';

interface GridTooltipProps {
  tube: TubeData | null;
  anchorRect: DOMRect | null;
}

const TOOLTIP_DELAY = 400;

export function GridTooltip({ tube, anchorRect }: GridTooltipProps) {
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

  const tooltipContent = (
    <div className="flex flex-col gap-1">
      <div className="font-semibold text-white">{cellType}</div>
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
