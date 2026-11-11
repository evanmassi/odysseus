import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { createPortal } from 'react-dom';

import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { useProtocolOutsidePages } from '../../../hooks/useWorkbenchSlice';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { FORMULA_FUNCTIONS } from '../../../utils/formulas/formulaParser';
import { insertListGroups } from '../../../utils/formulas/insertListGroups';
import { matchesWordStarts } from '../../../utils/formulas/nameMatching';
import { listedMaterials } from '../../../utils/materials/materialLookup';
import { STEP_PRESETS } from '../../../utils/steps/stepPresets';
import { templateText } from '../../../utils/steps/stepTemplate';

import { useInsertTrayStore } from './insertTrayStore';
import { INSERT_TRAY_ATTRIBUTE, isInInsertTray } from './trayFocus';
import { PICK_NAME_ATTRIBUTE, PICK_OPERATOR_ATTRIBUTE, useTrayPickDrag } from './useTrayPickDrag';

const FORMULA_OPERATORS = ['+', '−', '×', '÷', '(', ')', ','] as const;
const NO_CUSTOM_GROUPS: readonly string[] = [];
const TRAY_GAP_PX = 6;
const VIEWPORT_MARGIN_PX = 8;
const MIN_WIDTH_PX = 320;
const MAX_WIDTH_PX = 420;

const GROUP_TITLE = 'px-3 pb-1 pt-2.5 type-label text-label-2xs font-semibold text-foreground/40';
const STICKY_HEADING = 'sticky top-0 z-10 bg-popover';
const TRAY_ROW = `flex cursor-pointer items-baseline gap-3 px-3 py-1 text-body-sm text-foreground ${ROW_HOVER_GLOW.primary}`;
const ROW_VALUE = 'ml-auto max-w-[55%] truncate font-mono text-data-sm text-muted-foreground';
const HEADING_KIND = 'ml-auto text-label-2xs text-muted-foreground';
const SEARCH_INPUT =
  'w-full border-b border-line-faint bg-transparent px-3 py-2 text-body-sm text-foreground outline-none placeholder:text-muted-foreground';
const OPERATOR_BUTTON =
  'min-w-7 cursor-pointer border border-line-mid px-2 py-px font-mono text-data-sm text-foreground hover:border-primary/60';

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
  const protocol = useProtocolOutsidePages();
  const ghost = useTrayPickDrag();
  const trayRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>();
  const [query, setQuery] = useState('');
  const isShown = !!target && isOpen;
  const targetElement = target?.element;

  useEffect(() => setQuery(''), [targetElement]);

  const mode = target?.mode;
  const materials = useMemo(() => listedMaterials(protocol), [protocol]);
  const customGroups =
    protocol.blocks.find(block => block.type === 'materials')?.customGroups ?? NO_CUSTOM_GROUPS;
  const allGroups = useMemo(
    () => (mode ? insertListGroups(calculation, materials, customGroups, mode === 'formula') : []),
    [calculation, materials, customGroups, mode]
  );
  const groups = useMemo(
    () =>
      allGroups
        .map(group => ({
          ...group,
          isHeadingMatch: matchesWordStarts(`${group.title} ${group.kind}`, query),
          rows: group.rows.filter(row =>
            matchesWordStarts(`${group.title} ${row.name} ${row.value ?? ''}`, query)
          ),
        }))
        .filter(group => group.rows.length || (group.headingName && group.isHeadingMatch)),
    [allGroups, query]
  );
  const presets = useMemo(
    () =>
      STEP_PRESETS.map(preset => ({
        ...preset,
        shown: templateText(preset.text, calculation),
      })).filter(preset => matchesWordStarts(`${preset.label} ${preset.shown}`, query)),
    [calculation, query]
  );
  const functions = FORMULA_FUNCTIONS.filter(name => matchesWordStarts(name, query));

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

  const insertTopMatch = () => {
    const [firstPreset] = target?.mode === 'step' ? presets : [];
    const [firstGroup] = groups;
    const firstName =
      firstGroup?.headingName && firstGroup.isHeadingMatch
        ? firstGroup.headingName
        : firstGroup?.rows[0]?.name;
    if (firstPreset) insertPreset(firstPreset.text);
    else if (firstName) target?.insert({ kind: 'name', name: firstName });
  };
  const hasMatches = groups.length > 0 || (target?.mode === 'step' && presets.length > 0);

  return createPortal(
    <>
      {isShown && (
        <div
          ref={trayRef}
          role="presentation"
          className="fixed z-50 border border-line-mid bg-popover shadow-[var(--popup-shadow)]"
          style={position ?? { visibility: 'hidden' }}
          {...{ [INSERT_TRAY_ATTRIBUTE]: '' }}
          onMouseDown={event => {
            if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
          }}
        >
          <input
            value={query}
            placeholder={target.mode === 'step' ? 'Search steps and names' : 'Search names'}
            aria-label="Search the insert list"
            spellCheck={false}
            autoComplete="off"
            className={SEARCH_INPUT}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                insertTopMatch();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                if (query) setQuery('');
                else target.element.focus();
              }
            }}
            onBlur={event => {
              const isBackAtTarget = event.relatedTarget === target.element;
              if (!isBackAtTarget && !isInInsertTray(event.relatedTarget)) target.leave();
            }}
          />
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
                  {functions.map(name => (
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
                {presets.length > 0 && (
                  <div className={`${GROUP_TITLE} ${STICKY_HEADING}`}>Common steps</div>
                )}
                {presets.map(preset => (
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
                    <span className={ROW_VALUE}>{preset.shown}</span>
                  </div>
                ))}
              </>
            )}
            {!hasMatches && (
              <p className="px-3 py-3 text-body-sm text-muted-foreground">
                Nothing matches “{query}”.
              </p>
            )}
            {groups.map(group => (
              <div key={group.key}>
                {group.headingName ? (
                  <div
                    className={`${TRAY_ROW} ${STICKY_HEADING} pt-2 font-semibold`}
                    {...{ [PICK_NAME_ATTRIBUTE]: group.headingName }}
                  >
                    <span>{group.title}</span>
                    {group.kind && <span className={HEADING_KIND}>{group.kind}</span>}
                  </div>
                ) : (
                  <div className={`${GROUP_TITLE} ${STICKY_HEADING}`}>{group.title}</div>
                )}
                {group.rows.map(row => (
                  <div
                    key={row.name}
                    className={`${TRAY_ROW} pl-6`}
                    {...{ [PICK_NAME_ATTRIBUTE]: row.name }}
                  >
                    <span>{row.label}</span>
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
