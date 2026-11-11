import { useMemo, useState } from 'react';

import { Select } from '@shared/ui';

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
} from '../../../../utils/formulas/formulaScopes';
import { recipeWarnings } from '../../../../utils/materials/materialRecipeFormulas';
import { joinValueName } from '../../../../utils/values/valueNames';
import { META_LABEL } from '../../board/metaLabelClass';

import { WorkbenchFormulaEditor } from './WorkbenchFormulaEditor';
import { WorkbenchFormulaRow } from './WorkbenchFormulaRow';
import { WorkbenchFormulaSection } from './WorkbenchFormulaSection';
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
    const prep = dilutionPrep(run, protocol, calculation);
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
    const name = uniqueName(calculation, joinValueName(material?.name.trim() ?? '', label.trim()));
    const expr = namesInFull(rest.join('=').trim(), calculation, material);
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

  const choiceOptions = useMemo(() => {
    const shownMaterials = new Set(
      sections.flatMap(({ material }) => (material ? [material.id] : []))
    );
    const choices = materials.filter(item => !shownMaterials.has(item.id));
    const nameKeys = [...calculation.names.keys()];
    const hasValues = (item: MaterialItem) =>
      nameKeys.some(key => key.startsWith(`${nameKey(item.name)} `));
    return [
      ...choices
        .filter(hasValues)
        .map(item => ({ value: item.id, label: item.name.trim(), group: 'With values' })),
      ...choices
        .filter(item => !hasValues(item))
        .map(item => ({ value: item.id, label: item.name.trim(), group: 'No values yet' })),
    ];
  }, [sections, materials, calculation]);
  const isTitled = sections.length > 1;

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
      <div className="columns-[20rem] gap-x-6 space-y-5">
        {sections.map(section => {
          const { material, items, groups } = section;
          const title = material ? material.name.trim() : section.owner || 'Whole experiment';
          return (
            <WorkbenchFormulaSection
              key={section.key}
              title={isTitled ? title : undefined}
              kind={material?.type ?? ''}
              addPlaceholder={material ? `Add to ${title}` : 'Add: Total volume'}
              suggestions={calculationSuggestions(calculation, material)}
              suggestionTitle={suggestion => namesWithin(suggestion.expr, calculation, material)}
              isEmpty={!items.length && !groups.length}
              onAdd={section.owner && !material ? undefined : text => addFormula(material, text)}
              onSuggest={suggestion =>
                edit(draft => {
                  insertFormula(
                    draft,
                    block.id,
                    { name: suggestion.name, expr: suggestion.expr },
                    item => sectionOf(item.name),
                    material?.id ?? WHOLE_EXPERIMENT
                  );
                })
              }
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
      {choiceOptions.length > 0 && (
        <div className="mt-4 max-w-xs px-2">
          <Select
            size="sm"
            value=""
            placeholder="+ Calculations for…"
            aria-label="Add calculations for a material"
            options={choiceOptions}
            onChange={choice => {
              if (choice === null || choice === '') return;
              edit(draft => setFormulaSection(draft, block.id, String(choice), true));
            }}
          />
        </div>
      )}
    </div>
  );
}
