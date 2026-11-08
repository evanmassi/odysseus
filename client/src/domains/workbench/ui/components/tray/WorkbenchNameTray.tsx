import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { createPortal } from 'react-dom';

import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { FORMULA_FUNCTIONS } from '../../../utils/formulas/formulaParser';
import { describeName } from '../../../utils/formulas/nameDisplay';
import { STEP_PRESETS } from '../../../utils/steps/stepPresets';
import { templateText } from '../../../utils/steps/stepTemplate';

import { useInsertTrayStore, type InsertTarget } from './insertTrayStore';
import { PICK_NAME_ATTRIBUTE, PICK_OPERATOR_ATTRIBUTE, useTrayPickDrag } from './useTrayPickDrag';

import type { BoardCalculation, BoardName } from '../../../utils/formulas/boardCalculation';

const FORMULA_OPERATORS = ['+', '−', '×', '÷', '(', ')', ','] as const;
const KIND_GROUP_TITLES: Record<Exclude<BoardName['kind'], 'item'>, string> = {
  value: 'Values',
  formula: 'Formulas',
  count: 'Vessel counts',
};
const TRAY_GAP_PX = 6;
const VIEWPORT_MARGIN_PX = 8;
const MIN_WIDTH_PX = 320;
const MAX_WIDTH_PX = 420;

const GROUP_TITLE = 'px-3 pb-1 pt-2.5 type-label text-label-2xs font-semibold text-foreground/40';
const TRAY_ROW = `flex cursor-pointer items-baseline gap-3 px-3 py-1 text-body-sm text-foreground ${ROW_HOVER_GLOW.primary}`;
const ROW_VALUE = 'ml-auto max-w-[55%] truncate font-mono text-data-sm text-muted-foreground';
const OPERATOR_BUTTON =
  'min-w-7 cursor-pointer border border-line-mid px-2 py-px font-mono text-data-sm text-foreground hover:border-primary/60';

interface NameRow {
  name: string;
  value?: string;
}

function nameGroups(calculation: BoardCalculation, target: InsertTarget) {
  const groups = new Map<string, NameRow[]>();
  for (const entry of calculation.names.values()) {
    if (target.mode === 'formula' && entry.kind === 'item') continue;
    const title = entry.kind === 'item' ? entry.groupTitle : KIND_GROUP_TITLES[entry.kind];
    const shown = describeName(calculation, entry.name).text;
    const row = { name: entry.name, value: shown === entry.name ? undefined : shown };
    groups.set(title, [...(groups.get(title) ?? []), row]);
  }
  return [...groups];
}

function trayPosition(anchor: HTMLElement, trayHeight: number): CSSProperties {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(Math.max(rect.width, MIN_WIDTH_PX), MAX_WIDTH_PX);
  const left = Math.max(
    VIEWPORT_MARGIN_PX,
    Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN_PX)
  );
  const fitsBelow = rect.bottom + TRAY_GAP_PX + trayHeight <= window.innerHeight;
  const top = fitsBelow ? rect.bottom + TRAY_GAP_PX : rect.top - trayHeight - TRAY_GAP_PX;
  return { left, top, width };
}

export function WorkbenchNameTray() {
  const target = useInsertTrayStore(state => state.target);
  const isOpen = useInsertTrayStore(state => state.isOpen);
  const calculation = useWorkbenchStore(state => state.calculation);
  const ghost = useTrayPickDrag();
  const trayRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>();
  const isShown = !!target && isOpen;

  const groups = useMemo(
    () => (target ? nameGroups(calculation, target) : []),
    [calculation, target]
  );

  useLayoutEffect(() => {
    if (!isShown) return;
    const place = () => {
      if (trayRef.current) setPosition(trayPosition(target.anchor, trayRef.current.offsetHeight));
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    const observer = new ResizeObserver(place);
    observer.observe(target.anchor);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      observer.disconnect();
    };
  }, [isShown, target]);

  const insertPreset = (text: string) => target?.insert({ kind: 'preset', text });

  return createPortal(
    <>
      {isShown && (
        <div
          ref={trayRef}
          role="presentation"
          className="fixed z-50 border border-line-mid bg-popover shadow-[var(--popup-shadow)]"
          style={position ?? { visibility: 'hidden' }}
          onMouseDown={event => event.preventDefault()}
        >
          <div className="max-h-72 overflow-auto pb-1.5 pt-0.5">
            {target.mode === 'formula' && (
              <>
                <div className="flex flex-wrap gap-1 px-3 pb-0.5 pt-2">
                  {FORMULA_OPERATORS.map(operator => (
                    <button
                      key={operator}
                      type="button"
                      className={OPERATOR_BUTTON}
                      {...{ [PICK_OPERATOR_ATTRIBUTE]: operator }}
                    >
                      {operator}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 px-3 pb-0.5 pt-1">
                  {FORMULA_FUNCTIONS.map(name => (
                    <button
                      key={name}
                      type="button"
                      className={OPERATOR_BUTTON}
                      {...{ [PICK_OPERATOR_ATTRIBUTE]: `${name}(` }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {target.mode === 'step' && (
              <>
                <div className={GROUP_TITLE}>Common steps</div>
                {STEP_PRESETS.map(preset => (
                  <div
                    key={preset.label}
                    role="button"
                    tabIndex={-1}
                    className={TRAY_ROW}
                    onClick={() => insertPreset(preset.text)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') insertPreset(preset.text);
                    }}
                  >
                    <span>{preset.label}</span>
                    <span className={ROW_VALUE}>{templateText(preset.text, calculation)}</span>
                  </div>
                ))}
              </>
            )}
            {groups.map(([title, rows]) => (
              <div key={title}>
                <div className={GROUP_TITLE}>{title}</div>
                {rows.map(row => (
                  <div key={row.name} className={TRAY_ROW} {...{ [PICK_NAME_ATTRIBUTE]: row.name }}>
                    <span>{row.name}</span>
                    {row.value && <span className={ROW_VALUE}>{row.value}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="border-t border-line-faint px-3 pb-2 pt-1.5 text-caption text-muted-foreground">
            Click to insert, or drag into place. Names on the board can be dragged in too.
            {target.mode === 'step' && ' Tab jumps between highlighted blanks.'}
          </p>
        </div>
      )}
      {ghost && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-popover border border-primary/60 bg-card px-2.5 py-0.5 font-mono text-data-sm text-foreground shadow-lg"
          style={{ transform: `translate(${ghost.x + 12}px, ${ghost.y + 10}px)` }}
        >
          {ghost.text}
        </div>
      )}
    </>,
    document.body
  );
}
