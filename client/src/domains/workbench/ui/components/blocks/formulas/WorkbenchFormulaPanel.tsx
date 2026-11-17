import { useMemo, useState } from 'react';

import { withGreekLetters } from '@odysseus/shared-schemas';

import { PanelEmptyState } from '@shared/ui';

import { useShowBlock } from '../../../../hooks/useShowBlock';
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
  calculationSections,
  sectionNumbers,
  WHOLE_EXPERIMENT,
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
import { cellWarnings } from '../../../../utils/materials/cellFormulas';
import { displayNameOf } from '../../../../utils/materials/materialLookup';
import { recipeWarnings } from '../../../../utils/materials/materialRecipeFormulas';
import { joinValueName } from '../../../../utils/values/valueNames';
import { BLOCK_ICONS } from '../../board/blockIcons';
import { META_LABEL } from '../../board/metaLabelClass';
import { WorkbenchAddBar } from '../../board/WorkbenchAddBar';

import { WorkbenchFormulaEditor } from './WorkbenchFormulaEditor';
import { WorkbenchFormulaRow } from './WorkbenchFormulaRow';
import { WorkbenchFormulaSection } from './WorkbenchFormulaSection';
import { WorkbenchFormulaSuggestionList } from './WorkbenchFormulaSuggestionList';
import {
  WorkbenchFormulaWorkedOutGroup,
  type WorkedOutLine,
} from './WorkbenchFormulaWorkedOutGroup';

import type { FormulaBlock, MaterialItem, Protocol, ProtocolBlock } from '@odysseus/shared-schemas';

interface WorkbenchFormulaPanelProps {
  block: FormulaBlock;
}

const SETTINGS_LABELS: Partial<Record<ProtocolBlock['type'], string>> = {
  dilutions: 'Dilutions',
  materials: 'Materials',
};

const workedOutKey = (section: CalculationSection, groupKey: string) =>
  `${section.key}/${groupKey}`;

function linksOf(
  calculation: BoardCalculation,
  result: FormulaResult | undefined
): Readonly<Record<string, string>> {
  if (result?.status !== 'ok') return {};
  return Object.fromEntries(
    result.terms.flatMap(term => {
      if (term.kind !== 'ref') return [];
      const sourceId = calculation.names.get(nameKey(term.name))?.sourceBlockId;
      return sourceId ? [[term.name, sourceId]] : [];
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

  const materials = useMemo(
    () =>
      protocol.blocks
        .flatMap(candidate => (candidate.type === 'materials' ? candidate.items : []))
        .filter(item => item.name.trim()),
    [protocol]
  );
  const showsWorkedOut =
    protocol.blocks.find(candidate => candidate.type === 'formula')?.id === block.id;
  const sections = useMemo(
    () => calculationSections(block, materials, calculation, showsWorkedOut),
    [block, materials, calculation, showsWorkedOut]
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
  const workedOut = useStructuralSharing(
    useMemo(
      () =>
        Object.fromEntries(
          sections.flatMap(section =>
            section.groups.map(({ group, lines }) => {
              const settingsBlock = protocol.blocks.find(
                candidate => candidate.id === group.settingsBlockId
              );
              const label = settingsBlock && SETTINGS_LABELS[settingsBlock.type];
              return [
                workedOutKey(section, group.key),
                {
                  lines: lines.map(
                    (line): WorkedOutLine => ({
                      id: line.id,
                      name: line.name,
                      result: calculation.results.get(line.id),
                      links: linksOf(calculation, calculation.results.get(line.id)),
                      warnings: warnings.get(line.id) ?? [],
                      isIntermediate: !!line.isIntermediate,
                    })
                  ),
                  settings:
                    settingsBlock && label ? { label, blockId: settingsBlock.id } : undefined,
                },
              ];
            })
          )
        ),
      [sections, protocol, calculation, warnings]
    )
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
  const isTitled = sections.length > 1;
  const isEmpty = sections.every(section => !section.items.length && !section.groups.length);
  const shownSections = sections.filter(
    section => !!section.material || section.items.length > 0 || section.groups.length > 0
  );

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
    section.items.map(formula =>
      formula.id === openId ? (
        <WorkbenchFormulaEditor
          key={formula.id}
          formula={formula}
          material={section.material}
          calculation={calculation}
          boardNumbers={sectionNumbers(section, materials, calculation, formula.id)}
          onChange={change => edit(draft => updateFormula(draft, block.id, formula.id, change))}
          onAddMissing={name =>
            edit(draft => addNamedValue(draft, name, section.material, activePageId))
          }
          onRemove={() => {
            edit(draft => removeFormula(draft, block.id, formula.id));
            setOpenId(undefined);
          }}
          onClose={() => setOpenId(undefined)}
        />
      ) : (
        <WorkbenchFormulaRow
          key={formula.id}
          formulaId={formula.id}
          name={formula.name}
          result={results[formula.id]}
          material={section.material}
          onOpen={setOpenId}
        />
      )
    );

  return (
    <div className="px-2 pb-3 pt-1">
      <div className="mb-6 px-2 pt-2">
        <WorkbenchAddBar
          value={typed}
          placeholder="e.g. Total volume = Wells used × Well volume"
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
      <div className="columns-[20rem] gap-x-6 space-y-5">
        {shownSections.map(section => {
          const { material, items, groups } = section;
          const title = material ? displayNameOf(material) : section.owner || 'WHOLE EXPERIMENT';
          return (
            <WorkbenchFormulaSection
              key={section.key}
              title={isTitled ? title : undefined}
              kind={material?.type ?? ''}
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
                const view = workedOut[workedOutKey(section, group.key)];
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
              {groups.length > 0 && items.length > 0 && (
                <span className={`${META_LABEL} px-2 pb-0.5 pt-2`}>Yours</span>
              )}
              {ownItems(section)}
            </WorkbenchFormulaSection>
          );
        })}
      </div>
    </div>
  );
}
