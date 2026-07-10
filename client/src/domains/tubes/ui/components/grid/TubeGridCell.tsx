/**
 * Grid Cell
 *
 * Individual tube position cell with color coding, lock indicators, and property indicators.
 */
import React, { memo, useMemo, useRef, useCallback, useEffect } from 'react';

import { useStorageData, formatPositionForBox } from '@domains/storage';
import { useUserSettings } from '@domains/users';

import {
  getTubeColor,
  getLotStyleForBox,
  getConditionStyleForBox,
  parseDonorInfo,
} from '../../../utils/tubeColorCoding';
import { TubeLockIndicator } from '../locking/TubeLockIndicator';

import { TubePropertyIndicator } from './TubePropertyIndicator';

import type { GridConfiguration } from '@domains/storage';
import type { LockVariant, TubeData } from '@domains/tubes/types';

import './tube-grid.css';

/**
 * Cell type wraps to two lines (see .cell-line), so it holds a consistent size slightly
 * above the base font for a clear type→donor hierarchy — only very long names step back
 * toward the base rather than shrinking aggressively to fit a single line.
 */
function getCellTypeFontSize(baseFont: number, text: string): number {
  const len = text.length;
  if (len <= 20) return Math.min(baseFont * 1.06, 18);
  if (len <= 32) return baseFont;
  return baseFont * 0.9;
}

interface TubeGridCellProps {
  position: number;
  tankId: string;
  rackId: string;
  boxId: string;
  tube: TubeData | null | undefined;
  selected: boolean;
  isDragPreview?: boolean; // Visual preview only, no animation
  isCut: boolean;
  isCopied: boolean;
  gridConfig: GridConfiguration;
  fontSize: { cellFont: number; donorFont: number; positionFont: number };
  onPositionClick: (position: number, event: React.MouseEvent | React.KeyboardEvent) => void;
  onPositionRightClick: (position: number, event: React.MouseEvent) => void;
  onPositionDoubleClick?: (position: number, event: React.MouseEvent) => void;
  onMouseDown: (position: number, event: React.MouseEvent) => void;
  onMouseMove: (position: number) => void;
  // Shared tooltip handlers - parent renders single tooltip instance
  onHoverStart: (tube: TubeData, rect: DOMRect) => void;
  onHoverEnd: () => void;
  isLockedOut?: boolean;
  isLockedByCurrentUser?: boolean;
  hasSharedAccess?: boolean;
  hasAdminOverride?: boolean;
  lockOwnerName?: string;
}

export const TubeGridCell = memo<TubeGridCellProps>(
  ({
    position,
    tankId,
    rackId,
    boxId,
    tube,
    selected,
    isDragPreview = false,
    isCut,
    isCopied,
    gridConfig,
    fontSize,
    onPositionClick,
    onPositionRightClick,
    onPositionDoubleClick,
    onMouseDown,
    onMouseMove,
    onHoverStart,
    onHoverEnd,
    isLockedOut,
    isLockedByCurrentUser,
    hasSharedAccess,
    hasAdminOverride,
    lockOwnerName,
  }) => {
    const { settings } = useUserSettings();
    const { currentLab } = useStorageData();

    const colors = tube ? getTubeColor(tube) : null;
    const lotStyle = tube?.sample?.lotNumber ? getLotStyleForBox(tube.sample.lotNumber) : null;
    const conditionStyle = tube?.sample?.cultureCondition
      ? getConditionStyleForBox(tube.sample.cultureCondition)
      : null;
    const donorInfo = tube ? parseDonorInfo(tube) : { internal: '', source: '' };

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty cellType is validation failure, show fallback
    const cellTypeText = tube?.sample?.cellType || 'Unknown';
    // A name with no break opportunity (no space/hyphen) can't wrap, so truncate it on one
    // line with an ellipsis — the two-line clamp only ellipsizes multi-line overflow, which
    // leaves a lone long word (e.g. "Macrophages") hard-clipped with no "…".
    const cellTypeSingleWord = !/[\s-]/.test(cellTypeText);
    const cellTypeFontSize = useMemo(
      () => getCellTypeFontSize(fontSize.cellFont, cellTypeText),
      [fontSize.cellFont, cellTypeText]
    );

    const cellRef = useRef<HTMLDivElement>(null);
    const wasSelectedRef = useRef(selected);
    const freshlySelected = selected && !wasSelectedRef.current;

    useEffect(() => {
      wasSelectedRef.current = selected;
    }, [selected]);

    const handleMouseEnter = useCallback(() => {
      if (tube && cellRef.current) {
        onHoverStart(tube, cellRef.current.getBoundingClientRect());
      }
    }, [tube, onHoverStart]);

    const handleMouseLeave = useCallback(() => {
      onHoverEnd();
    }, [onHoverEnd]);

    const ink = colors?.textColor ?? 'hsl(var(--foreground))';
    const fill = colors?.backgroundColor ?? 'hsl(var(--grid-empty))';
    const positionLabel = formatPositionForBox(
      position,
      tankId,
      rackId,
      boxId,
      gridConfig,
      currentLab,
      settings
    );

    const MARK_INSET = 2;
    const MARK_STROKE = 'rgba(0, 0, 0, 0.5)';
    const lotMark = fontSize.positionFont + 1;
    const lockMark = fontSize.positionFont + 2;
    const triLeg = fontSize.positionFont + 2;

    const lockVariant: LockVariant | undefined = !tube
      ? undefined
      : isLockedByCurrentUser
        ? 'own'
        : hasSharedAccess && lockOwnerName
          ? 'shared'
          : hasAdminOverride && lockOwnerName
            ? 'admin-override'
            : isLockedOut && lockOwnerName
              ? 'other'
              : undefined;

    return (
      <div
        ref={cellRef}
        key={position}
        onClick={e => onPositionClick(position, e)}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
          }
        }}
        onDoubleClick={e => onPositionDoubleClick?.(position, e)}
        onContextMenu={e => onPositionRightClick(position, e)}
        onMouseDown={e => onMouseDown(position, e)}
        onMouseMove={() => onMouseMove(position)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="gridcell"
        aria-label={
          tube
            ? // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty cellType is validation failure, show fallback
              `Position ${position}, ${tube.sample?.cellType || 'Unknown sample'}, ${selected ? 'selected' : 'not selected'}`
            : `Position ${position}, empty, ${selected ? 'selected' : 'not selected'}`
        }
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        data-focus="custom"
        className={`
        tube-position relative group cursor-pointer
        ${tube ? 'occupied' : 'empty'}
        ${selected ? 'selected' : ''}
        ${freshlySelected ? 'freshly-selected' : ''}
        ${isDragPreview ? 'drag-preview' : ''}
        ${isCut ? 'cut-tube' : ''}
        ${isCopied ? 'copied-tube' : ''}
        ${isLockedOut ? 'opacity-70' : ''}
      `}
        style={
          {
            backgroundColor: tube ? fill : 'hsl(var(--grid-empty))',
            backgroundImage: tube
              ? 'linear-gradient(180deg, hsl(var(--sheen) / 0.12) 0%, hsl(var(--sheen) / 0) 46%, hsl(var(--shade) / 0.14) 100%)'
              : 'none',
            color: tube ? ink : 'hsl(var(--grid-empty-foreground))',
            width: '100%',
            height: '100%',
            aspectRatio: '1',
            '--border-color': tube ? 'hsl(var(--shade) / 0.22)' : 'transparent',
          } as React.CSSProperties
        }
        data-grid-size={`${gridConfig.rows}x${gridConfig.cols}`}
        data-position={position}
      >
        {tube ? (
          <>
            {lotStyle && (
              <div className="absolute z-[1]" style={{ top: MARK_INSET, left: MARK_INSET }}>
                <TubePropertyIndicator
                  shape="square"
                  color={lotStyle.color}
                  pattern={lotStyle.pattern}
                  size={lotMark}
                  strokeColor={MARK_STROKE}
                />
              </div>
            )}

            <div
              className="absolute z-[3] flex items-center gap-[2px] leading-none"
              style={{ top: MARK_INSET, right: MARK_INSET }}
            >
              {lockVariant && (
                <TubeLockIndicator size={lockMark} variant={lockVariant} backgroundColor={fill} />
              )}
              <span
                className="font-semibold leading-none"
                style={{ fontSize: `${fontSize.positionFont}px`, color: ink, opacity: 0.82 }}
              >
                {positionLabel}
              </span>
            </div>

            {conditionStyle && (
              <div className="absolute z-[1]" style={{ right: MARK_INSET, bottom: MARK_INSET }}>
                <TubePropertyIndicator
                  shape="corner-triangle"
                  color={conditionStyle.color}
                  pattern="solid"
                  size={triLeg}
                  strokeColor={MARK_STROKE}
                />
              </div>
            )}

            <div
              className="absolute text-left leading-tight"
              style={{ left: 3, right: triLeg + 3, bottom: 2, color: ink }}
            >
              <div
                className={`cell-line font-semibold ${cellTypeSingleWord ? 'cell-line--nowrap' : ''}`}
                style={{ fontSize: `${cellTypeFontSize}px` }}
              >
                {cellTypeText}
              </div>
              {donorInfo.internal && (
                <div className="donor-internal" style={{ fontSize: `${fontSize.donorFont}px` }}>
                  {donorInfo.internal}
                </div>
              )}
              {donorInfo.source && (
                <div className="donor-source" style={{ fontSize: `${fontSize.donorFont}px` }}>
                  {donorInfo.source}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="empty-coord font-mono leading-none"
              style={{ fontSize: `${fontSize.positionFont}px` }}
            >
              {positionLabel}
            </span>
          </div>
        )}
      </div>
    );
  }
);

TubeGridCell.displayName = 'TubeGridCell';
