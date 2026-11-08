import type { CSSProperties, KeyboardEvent } from 'react';

import { rowLetter, type VesselSheet } from '../../../../utils/vessels/vesselTabs';
import { wellColor, wellDetails, wellLine } from '../../../../utils/vessels/wellContents';

import { WorkbenchPlateWellButton } from './WorkbenchPlateWellButton';

import type { WellSelection } from './useWellSelection';
import type { BoardCalculation } from '../../../../utils/formulas/boardCalculation';
import type { WellSize } from '../../../../utils/vessels/vesselSizing';
import type { PlateLine, VesselMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchPlateTableProps {
  block: VesselMapBlock;
  sheet: VesselSheet;
  colorLine: PlateLine | undefined;
  size: WellSize;
  calculation: BoardCalculation;
  selection: WellSelection;
  onKeyDown: (event: KeyboardEvent) => void;
  onOpenWell: (key: string) => void;
}

const HEADER =
  'grid place-items-center font-mono text-label-2xs text-muted-foreground transition-colors hover:text-primary';
const SNUG_BELOW = 70;

export function WorkbenchPlateTable({
  block,
  sheet,
  colorLine,
  size,
  calculation,
  selection,
  onKeyDown,
  onOpenWell,
}: WorkbenchPlateTableProps) {
  const style = {
    gridTemplateColumns: `16px repeat(${sheet.cols}, ${size.width}px)`,
    gridTemplateRows: `14px repeat(${sheet.rows}, ${size.height}px)`,
    '--well-height': `${size.height}px`,
  } as CSSProperties;
  const isSnug = !!colorLine && size.width < SNUG_BELOW;

  return (
    <div
      role="grid"
      aria-label="Plate wells"
      aria-multiselectable
      className="grid select-none justify-center gap-1 outline-none"
      style={style}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={event => {
        event.currentTarget.focus({ preventScroll: true });
        if (event.target === event.currentTarget) selection.clear();
      }}
    >
      <button
        type="button"
        aria-label="Select every well"
        className={HEADER}
        style={{ gridRow: 1, gridColumn: 1 }}
        onClick={selection.selectAll}
      />
      {Array.from({ length: sheet.cols }, (_, col) => (
        <button
          key={`col-${col}`}
          type="button"
          aria-label={`Select column ${col + 1}`}
          className={HEADER}
          style={{ gridRow: 1, gridColumn: col + 2 }}
          onClick={() => selection.selectColumn(col)}
        >
          {col + 1}
        </button>
      ))}
      {Array.from({ length: sheet.rows }, (_, row) => (
        <button
          key={`row-${row}`}
          type="button"
          aria-label={`Select row ${rowLetter(row)}`}
          className={HEADER}
          style={{ gridRow: row + 2, gridColumn: 1 }}
          onClick={() => selection.selectRow(row)}
        >
          {rowLetter(row)}
        </button>
      ))}
      {sheet.spots.map(spot => {
        const details = wellDetails(block, spot.key, calculation);
        return (
          <WorkbenchPlateWellButton
            key={spot.key}
            wellKey={spot.key}
            row={spot.row}
            col={spot.col}
            title={[spot.label, ...details].join('\n')}
            shownLine={colorLine && wellLine(block, spot.key, colorLine, calculation)}
            isFilled={details.length > 0}
            color={wellColor(block, spot.key, colorLine)}
            density={size.density}
            isSnug={isSnug}
            isSelected={selection.keys.has(spot.key)}
            onPointerDown={event => {
              event.preventDefault();
              selection.press(spot, {
                isExtending: event.shiftKey,
                isToggling: event.ctrlKey || event.metaKey,
              });
            }}
            onPointerEnter={() => selection.dragOver(spot)}
            onDoubleClick={() => onOpenWell(spot.key)}
          />
        );
      })}
    </div>
  );
}
