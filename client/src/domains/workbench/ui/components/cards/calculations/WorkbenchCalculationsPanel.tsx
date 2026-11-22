import { useCallback, useMemo, useRef, useState } from 'react';

import { withGreekLetters } from '@odysseus/shared-schemas';

import { AlertBanner, PanelEmptyState } from '@shared/ui';

import { usePlateSwatches } from '../../../../hooks/usePlateSwatches';
import { useShowCard } from '../../../../hooks/useShowCard';
import { useStableColumns } from '../../../../hooks/useStableColumns';
import { useStructuralSharing } from '../../../../hooks/useStructuralSharing';
import { useProtocolWith } from '../../../../hooks/useWorkbenchSlice';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { prepLineId } from '../../../../utils/dilutions/dilutionCalculations';
import { dilutionPrep } from '../../../../utils/dilutions/dilutionPrep';
import { dilutionRuns } from '../../../../utils/dilutions/dilutionRuns';
import {
  nameKey,
  type SolvedBoard,
  type CalculationResult,
} from '../../../../utils/formulas/boardCalculation';
import {
  checkCalculationDraft,
  readCalculationDraft,
} from '../../../../utils/formulas/calculationDraft';
import {
  insertCalculation,
  removeCalculation,
  setCalculationSection,
  updateCalculation,
} from '../../../../utils/formulas/calculationEdits';
import {
  calculationLayout,
  calculationSections,
  type CalculationPart,
  type CalculationSection,
} from '../../../../utils/formulas/calculationSections';
import {
  calculationSuggestions,
  calculationMaterial,
  namesInFull,
  namesWithin,
  uniqueName,
  type CalculationSuggestion,
} from '../../../../utils/formulas/formulaScopes';
import { workingRefs } from '../../../../utils/formulas/workingTree';
import { cellWarnings } from '../../../../utils/materials/cellCalculations';
import { displayNameOf } from '../../../../utils/materials/materialLookup';
import { recipeWarnings } from '../../../../utils/materials/materialRecipeCalculations';
import { TOTAL_WELL_VOLUME, WELLS_USED } from '../../../../utils/terms/termList';
import { addNamedValue } from '../../../../utils/values/valueEdits';
import {
  generalTitleOf,
  joinValueName,
  WHOLE_EXPERIMENT,
} from '../../../../utils/values/valueNames';
import { CARD_ICONS } from '../../board/cardIcons';
import { WorkbenchAddBar } from '../../board/WorkbenchAddBar';

import { WorkbenchCalculationEditor } from './WorkbenchCalculationEditor';
import { CALCULATION_ROW_ATTRIBUTE, WorkbenchCalculationRow } from './WorkbenchCalculationRow';
import { WorkbenchCalculationSection } from './WorkbenchCalculationSection';
import { WorkbenchCalculationSuggestionList } from './WorkbenchCalculationSuggestionList';
import { WorkbenchCalculationTable } from './WorkbenchCalculationTable';
import {
  WorkbenchCalculationWorkedOutGroup,
  type WorkedOutLine,
  type WorkedOutSettings,
} from './WorkbenchCalculationWorkedOutGroup';

import type { CalculationTableRowView } from './WorkbenchCalculationTable';
import type {
  CalculationsCard,
  MaterialItem,
  Protocol,
  ProtocolCard,
} from '@odysseus/shared-schemas';

interface WorkbenchCalculationsPanelProps {
  card: CalculationsCard;
}

interface GroupView {
  settings: WorkedOutSettings | undefined;
  lines: WorkedOutLine[];
}

interface TableView {
  settings: WorkedOutSettings | undefined;
  rows: CalculationTableRowView[];
}

const WIDE_TABLE_COLUMNS = 3;
const MIN_COLUMN_WIDTH = 320;
const COLUMN_GAP = 24;

const partKey = (part: CalculationPart) =>
  part.kind === 'table' ? part.table.key : part.section.key;

const partWeight = (part: CalculationPart) =>
  part.kind === 'table'
    ? part.table.rows.length + 2
    : 3 +
      part.section.items.length +
      part.section.groups.reduce(
        (rows, view) => rows + 1 + view.lines.filter(line => !line.isIntermediate).length,
        0
      );

const SETTINGS_LABELS: Partial<Record<ProtocolCard['type'], string>> = {
  dilutions: 'Dilutions',
  materials: 'Materials',
};

function linksOf(
  board: SolvedBoard,
  result: CalculationResult | undefined
): Readonly<Record<string, string>> {
  if (result?.status !== 'ok') return {};
  return Object.fromEntries(
    workingRefs(result.working).flatMap(ref => {
      const originCardId = board.names.get(nameKey(ref.name))?.originCardId;
      return originCardId ? [[ref.name, originCardId]] : [];
    })
  );
}

function prepWarnings(protocol: Pick<Protocol, 'cards'>, board: SolvedBoard) {
  const byLine = new Map<string, string[]>();
  for (const run of dilutionRuns(protocol)) {
    const prep = dilutionPrep(run, protocol, board, '');
    if (prep.kind !== 'ready') continue;
    for (const warning of prep.warnings) {
      const id = prepLineId(run, warning.line);
      byLine.set(id, [...(byLine.get(id) ?? []), warning.text]);
    }
  }
  return byLine;
}

export function WorkbenchCalculationsPanel({ card }: WorkbenchCalculationsPanelProps) {
  const protocol = useProtocolWith('materials', 'plateMap', 'calculations', 'dilutions');
  const board = useWorkbenchStore(state => state.board);
  const activePageId = useWorkbenchStore(state => state.activePageId);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const showCard = useShowCard();
  const [openId, setOpenId] = useState<string>();
  const [typed, setTyped] = useState('');
  const columnsRef = useRef<HTMLDivElement>(null);
  const openRowBox = useCallback(
    () =>
      columnsRef.current
        ?.querySelector(`[${CALCULATION_ROW_ATTRIBUTE}="${openId}"]`)
        ?.getBoundingClientRect(),
    [openId]
  );

  const materials = useMemo(
    () =>
      protocol.cards
        .flatMap(candidate => (candidate.type === 'materials' ? candidate.items : []))
        .filter(item => item.name.trim()),
    [protocol]
  );
  const swatchOf = usePlateSwatches();
  const generalTitle = generalTitleOf(protocol.cards);
  const showsWorkedOut =
    protocol.cards.find(candidate => candidate.type === 'calculations')?.id === card.id;
  const sections = useMemo(
    () => calculationSections(card, materials, board, showsWorkedOut, generalTitle),
    [card, materials, board, showsWorkedOut, generalTitle]
  );
  const warnings = useMemo(
    () =>
      showsWorkedOut
        ? new Map([
            ...prepWarnings(protocol, board),
            ...recipeWarnings(protocol, board),
            ...cellWarnings(board),
          ])
        : new Map<string, string[]>(),
    [protocol, board, showsWorkedOut]
  );
  const results = useStructuralSharing(
    useMemo(
      (): Partial<Record<string, CalculationResult>> => Object.fromEntries(board.results),
      [board]
    )
  );
  const layout = useMemo(
    () => calculationLayout(sections, board, card.materialSections),
    [sections, board, card.materialSections]
  );
  const workedOut = useStructuralSharing(
    useMemo(() => {
      const settingsOf = (cardId: string | undefined): WorkedOutSettings | undefined => {
        const settingsCard = protocol.cards.find(candidate => candidate.id === cardId);
        const label = settingsCard && SETTINGS_LABELS[settingsCard.type];
        return settingsCard && label ? { label, cardId: settingsCard.id } : undefined;
      };
      const lineOf = (line: {
        id: string;
        name: string;
        isIntermediate?: boolean;
      }): WorkedOutLine => ({
        id: line.id,
        name: line.name,
        result: board.results.get(line.id),
        links: linksOf(board, board.results.get(line.id)),
        warnings: warnings.get(line.id) ?? [],
        isIntermediate: !!line.isIntermediate,
      });
      const groups = layout.parts.flatMap(
        (part): Array<[string, GroupView]> =>
          part.kind === 'section'
            ? part.section.groups.map(({ group, lines }): [string, GroupView] => [
                `${part.section.key}/${group.key}`,
                { settings: settingsOf(group.settingsCardId), lines: lines.map(lineOf) },
              ])
            : []
      );
      const tables = layout.parts.flatMap(
        (part): Array<[string, TableView]> =>
          part.kind === 'table'
            ? [
                [
                  part.table.key,
                  {
                    settings: settingsOf(part.table.settingsCardId),
                    rows: part.table.rows.map(row => ({ ...row, lines: row.lines.map(lineOf) })),
                  },
                ],
              ]
            : []
      );
      return { groups: Object.fromEntries(groups), tables: Object.fromEntries(tables) };
    }, [layout, protocol, board, warnings])
  );

  const sectionOf = (name: string) => calculationMaterial(name, materials)?.id ?? WHOLE_EXPERIMENT;
  const edit = (mutate: (draft: Protocol) => void) => updateProtocol(mutate);

  const addCalculation = (material: MaterialItem | undefined, text: string) => {
    const [label, ...rest] = text.split('=');
    const name = uniqueName(
      board,
      joinValueName(material?.name.trim() ?? '', withGreekLetters(label.trim()))
    );
    const expr = namesInFull(withGreekLetters(rest.join('=').trim()), board, material);
    let added: string | undefined;
    edit(draft => {
      added = insertCalculation(
        draft,
        card.id,
        { name, formula: expr },
        item => sectionOf(item.name),
        material?.id ?? WHOLE_EXPERIMENT
      );
    });
    setOpenId(added);
  };

  const typedDraft = useMemo(
    () => readCalculationDraft(typed, board, materials),
    [typed, board, materials]
  );
  const typedCheck = useMemo(
    () => typedDraft && checkCalculationDraft(typedDraft, board),
    [typedDraft, board]
  );
  const [onlyPart] = layout.parts;
  const isTitled =
    layout.parts.length > 1 ||
    (onlyPart?.kind === 'section' && onlyPart.section.key !== WHOLE_EXPERIMENT) ||
    onlyPart?.kind === 'table';
  const isEmpty = !layout.parts.length && !layout.missing.length;

  const addTyped = () => {
    if (!typedDraft) return;
    const { savedName, formula: expr, material } = typedDraft;
    let added: string | undefined;
    edit(draft => {
      added = insertCalculation(
        draft,
        card.id,
        { name: savedName, formula: expr },
        item => sectionOf(item.name),
        material?.id ?? WHOLE_EXPERIMENT
      );
    });
    if (!expr || typedCheck?.problem) setOpenId(added);
    setTyped('');
  };

  const addSuggestion = (material: MaterialItem | undefined, suggestion: CalculationSuggestion) =>
    edit(draft => {
      insertCalculation(
        draft,
        card.id,
        { name: suggestion.name, formula: suggestion.formula },
        item => sectionOf(item.name),
        material?.id ?? WHOLE_EXPERIMENT
      );
    });

  const ownItems = (section: CalculationSection) =>
    section.items.map(calculation => (
      <WorkbenchCalculationRow
        key={calculation.id}
        calculationId={calculation.id}
        name={calculation.name}
        result={results[calculation.id]}
        material={section.material}
        isOpen={calculation.id === openId}
        onOpen={setOpenId}
      />
    ));
  const open = sections
    .flatMap(section =>
      section.items.map(calculation => ({ calculation, material: section.material }))
    )
    .find(({ calculation }) => calculation.id === openId);

  const renderPart = (part: CalculationPart) => {
    if (part.kind === 'table') {
      const view = workedOut.tables[part.table.key];
      return (
        <WorkbenchCalculationTable
          key={part.table.key}
          title={part.table.title}
          columns={part.table.columns}
          rows={view.rows}
          settings={view.settings}
          swatchOf={swatchOf}
          onShowCard={showCard}
        />
      );
    }
    const { section } = part;
    const { material, items, groups } = section;
    const { title } = section;
    return (
      <WorkbenchCalculationSection
        key={section.key}
        title={isTitled ? title : undefined}
        kind={material?.type ?? ''}
        swatch={swatchOf(section.owner)}
        addPlaceholder={`Add to ${title}`}
        suggestions={material ? calculationSuggestions(board, material) : []}
        suggestionTitle={suggestion => namesWithin(suggestion.formula, board, material)}
        isEmpty={!items.length && !groups.length}
        onAdd={material ? text => addCalculation(material, text) : undefined}
        onSuggest={suggestion => addSuggestion(material, suggestion)}
        onRemoveSection={
          material && !items.length && !groups.length
            ? () => edit(draft => setCalculationSection(draft, card.id, material.id, false))
            : undefined
        }
      >
        {groups.map(({ group }) => {
          const view = workedOut.groups[`${section.key}/${group.key}`];
          return (
            <WorkbenchCalculationWorkedOutGroup
              key={group.key}
              title={group.title}
              lines={view.lines}
              subject={group.subject}
              settings={view.settings}
              onShowCard={showCard}
            />
          );
        })}
        {ownItems(section)}
      </WorkbenchCalculationSection>
    );
  };
  const isWideTable = (part: CalculationPart) =>
    part.kind === 'table' && part.table.columns.length >= WIDE_TABLE_COLUMNS;
  const wideTables = layout.parts.filter(isWideTable);
  const flowingParts = layout.parts.filter(part => !isWideTable(part));
  const columns = useStableColumns({
    containerRef: columnsRef,
    items: flowingParts,
    keyOf: partKey,
    weightOf: partWeight,
    minColumnWidth: MIN_COLUMN_WIDTH,
    gap: COLUMN_GAP,
  });

  return (
    <div className="px-2 pb-3 pt-1">
      <div className="mb-6 px-2 pt-2">
        <WorkbenchAddBar
          value={typed}
          placeholder={`e.g. Total vol. = ${WELLS_USED.word} × ${TOTAL_WELL_VOLUME.word}`}
          itemLabel="Calculation"
          onValueChange={setTyped}
          onSubmit={addTyped}
          onEscape={() => setTyped('')}
        />
        {typedDraft && (
          <p className="pb-1 pt-1.5 text-label-xs text-muted-foreground">
            <b className="font-semibold text-foreground">{typedDraft.savedName}</b>
            {typedCheck?.answer && (
              <>
                {' = '}
                <span className="font-mono text-action">{typedCheck.answer}</span>
              </>
            )}
            {typedDraft.material && ` · under ${displayNameOf(typedDraft.material)}`}
            {typedDraft.savedName !== typedDraft.name && (
              <span className="text-warning-text"> · {typedDraft.name} is already used</span>
            )}
            {typedCheck?.problem && (
              <span className="text-warning-text"> · {typedCheck.problem}</span>
            )}
            {!typedDraft.formula && ' · press Enter to write its formula'}
          </p>
        )}
        {typedDraft?.material && (
          <WorkbenchCalculationSuggestionList
            suggestions={calculationSuggestions(board, typedDraft.material)}
            suggestionTitle={suggestion =>
              namesWithin(suggestion.formula, board, typedDraft.material)
            }
            className="flex"
            onSuggest={suggestion => {
              addSuggestion(typedDraft.material, suggestion);
              setTyped('');
            }}
          />
        )}
      </div>
      {isEmpty && (
        <PanelEmptyState
          icon={CARD_ICONS.calculations}
          message="Add a calculation above"
          description="Name it, or type Name = formula"
        />
      )}
      {layout.missing.length > 0 && (
        <AlertBanner
          variant="warning"
          title={`${layout.missing.length} ${layout.missing.length === 1 ? 'thing' : 'things'} missing`}
          animate={false}
          spacing="lg"
          className="mx-2"
        >
          <ul className="flex flex-col gap-1">
            {layout.missing.map(note => (
              <li key={note.message}>
                {note.message}
                <span className="text-muted-foreground"> · {note.subjects.join(', ')}</span>
              </li>
            ))}
          </ul>
        </AlertBanner>
      )}
      {wideTables.length > 0 && (
        <div className="mb-6 flex flex-col gap-6">{wideTables.map(renderPart)}</div>
      )}
      {open && (
        <WorkbenchCalculationEditor
          key={open.calculation.id}
          calculation={open.calculation}
          material={open.material}
          board={board}
          anchorOf={openRowBox}
          onChange={change =>
            edit(draft => updateCalculation(draft, card.id, open.calculation.id, change))
          }
          onAddMissing={name =>
            edit(draft =>
              addNamedValue(draft, { name, value: '', unit: '' }, open.material, activePageId)
            )
          }
          onRemove={() => {
            edit(draft => removeCalculation(draft, card.id, open.calculation.id));
            setOpenId(undefined);
          }}
          onClose={() => setOpenId(undefined)}
        />
      )}
      <div ref={columnsRef} className="flex items-start gap-x-6">
        {columns.map((column, index) => (
          <div key={index} className="flex min-w-0 flex-1 flex-col gap-6">
            {column.map(renderPart)}
          </div>
        ))}
      </div>
    </div>
  );
}
