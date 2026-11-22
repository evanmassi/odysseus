import { useCallback, useMemo, useRef, useState } from 'react';

import { withGreekLetters } from '@odysseus/shared-schemas';

import { AlertBanner, PanelEmptyState } from '@shared/ui';

import { usePlateSwatches } from '../../../../hooks/usePlateSwatches';
import { useShowBlock } from '../../../../hooks/useShowBlock';
import { useStableColumns } from '../../../../hooks/useStableColumns';
import { useStructuralSharing } from '../../../../hooks/useStructuralSharing';
import { useProtocolWith } from '../../../../hooks/useWorkbenchSlice';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { prepLineId } from '../../../../utils/dilutions/dilutionFormulas';
import { dilutionPrep } from '../../../../utils/dilutions/dilutionPrep';
import { dilutionRuns } from '../../../../utils/dilutions/dilutionRuns';
import {
  nameKey,
  type BoardCalculation,
  type FormulaResult,
} from '../../../../utils/formulas/boardCalculation';
import {
  calculationLayout,
  calculationSections,
  WHOLE_EXPERIMENT,
  type CalculationPart,
  type CalculationSection,
} from '../../../../utils/formulas/calculationSections';
import { checkFormulaDraft, readFormulaDraft } from '../../../../utils/formulas/formulaDraft';
import {
  addNamedValue,
  insertFormula,
  removeFormula,
  setFormulaSection,
  updateFormula,
} from '../../../../utils/formulas/formulaEdits';
import {
  calculationSuggestions,
  formulaMaterial,
  namesInFull,
  namesWithin,
  uniqueName,
  type CalculationSuggestion,
} from '../../../../utils/formulas/formulaScopes';
import { workingRefs } from '../../../../utils/formulas/workingTree';
import { cellWarnings } from '../../../../utils/materials/cellFormulas';
import { displayNameOf } from '../../../../utils/materials/materialLookup';
import { recipeWarnings } from '../../../../utils/materials/materialRecipeFormulas';
import { TOTAL_WELL_VOLUME, WELLS_USED } from '../../../../utils/terms/termList';
import { generalTitleOf, joinValueName } from '../../../../utils/values/valueNames';
import { BLOCK_ICONS } from '../../board/blockIcons';
import { WorkbenchAddBar } from '../../board/WorkbenchAddBar';

import { WorkbenchFormulaEditor } from './WorkbenchFormulaEditor';
import { FORMULA_ROW_ATTRIBUTE, WorkbenchFormulaRow } from './WorkbenchFormulaRow';
import { WorkbenchFormulaSection } from './WorkbenchFormulaSection';
import { WorkbenchFormulaSuggestionList } from './WorkbenchFormulaSuggestionList';
import { WorkbenchFormulaTable } from './WorkbenchFormulaTable';
import {
  WorkbenchFormulaWorkedOutGroup,
  type WorkedOutLine,
  type WorkedOutSettings,
} from './WorkbenchFormulaWorkedOutGroup';

import type { FormulaTableRow } from './WorkbenchFormulaTable';
import type { FormulaBlock, MaterialItem, Protocol, ProtocolBlock } from '@odysseus/shared-schemas';

interface WorkbenchFormulaPanelProps {
  block: FormulaBlock;
}

interface GroupView {
  settings: WorkedOutSettings | undefined;
  lines: WorkedOutLine[];
}

interface TableView {
  settings: WorkedOutSettings | undefined;
  rows: FormulaTableRow[];
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

const SETTINGS_LABELS: Partial<Record<ProtocolBlock['type'], string>> = {
  dilutions: 'Dilutions',
  materials: 'Materials',
};

function linksOf(
  calculation: BoardCalculation,
  result: FormulaResult | undefined
): Readonly<Record<string, string>> {
  if (result?.status !== 'ok') return {};
  return Object.fromEntries(
    workingRefs(result.working).flatMap(ref => {
      const sourceId = calculation.names.get(nameKey(ref.name))?.sourceBlockId;
      return sourceId ? [[ref.name, sourceId]] : [];
    })
  );
}

function prepWarnings(protocol: Pick<Protocol, 'blocks'>, calculation: BoardCalculation) {
  const byLine = new Map<string, string[]>();
  for (const run of dilutionRuns(protocol)) {
    const prep = dilutionPrep(run, protocol, calculation, '');
    if (prep.kind !== 'ready') continue;
    for (const warning of prep.warnings) {
      const id = prepLineId(run, warning.line);
      byLine.set(id, [...(byLine.get(id) ?? []), warning.text]);
    }
  }
  return byLine;
}

export function WorkbenchFormulaPanel({ block }: WorkbenchFormulaPanelProps) {
  const protocol = useProtocolWith('materials', 'plate', 'formula', 'dilutions');
  const calculation = useWorkbenchStore(state => state.calculation);
  const activePageId = useWorkbenchStore(state => state.activePageId);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const showBlock = useShowBlock();
  const [openId, setOpenId] = useState<string>();
  const [typed, setTyped] = useState('');
  const columnsRef = useRef<HTMLDivElement>(null);
  const openRowBox = useCallback(
    () =>
      columnsRef.current
        ?.querySelector(`[${FORMULA_ROW_ATTRIBUTE}="${openId}"]`)
        ?.getBoundingClientRect(),
    [openId]
  );

  const materials = useMemo(
    () =>
      protocol.blocks
        .flatMap(candidate => (candidate.type === 'materials' ? candidate.items : []))
        .filter(item => item.name.trim()),
    [protocol]
  );
  const swatchOf = usePlateSwatches();
  const generalTitle = generalTitleOf(protocol.blocks);
  const showsWorkedOut =
    protocol.blocks.find(candidate => candidate.type === 'formula')?.id === block.id;
  const sections = useMemo(
    () => calculationSections(block, materials, calculation, showsWorkedOut, generalTitle),
    [block, materials, calculation, showsWorkedOut, generalTitle]
  );
  const warnings = useMemo(
    () =>
      showsWorkedOut
        ? new Map([
            ...prepWarnings(protocol, calculation),
            ...recipeWarnings(protocol, calculation),
            ...cellWarnings(calculation),
          ])
        : new Map<string, string[]>(),
    [protocol, calculation, showsWorkedOut]
  );
  const results = useStructuralSharing(
    useMemo(
      (): Partial<Record<string, FormulaResult>> => Object.fromEntries(calculation.results),
      [calculation]
    )
  );
  const layout = useMemo(
    () => calculationLayout(sections, calculation, block.materialSections),
    [sections, calculation, block.materialSections]
  );
  const workedOut = useStructuralSharing(
    useMemo(() => {
      const settingsOf = (blockId: string | undefined): WorkedOutSettings | undefined => {
        const settingsBlock = protocol.blocks.find(candidate => candidate.id === blockId);
        const label = settingsBlock && SETTINGS_LABELS[settingsBlock.type];
        return settingsBlock && label ? { label, blockId: settingsBlock.id } : undefined;
      };
      const lineOf = (line: {
        id: string;
        name: string;
        isIntermediate?: boolean;
      }): WorkedOutLine => ({
        id: line.id,
        name: line.name,
        result: calculation.results.get(line.id),
        links: linksOf(calculation, calculation.results.get(line.id)),
        warnings: warnings.get(line.id) ?? [],
        isIntermediate: !!line.isIntermediate,
      });
      const groups = layout.parts.flatMap(
        (part): Array<[string, GroupView]> =>
          part.kind === 'section'
            ? part.section.groups.map(({ group, lines }): [string, GroupView] => [
                `${part.section.key}/${group.key}`,
                { settings: settingsOf(group.settingsBlockId), lines: lines.map(lineOf) },
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
                    settings: settingsOf(part.table.settingsBlockId),
                    rows: part.table.rows.map(row => ({ ...row, lines: row.lines.map(lineOf) })),
                  },
                ],
              ]
            : []
      );
      return { groups: Object.fromEntries(groups), tables: Object.fromEntries(tables) };
    }, [layout, protocol, calculation, warnings])
  );

  const sectionOf = (name: string) => formulaMaterial(name, materials)?.id ?? WHOLE_EXPERIMENT;
  const edit = (mutate: (draft: Protocol) => void) => updateProtocol(mutate);

  const addFormula = (material: MaterialItem | undefined, text: string) => {
    const [label, ...rest] = text.split('=');
    const name = uniqueName(
      calculation,
      joinValueName(material?.name.trim() ?? '', withGreekLetters(label.trim()))
    );
    const expr = namesInFull(withGreekLetters(rest.join('=').trim()), calculation, material);
    let added: string | undefined;
    edit(draft => {
      added = insertFormula(
        draft,
        block.id,
        { name, expr },
        item => sectionOf(item.name),
        material?.id ?? WHOLE_EXPERIMENT
      );
    });
    setOpenId(added);
  };

  const typedDraft = useMemo(
    () => readFormulaDraft(typed, calculation, materials),
    [typed, calculation, materials]
  );
  const typedCheck = useMemo(
    () => typedDraft && checkFormulaDraft(typedDraft, calculation),
    [typedDraft, calculation]
  );
  const [onlyPart] = layout.parts;
  const isTitled =
    layout.parts.length > 1 ||
    (onlyPart?.kind === 'section' && onlyPart.section.key !== WHOLE_EXPERIMENT) ||
    onlyPart?.kind === 'table';
  const isEmpty = !layout.parts.length && !layout.missing.length;

  const addTyped = () => {
    if (!typedDraft) return;
    const { savedName, expr, material } = typedDraft;
    let added: string | undefined;
    edit(draft => {
      added = insertFormula(
        draft,
        block.id,
        { name: savedName, expr },
        item => sectionOf(item.name),
        material?.id ?? WHOLE_EXPERIMENT
      );
    });
    if (!expr || typedCheck?.problem) setOpenId(added);
    setTyped('');
  };

  const addSuggestion = (material: MaterialItem | undefined, suggestion: CalculationSuggestion) =>
    edit(draft => {
      insertFormula(
        draft,
        block.id,
        { name: suggestion.name, expr: suggestion.expr },
        item => sectionOf(item.name),
        material?.id ?? WHOLE_EXPERIMENT
      );
    });

  const ownItems = (section: CalculationSection) =>
    section.items.map(formula => (
      <WorkbenchFormulaRow
        key={formula.id}
        formulaId={formula.id}
        name={formula.name}
        result={results[formula.id]}
        material={section.material}
        isOpen={formula.id === openId}
        onOpen={setOpenId}
      />
    ));
  const open = sections
    .flatMap(section => section.items.map(formula => ({ formula, material: section.material })))
    .find(({ formula }) => formula.id === openId);

  const renderPart = (part: CalculationPart) => {
    if (part.kind === 'table') {
      const view = workedOut.tables[part.table.key];
      return (
        <WorkbenchFormulaTable
          key={part.table.key}
          title={part.table.title}
          columns={part.table.columns}
          rows={view.rows}
          settings={view.settings}
          swatchOf={swatchOf}
          onShowBlock={showBlock}
        />
      );
    }
    const { section } = part;
    const { material, items, groups } = section;
    const { title } = section;
    return (
      <WorkbenchFormulaSection
        key={section.key}
        title={isTitled ? title : undefined}
        kind={material?.type ?? ''}
        swatch={swatchOf(section.owner)}
        addPlaceholder={material ? `Add to ${title}` : 'Add: Total volume'}
        suggestions={material ? calculationSuggestions(calculation, material) : []}
        suggestionTitle={suggestion => namesWithin(suggestion.expr, calculation, material)}
        isEmpty={!items.length && !groups.length}
        onAdd={material ? text => addFormula(material, text) : undefined}
        onSuggest={suggestion => addSuggestion(material, suggestion)}
        onRemoveSection={
          material && !items.length && !groups.length
            ? () => edit(draft => setFormulaSection(draft, block.id, material.id, false))
            : undefined
        }
      >
        {groups.map(({ group }) => {
          const view = workedOut.groups[`${section.key}/${group.key}`];
          return (
            <WorkbenchFormulaWorkedOutGroup
              key={group.key}
              title={group.title}
              lines={view.lines}
              subject={group.subject}
              settings={view.settings}
              onShowBlock={showBlock}
            />
          );
        })}
        {ownItems(section)}
      </WorkbenchFormulaSection>
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
            {!typedDraft.expr && ' · press Enter to write its formula'}
          </p>
        )}
        {typedDraft?.material && (
          <WorkbenchFormulaSuggestionList
            suggestions={calculationSuggestions(calculation, typedDraft.material)}
            suggestionTitle={suggestion =>
              namesWithin(suggestion.expr, calculation, typedDraft.material)
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
          icon={BLOCK_ICONS.formula}
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
        <WorkbenchFormulaEditor
          key={open.formula.id}
          formula={open.formula}
          material={open.material}
          calculation={calculation}
          anchorOf={openRowBox}
          onChange={change =>
            edit(draft => updateFormula(draft, block.id, open.formula.id, change))
          }
          onAddMissing={name =>
            edit(draft => addNamedValue(draft, name, open.material, activePageId))
          }
          onRemove={() => {
            edit(draft => removeFormula(draft, block.id, open.formula.id));
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
