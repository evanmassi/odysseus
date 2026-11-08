import { useMemo, useState } from 'react';

import { Select } from '@shared/ui';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { nameKey, type FormulaResult } from '../../../../utils/formulas/boardCalculation';
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
  uniqueName,
} from '../../../../utils/formulas/formulaScopes';
import { joinValueName } from '../../../../utils/values/valueNames';

import { WorkbenchFormulaEditor } from './WorkbenchFormulaEditor';
import { WorkbenchFormulaRow } from './WorkbenchFormulaRow';
import { WorkbenchFormulaSection } from './WorkbenchFormulaSection';
import { WorkbenchFormulaWorking } from './WorkbenchFormulaWorking';

import type { FormulaBlock, MaterialItem, Protocol } from '@odysseus/shared-schemas';

interface WorkbenchFormulaPanelProps {
  block: FormulaBlock;
}

const WHOLE_EXPERIMENT = '';

export function WorkbenchFormulaPanel({ block }: WorkbenchFormulaPanelProps) {
  const protocol = useWorkbenchStore(state => state.protocol);
  const calculation = useWorkbenchStore(state => state.calculation);
  const activePageId = useWorkbenchStore(state => state.activePageId);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const [openId, setOpenId] = useState<string>();

  const materials = useMemo(
    () =>
      protocol.blocks
        .flatMap(candidate => (candidate.type === 'materials' ? candidate.items : []))
        .filter(item => item.name.trim()),
    [protocol]
  );

  const sectionOf = (name: string) => formulaMaterial(name, materials)?.id ?? WHOLE_EXPERIMENT;

  const sections = useMemo(() => {
    const grouped = new Map<string, FormulaBlock['items']>([
      [WHOLE_EXPERIMENT, []],
      ...materials.map((item): [string, FormulaBlock['items']] => [item.id, []]),
    ]);
    for (const item of block.items)
      grouped.get(formulaMaterial(item.name, materials)?.id ?? WHOLE_EXPERIMENT)?.push(item);
    return [...grouped]
      .map(([id, items]) => ({ material: materials.find(item => item.id === id), items }))
      .filter(
        ({ material, items }) =>
          !material || items.length || block.materialSections.includes(material.id)
      );
  }, [block, materials]);

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

  return (
    <div className="px-2 pb-3 pt-1">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-x-6 gap-y-5">
        {sections.map(({ material, items }) => (
          <WorkbenchFormulaSection
            key={material?.id ?? WHOLE_EXPERIMENT}
            title={isTitled ? (material ? material.name.trim() : 'Whole experiment') : undefined}
            kind={material?.type ?? ''}
            addPlaceholder={material ? `Add to ${material.name.trim()}` : 'Add: Total volume'}
            suggestions={calculationSuggestions(calculation, material)}
            suggestionTitle={suggestion => namesWithin(suggestion.expr, calculation, material)}
            isEmpty={!items.length}
            onAdd={text => addFormula(material, text)}
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
              material && !items.length
                ? () => edit(draft => setFormulaSection(draft, block.id, material.id, false))
                : undefined
            }
          >
            {items.map(formula =>
              formula.id === openId ? (
                <WorkbenchFormulaEditor
                  key={formula.id}
                  formula={formula}
                  material={material}
                  calculation={calculation}
                  onChange={change =>
                    edit(draft => updateFormula(draft, block.id, formula.id, change))
                  }
                  onAddMissing={name =>
                    edit(draft => addNamedValue(draft, name, material, activePageId))
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
                  name={nameWithin(formula.name, material)}
                  answer={answerOf(calculation.results.get(formula.id))}
                  onOpen={() => setOpenId(formula.id)}
                >
                  <WorkbenchFormulaWorking
                    result={calculation.results.get(formula.id)}
                    isCompact
                    shortName={full => nameWithin(full, material)}
                  />
                </WorkbenchFormulaRow>
              )
            )}
          </WorkbenchFormulaSection>
        ))}
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
