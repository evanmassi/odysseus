import { useMemo, useState } from 'react';

import { Select } from '@shared/ui';

import { useShowBlock } from '../../../../hooks/useShowBlock';
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
  nameWithin,
  nameWithinOwner,
  uniqueName,
} from '../../../../utils/formulas/formulaScopes';
import { recipeWarnings } from '../../../../utils/materials/materialRecipeFormulas';
import { joinValueName } from '../../../../utils/values/valueNames';
import { META_LABEL } from '../../board/metaLabelClass';

import { WorkbenchFormulaEditor } from './WorkbenchFormulaEditor';
import { WorkbenchFormulaRow } from './WorkbenchFormulaRow';
import { WorkbenchFormulaSection } from './WorkbenchFormulaSection';
import { WorkbenchFormulaWorkedOutGroup } from './WorkbenchFormulaWorkedOutGroup';
import { WorkbenchFormulaWorking } from './WorkbenchFormulaWorking';

import type { FormulaBlock, MaterialItem, Protocol, ProtocolBlock } from '@odysseus/shared-schemas';

interface WorkbenchFormulaPanelProps {
  block: FormulaBlock;
}

const SETTINGS_LABELS: Partial<Record<ProtocolBlock['type'], string>> = {
  dilutions: 'Dilutions',
  materials: 'Materials',
};

function prepWarnings(protocol: Protocol, calculation: BoardCalculation) {
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
  const protocol = useWorkbenchStore(state => state.protocol);
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

  const sectionOf = (name: string) => formulaMaterial(name, materials)?.id ?? WHOLE_EXPERIMENT;
  const edit = (mutate: (draft: Protocol) => void) => updateProtocol(mutate);
  const linkFor = (name: string) => {
    const sourceId = calculation.names.get(nameKey(name))?.sourceBlockId;
    return sourceId ? () => showBlock(sourceId) : undefined;
  };

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

  const shownMaterials = new Set(
    sections.flatMap(({ material }) => (material ? [material.id] : []))
  );
  const choices = materials.filter(item => !shownMaterials.has(item.id));
  const hasValues = (item: MaterialItem) =>
    [...calculation.names.keys()].some(key => key.startsWith(`${nameKey(item.name)} `));
  const choiceOptions = [
    ...choices
      .filter(hasValues)
      .map(item => ({ value: item.id, label: item.name.trim(), group: 'With values' })),
    ...choices
      .filter(item => !hasValues(item))
      .map(item => ({ value: item.id, label: item.name.trim(), group: 'No values yet' })),
  ];
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
          name={nameWithin(formula.name, section.material)}
          answer={answerOf(calculation.results.get(formula.id))}
          onOpen={() => setOpenId(formula.id)}
        >
          <WorkbenchFormulaWorking
            result={calculation.results.get(formula.id)}
            isCompact
            shortName={full => nameWithin(full, section.material)}
          />
        </WorkbenchFormulaRow>
      )
    );

  return (
    <div className="px-2 pb-3 pt-1">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-x-6 gap-y-5">
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
              {groups.map(({ group, lines }) => {
                const settingsBlock = protocol.blocks.find(
                  candidate => candidate.id === group.settingsBlockId
                );
                return (
                  <WorkbenchFormulaWorkedOutGroup
                    key={group.key}
                    title={group.title}
                    lines={lines.map(line => ({
                      id: line.id,
                      name: line.name,
                      result: calculation.results.get(line.id),
                      warnings: warnings.get(line.id) ?? [],
                    }))}
                    settingsLabel={settingsBlock && SETTINGS_LABELS[settingsBlock.type]}
                    shortName={full => nameWithinOwner(full, group.subject)}
                    linkFor={linkFor}
                    onShowSettings={() => settingsBlock && showBlock(settingsBlock.id)}
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

const answerOf = (result: FormulaResult | undefined) =>
  result?.status === 'ok' && 'text' in result.output ? result.output.text : '?';
