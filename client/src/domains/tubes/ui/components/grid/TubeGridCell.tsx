/**
 * Grid Cell
 *
 * Individual tube position cell with color coding, lock indicators, and property indicators.
 */
import React, { memo, useMemo, useRef, useCallback, useEffect } from 'react';

import { useStorageData } from '@domains/storage';
import { formatPositionForBox } from '@domains/storage/utils/positionDisplayUtils';
import { useUserSettings } from '@domains/users/hooks/useUserSettings';

import {
  getTubeColor,
  getLotStyleForBox,
  getConditionStyleForBox,
  parseDonorInfo,
} from '../../../utils/tubeColorCoding';
import { TubeLockIndicator } from '../locking/TubeLockIndicator';

import { TubePropertyIndicator } from './TubePropertyIndicator';

import type { GridConfiguration } from '@domains/storage';
import type { TubeData } from '@domains/tubes/types';

import './tube-grid.css';

/** Avoids mid-word breaks and truncation by scaling font to fit longer cell type names. */
function getCellTypeFontSize(baseFont: number, text: string): number {
  const len = text.length;
  if (len <= 6) return baseFont;
  if (len <= 10) return baseFont * 0.85;
  if (len <= 16) return baseFont * 0.72;
  return baseFont * 0.62;
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
  _isKeyboardFocused: boolean;
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
    _isKeyboardFocused: _,
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
        rounded-lg
      `}
        style={
          {
            backgroundColor: colors?.backgroundColor ?? 'hsl(var(--grid-empty))',
            color:
              colors?.textColor ??
              (tube ? 'hsl(var(--foreground))' : 'hsl(var(--grid-empty-foreground))'),
            width: '100%',
            height: '100%',
            aspectRatio: '1',
            '--border-color': colors?.borderColor ?? 'hsl(var(--grid-border))',
          } as React.CSSProperties
        }
        data-grid-size={`${gridConfig.rows}x${gridConfig.cols}`}
        data-position={position}
      >
        <div
          className="absolute top-0.5 right-0.5 font-semibold rounded-sm shadow-sm border flex items-center justify-center leading-none"
          style={{
            fontSize: `${fontSize.positionFont}px`,
            paddingInline: '3px',
            paddingBlock: '1px',
            zIndex: 3,
            backgroundColor: 'hsl(var(--grid-position-label))',
            color: 'hsl(var(--grid-position-label-foreground))',
            borderColor: 'hsl(var(--grid-position-label-border))',
          }}
        >
          {formatPositionForBox(position, tankId, rackId, boxId, gridConfig, currentLab, settings)}
        </div>

        {/* Lot number indicator - top-left (square) */}
        {tube && lotStyle && (
          <div className="absolute top-0.5 left-0.5 z-[1]">
            <TubePropertyIndicator
              shape="square"
              color={lotStyle.color}
              pattern={lotStyle.pattern}
              size={fontSize.positionFont + 2}
            />
          </div>
        )}

        {/* Condition indicator - bottom-right (triangle) */}
        {tube && conditionStyle && (
          <div className="absolute bottom-0.5 right-0.5 z-[1]">
            <TubePropertyIndicator
              shape="triangle"
              color={conditionStyle.color}
              pattern="solid"
              size={fontSize.positionFont + 2}
            />
          </div>
        )}

        {/* Lock indicator - bottom-left */}
        {tube && isLockedByCurrentUser && (
          <TubeLockIndicator
            size={fontSize.positionFont + 2}
            variant="own"
            backgroundColor={colors?.backgroundColor}
          />
        )}
        {tube && hasSharedAccess && lockOwnerName && (
          <TubeLockIndicator
            size={fontSize.positionFont + 2}
            variant="shared"
            backgroundColor={colors?.backgroundColor}
          />
        )}
        {tube && hasAdminOverride && lockOwnerName && (
          <TubeLockIndicator
            size={fontSize.positionFont + 2}
            variant="admin-override"
            backgroundColor={colors?.backgroundColor}
          />
        )}
        {tube && isLockedOut && lockOwnerName && (
          <TubeLockIndicator
            size={fontSize.positionFont + 2}
            variant="other"
            backgroundColor={colors?.backgroundColor}
          />
        )}

        {/* Tube content - tooltip handled by parent TubeGrid */}
        {tube ? (
          <div className="tube-content p-2 flex flex-col items-center justify-center text-center">
            <div
              className="cell-line font-medium leading-tight"
              style={{ fontSize: `${cellTypeFontSize}px` }}
            >
              {cellTypeText}
            </div>
            {donorInfo.internal && (
              <div
                className="donor-internal leading-tight"
                style={{ fontSize: `${fontSize.donorFont}px` }}
              >
                {donorInfo.internal}
              </div>
            )}
            {donorInfo.source && (
              <div
                className="donor-source leading-tight"
                style={{ fontSize: `${fontSize.donorFont}px` }}
              >
                {donorInfo.source}
              </div>
            )}
          </div>
        ) : (
          <div className="tube-content p-2 flex flex-col items-center justify-center text-center">
            <div
              className="empty-label font-medium leading-tight"
              style={{ fontSize: `${fontSize.cellFont}px` }}
            >
              Empty
            </div>
          </div>
        )}
      </div>
    );
  }
);

TubeGridCell.displayName = 'TubeGridCell';
