import React, { memo } from 'react';

import { useUserSettings } from '@domains/authentication/hooks/useUserSettings';
import { useStorageData } from '@domains/storage';
import { formatPositionForBox } from '@domains/storage/utils/positionDisplayUtils';
import { InlineEditInput, Tooltip } from '@shared/ui';

import {
  getTubeColor,
  getLotStyleForBox,
  getConditionStyleForBox,
  parseDonorInfo,
} from '../../../utils/colorSystem';
import { LockIndicator } from '../LockIndicator';

import { IndicatorSVG } from './IndicatorSVG';

import type { GridConfiguration } from '@domains/storage';
import type { TubeData } from '@domains/tubes/types';

import './colorIndicators.css';

interface GridPositionProps {
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
  animationKey?: number;
  quickEditMode: { position: number; field: string } | null;
  gridConfig: GridConfiguration;
  fontSize: { cellFont: number; donorFont: number; positionFont: number };
  onPositionClick: (position: number, event: React.MouseEvent | React.KeyboardEvent) => void;
  onPositionRightClick: (position: number, event: React.MouseEvent) => void;
  onPositionDoubleClick?: (position: number, event: React.MouseEvent) => void;
  onMouseDown: (position: number, event: React.MouseEvent) => void;
  onMouseMove: (position: number) => void;
  onQuickEditSave: (position: number, field: string, value: string) => void;
  onQuickEditCancel: () => void;
  // Lock indicator props (optional - for lock-enabled grids)
  isLockedOut?: boolean;
  isLockedByCurrentUser?: boolean;
  hasSharedAccess?: boolean;
  lockOwnerName?: string;
  lockNote?: string;
}

export const GridPosition = memo<GridPositionProps>(
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
    _isKeyboardFocused,
    animationKey = 0,
    quickEditMode,
    gridConfig,
    fontSize,
    onPositionClick,
    onPositionRightClick,
    onPositionDoubleClick,
    onMouseDown,
    onMouseMove,
    onQuickEditSave,
    onQuickEditCancel,
    isLockedOut,
    isLockedByCurrentUser,
    hasSharedAccess,
    lockOwnerName,
    lockNote,
  }) => {
    const isQuickEdit = quickEditMode?.position === position;

    // Get user settings for 4-tier position display hierarchy
    const { settings } = useUserSettings();
    const { currentLab } = useStorageData();

    // Get color coding for this tube
    const colors = tube ? getTubeColor(tube) : null;
    const lotStyle = tube?.sample?.lotNumber
      ? getLotStyleForBox(tube.sample.lotNumber, rackId, boxId)
      : null;
    const conditionStyle = tube?.sample?.cultureCondition
      ? getConditionStyleForBox(tube.sample.cultureCondition, rackId, boxId)
      : null;
    const donorInfo = tube ? parseDonorInfo(tube) : { internal: '', source: '' };

    return (
      <div
        key={`${position}-${animationKey}`}
        onClick={e => onPositionClick(position, e)}
        onDoubleClick={e => onPositionDoubleClick?.(position, e)}
        onContextMenu={e => onPositionRightClick(position, e)}
        onMouseDown={e => onMouseDown(position, e)}
        onMouseMove={() => onMouseMove(position)}
        onKeyDown={e => {
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for keyboard event handling
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPositionClick(position, e);
          }
        }}
        role="gridcell"
        aria-label={
          tube
            ? // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty cellType is validation failure, show fallback
              `Position ${position}, ${tube.sample?.cellType || 'Unknown sample'}, ${selected ? 'selected' : 'not selected'}`
            : `Position ${position}, empty, ${selected ? 'selected' : 'not selected'}`
        }
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        className={`
        tube-position relative group cursor-pointer
        ${tube ? 'occupied' : 'empty'}
        ${selected ? 'selected' : ''}
        ${isDragPreview ? 'drag-preview' : ''}
        ${isCut ? 'cut-tube' : ''}
        ${isCopied ? 'copied-tube' : ''}
        ${isLockedOut ? 'opacity-70' : ''}
        rounded-lg
      `}
        style={
          {
            backgroundColor: colors?.backgroundColor ?? '#f8f9fa',
            color: colors?.textColor ?? (tube ? '#000' : '#999'),
            width: '100%',
            height: '100%',
            aspectRatio: '1',
            // CSS custom properties for dynamic theming
            '--border-color': colors?.borderColor ?? '#C4C4C4',
          } as React.CSSProperties
        }
        data-grid-size={`${gridConfig.rows}x${gridConfig.cols}`}
        data-position={position}
      >
        {/* Position number - compact responsive design */}
        <div
          className="absolute top-0.5 right-0.5 font-semibold bg-white/95 rounded text-gray-700 shadow-sm border border-gray-300 flex items-center justify-center leading-none"
          style={{
            width: `${fontSize.positionFont + 2}px`,
            height: `${fontSize.positionFont + 2}px`,
            fontSize: `${fontSize.positionFont}px`,
            zIndex: 3,
          }}
        >
          {formatPositionForBox(position, tankId, rackId, boxId, gridConfig, currentLab, settings)}
        </div>

        {/* Lot number indicator - top-left (square) */}
        {tube && lotStyle && (
          <div className="absolute top-0.5 left-0.5 z-[1]">
            <IndicatorSVG
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
            <IndicatorSVG
              shape="triangle"
              color={conditionStyle.color}
              pattern="solid"
              size={fontSize.positionFont + 2}
            />
          </div>
        )}

        {/* Lock indicator - bottom-left */}
        {/* Black lock for own locks, amber for shared access, red for locked out */}
        {tube && isLockedByCurrentUser && (
          <LockIndicator
            lockedByName="You"
            lockNote={lockNote}
            size={fontSize.positionFont}
            variant="own"
          />
        )}
        {tube && hasSharedAccess && lockOwnerName && (
          <LockIndicator
            lockedByName={lockOwnerName}
            lockNote={lockNote}
            size={fontSize.positionFont}
            variant="shared"
          />
        )}
        {tube && isLockedOut && lockOwnerName && (
          <LockIndicator
            lockedByName={lockOwnerName}
            lockNote={lockNote}
            size={fontSize.positionFont}
            variant="other"
          />
        )}

        {/* Tube content with breathing room */}
        {tube ? (
          <Tooltip
            content={
              <div className="flex flex-col gap-1">
                {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty cellType should show fallback */}
                <div className="font-semibold text-white">{tube.sample.cellType || 'Unknown'}</div>
                {donorInfo.internal && (
                  <div className="text-white">
                    <span className="text-slate-400">Int. ID:</span> {donorInfo.internal}
                  </div>
                )}
                {donorInfo.source && (
                  <div className="text-white">
                    <span className="text-slate-400">Src. ID:</span>{' '}
                    {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty donorSourceId should fall back to computed source */}
                    {tube.sample.donorSourceId || donorInfo.source}
                  </div>
                )}
                {tube.sample.lotNumber && (
                  <div className="text-white">
                    <span className="text-slate-400">Lot #:</span> {tube.sample.lotNumber}
                  </div>
                )}
                {tube.sample.cultureCondition && (
                  <div className="text-white">
                    <span className="text-slate-400">Cond.:</span> {tube.sample.cultureCondition}
                  </div>
                )}
              </div>
            }
            delayDuration={400}
          >
            <div className="tube-content p-2 flex flex-col items-center justify-center text-center">
              <div
                className="cell-line font-medium leading-tight"
                style={{ fontSize: `${fontSize.cellFont}px` }}
              >
                {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
                {tube.sample.cellType || 'Unknown'}
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
          </Tooltip>
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

        {/* Quick edit overlay */}
        {isQuickEdit && tube && quickEditMode && (
          <InlineEditInput
            initialValue={((tube as Record<string, unknown>)[quickEditMode.field] as string) ?? ''}
            fieldName={quickEditMode.field}
            onSave={value => onQuickEditSave(position, quickEditMode.field, value)}
            onCancel={onQuickEditCancel}
            placeholder={`Edit ${quickEditMode.field}`}
          />
        )}
      </div>
    );
  }
);

GridPosition.displayName = 'GridPosition';
