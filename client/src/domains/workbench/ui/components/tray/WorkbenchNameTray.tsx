import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Info } from 'lucide-react';
import { createPortal } from 'react-dom';

import { AccentTick, SearchInput } from '@shared/ui';
import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { useProtocolOutsidePages } from '../../../hooks/useWorkbenchSlice';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { FORMULA_FUNCTIONS } from '../../../utils/formulas/formulaParser';
import { insertListGroups } from '../../../utils/formulas/insertListGroups';
import { matchesWordStarts } from '../../../utils/formulas/nameMatching';
import { listedMaterials } from '../../../utils/materials/materialLookup';
import { STEP_PRESETS } from '../../../utils/steps/stepPresets';
import { templateText } from '../../../utils/steps/stepTemplate';
import { generalTitleOf } from '../../../utils/values/valueNames';
import { LEADER_LINE } from '../board/leaderLineClass';
import { SECTION_RULE } from '../board/sectionRuleClass';

import { useInsertTrayStore } from './insertTrayStore';
import { INSERT_TRAY_ATTRIBUTE, isInInsertTray } from './trayFocus';
import { PICK_NAME_ATTRIBUTE, PICK_OPERATOR_ATTRIBUTE, useTrayPickDrag } from './useTrayPickDrag';

const FORMULA_OPERATORS = ['+', '−', '×', '÷', '(', ')', ','] as const;
const NO_CUSTOM_GROUPS: readonly string[] = [];
const TRAY_GAP_PX = 6;
const VIEWPORT_MARGIN_PX = 8;
const MIN_WIDTH_PX = 320;
const MAX_WIDTH_PX = 420;

const GROUP_HEADING =
  'sticky top-0 z-10 flex items-center gap-2.5 bg-popover px-3 pb-1 pt-3 text-body-sm';
const TRAY_ROW = `flex cursor-pointer items-baseline gap-2 px-3 py-1 text-body-sm text-foreground ${ROW_HOVER_GLOW.primary}`;
const ZEBRA = 'even:bg-[hsl(var(--foreground)/var(--alpha-zebra))]';
const ROW_VALUE = 'max-w-[55%] flex-none truncate font-mono text-data-sm text-foreground';
const HEADING_KIND = 'flex-none font-mono text-data-sm text-muted-foreground';
const OPERATOR_BUTTON =
  'min-w-7 cursor-pointer border border-line-mid px-2 py-px font-mono text-data-sm text-foreground hover:border-primary/60';

function trayPositionBeside(anchor: HTMLElement, trayHeight: number): CSSProperties {
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
  const board = useWorkbenchStore(state => state.board);
  const protocol = useProtocolOutsidePages();
  const ghost = useTrayPickDrag();
  const trayRef = useRef<HTMLDivElement>(null);
  const [trayPosition, setTrayPosition] = useState<CSSProperties>();
  const [query, setQuery] = useState('');
  const isShown = !!target && isOpen;
  const targetElement = target?.element;

  useEffect(() => setQuery(''), [targetElement]);

  const mode = target?.mode;
  const materials = useMemo(() => listedMaterials(protocol), [protocol]);
  const generalTitle = generalTitleOf(protocol.blocks);
  const customGroups =
    protocol.blocks.find(card => card.type === 'materials')?.customGroups ?? NO_CUSTOM_GROUPS;
  const allGroups = useMemo(
    () =>
      mode
        ? insertListGroups(board, materials, customGroups, mode === 'formula', generalTitle)
        : [],
    [board, materials, customGroups, mode, generalTitle]
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
        shown: templateText(preset.text, board),
      })).filter(preset => matchesWordStarts(`${preset.label} ${preset.shown}`, query)),
    [board, query]
  );
  const functions = FORMULA_FUNCTIONS.filter(name => matchesWordStarts(name, query));

  useLayoutEffect(() => {
    if (!isShown) return;
    const place = () => {
      if (trayRef.current)
        setTrayPosition(trayPositionBeside(target.anchor, trayRef.current.offsetHeight));
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
          style={trayPosition ?? { visibility: 'hidden' }}
          {...{ [INSERT_TRAY_ATTRIBUTE]: '' }}
          onMouseDown={event => {
            if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
          }}
        >
          <div className="border-b border-line-faint px-3 pb-2 pt-2.5">
            <SearchInput
              value={query}
              placeholder="Search…"
              aria-label="Search the insert list"
              onChange={setQuery}
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
            {target.mode === 'formula' && (
              <>
                <div className="flex flex-wrap gap-1 pt-2">
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
                <div className="flex flex-wrap gap-1 pt-1">
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
          </div>
          <div className="max-h-72 overflow-auto pb-1.5">
            {target.mode === 'step' && (
              <>
                {presets.length > 0 && (
                  <div className={GROUP_HEADING}>
                    <AccentTick />
                    <span className="type-name font-semibold">Common steps</span>
                    <span aria-hidden className={`${SECTION_RULE} min-w-0`} />
                  </div>
                )}
                <div>
                  {presets.map(preset => (
                    <div
                      key={preset.label}
                      role="button"
                      tabIndex={-1}
                      className={`${TRAY_ROW} ${ZEBRA}`}
                      onClick={() => insertPreset(preset.text)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') insertPreset(preset.text);
                      }}
                    >
                      <span>{preset.label}</span>
                      <span aria-hidden className={LEADER_LINE} />
                      <span className={ROW_VALUE}>{preset.shown}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {!hasMatches && (
              <p className="px-3 py-3 text-body-sm text-muted-foreground">
                {query.trim()
                  ? `Nothing matches "${query.trim()}".`
                  : 'No names on the board yet. Add values or materials and they show up here.'}
              </p>
            )}
            {groups.map(group => (
              <div key={group.key}>
                <div
                  className={`${GROUP_HEADING} ${group.headingName ? `cursor-pointer ${ROW_HOVER_GLOW.primary}` : ''}`}
                  {...(group.headingName && { [PICK_NAME_ATTRIBUTE]: group.headingName })}
                >
                  <AccentTick />
                  <span className="min-w-0 truncate type-name font-semibold text-foreground">
                    {group.title}
                  </span>
                  {group.kind && <span className={HEADING_KIND}>· {group.kind}</span>}
                  <span aria-hidden className={`${SECTION_RULE} min-w-0`} />
                </div>
                <div>
                  {group.rows.map(row => (
                    <div
                      key={row.name}
                      className={`${TRAY_ROW} ${ZEBRA} pl-6`}
                      {...{ [PICK_NAME_ATTRIBUTE]: row.name }}
                    >
                      <span className="min-w-0">{row.label}</span>
                      {row.value && (
                        <>
                          <span aria-hidden className={LEADER_LINE} />
                          <span className={ROW_VALUE}>{row.value}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-1.5 border-t border-line-faint px-3 py-1.5 text-label-xs text-muted-foreground">
            <Info aria-hidden className="h-3.5 w-3.5 flex-none" />
            Click or drag to insert.
            {target.mode === 'step' && ' Tab jumps to the next blank.'}
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
