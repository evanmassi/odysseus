import { memo, useRef, useState } from 'react';

import { withGreekLetters } from '@odysseus/shared-schemas';
import { Plus, X } from 'lucide-react';

import { Button, Tooltip } from '@shared/ui';

import { usePlateSwatches } from '../../../../hooks/usePlateSwatches';
import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { formatNumber, readNumber } from '../../../../utils/formulas/quantities';
import { workedCountsByKey, type WorkedCount } from '../../../../utils/materials/cellCounts';
import { DONOR_ID_FIELD, sourceColumns } from '../../../../utils/materials/materialSources';
import { ADD_ICON } from '../../board/addIconClass';
import { capsKeepingGreek } from '../../board/capsKeepingGreek';
import { META_LABEL } from '../../board/metaLabelClass';
import { WorkbenchMarkSwatch } from '../vessels/WorkbenchMarkSwatch';
import { WorkbenchPlateNameField } from '../vessels/WorkbenchPlateNameField';
import { WorkbenchPlateSuggestionList } from '../vessels/WorkbenchPlateSuggestionList';

import { ROW_ACTION } from './materialTableStyles';
import { WorkbenchMaterialFieldSelector } from './WorkbenchMaterialFieldSelector';

import type { RememberedSource } from '../../../../utils/materials/materialMemory';
import type { FieldChoice } from '../../../../utils/materials/materialSectionFields';
import type {
  FieldDefinition,
  MaterialItem,
  MaterialSource,
  MaterialSources,
} from '@odysseus/shared-schemas';

export interface MaterialSourceActions {
  renameList: (itemId: string, label: string) => void;
  removeList: (itemId: string) => void;
  add: (itemId: string, names: readonly string[]) => void;
  recall: (itemId: string, source: RememberedSource) => void;
  rename: (itemId: string, sourceId: string, name: string) => void;
  finishRename: (itemId: string, sourceId: string, from: string) => void;
  write: (itemId: string, sourceId: string, key: string, value: string) => void;
  remove: (itemId: string, sourceId: string) => void;
  toggleField: (itemId: string, key: string) => void;
  addCustomField: (itemId: string, label: string) => void;
  togglePin: (group: string, key: string) => void;
  known: (typed: string, rows: readonly MaterialSource[]) => RememberedSource[];
  fieldChoices: (sources: MaterialSources) => FieldChoice[];
  pinnedKeys: (group: string) => ReadonlySet<string>;
}

interface WorkbenchMaterialSourceTableProps {
  item: MaterialItem;
  sources: MaterialSources;
  span: number;
  plateNames: readonly string[];
  isJustOpened: boolean;
  actions: MaterialSourceActions;
}

const HEAD_CELL =
  'group/head whitespace-nowrap px-3 py-1.5 text-left type-label text-label-2xs font-semibold text-muted-foreground first:pl-0';
const CELL = 'whitespace-nowrap px-3 py-1 align-middle text-body-sm first:pl-0';
const FIELD = 'text-body-sm text-foreground placeholder:text-muted-foreground';
const NUMBER_FIELD = `${FIELD} w-24 text-right font-mono`;

const knownLabel = (source: RememberedSource) =>
  [source.name, source.values[DONOR_ID_FIELD], source.material && `(${source.material})`]
    .filter(Boolean)
    .join(' · ');

function normalizedNumber(text: string): string {
  const value = readNumber(text);
  return value === undefined ? text : formatNumber(value);
}

interface SourceCellProps {
  source: MaterialSource;
  column: FieldDefinition;
  workedOut: WorkedCount | undefined;
  onChange: (value: string) => void;
}

function SourceCell({ source, column, workedOut, onChange }: SourceCellProps) {
  const value = source.values[column.key] ?? '';
  if (column.kind !== 'number') {
    return (
      <span className="inline-edit">
        <input
          value={value}
          aria-label={`${column.label} of ${source.name}`}
          spellCheck={false}
          className={`${FIELD} w-28`}
          onChange={event => onChange(event.target.value)}
          onBlur={event => {
            const converted = withGreekLetters(event.target.value);
            if (converted !== event.target.value) onChange(converted);
          }}
        />
      </span>
    );
  }
  const field = (
    <span className="inline-flex items-center gap-1">
      <span className="inline-edit" data-align="end">
        <input
          value={value}
          placeholder={workedOut?.text}
          aria-label={`${column.label} of ${source.name}`}
          spellCheck={false}
          className={NUMBER_FIELD}
          onChange={event => onChange(event.target.value)}
          onBlur={event => {
            const normalized = normalizedNumber(event.target.value);
            if (normalized !== event.target.value) onChange(normalized);
          }}
        />
      </span>
      {column.unit && <span className="text-caption text-muted-foreground">{column.unit}</span>}
    </span>
  );
  return workedOut ? (
    <Tooltip content={`Worked out: ${workedOut.working}. Type a number to replace it`}>
      {field}
    </Tooltip>
  ) : (
    field
  );
}

export const WorkbenchMaterialSourceTable = memo(function WorkbenchMaterialSourceTable({
  item,
  sources,
  span,
  plateNames,
  isJustOpened,
  actions,
}: WorkbenchMaterialSourceTableProps) {
  const [draft, setDraft] = useState('');
  const [fieldQuery, setFieldQuery] = useState<string>();
  const nameAtStart = useRef('');
  const fieldButtonRef = useRef<HTMLButtonElement>(null);
  const swatchOf = usePlateSwatches();
  const columns = sourceColumns(sources);
  const known = actions.known(draft, sources.rows);
  const knownByLabel = new Map(known.map(source => [knownLabel(source), source]));

  const addDraft = () => {
    if (!draft.trim()) return;
    actions.add(item.id, [draft]);
    setDraft('');
  };

  return (
    <tr>
      <td colSpan={span} className="pb-3 pl-11 pr-4 pt-1">
        <div className="w-max border-l border-line-soft pl-4">
          <div className="flex items-center gap-2 pb-0.5">
            <WorkbenchPlateNameField
              name={sources.label}
              shown={capsKeepingGreek(sources.label)}
              label="Name of this list"
              className={META_LABEL}
              onRename={label => actions.renameList(item.id, label)}
            />
            <span className="font-mono text-data-sm text-muted-foreground">
              {sources.rows.length}
            </span>
            {sources.rows.length === 0 && (
              <Tooltip content="Remove this empty list">
                <button
                  type="button"
                  aria-label={`Remove the ${sources.label} list`}
                  className="text-muted-foreground hover:text-danger-text"
                  onClick={() => actions.removeList(item.id)}
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
            <button
              ref={fieldButtonRef}
              type="button"
              className={`ml-3 inline-flex items-center gap-1 type-label text-label-2xs transition-colors hover:text-foreground ${
                fieldQuery === undefined ? 'text-foreground/55' : 'text-foreground'
              }`}
              aria-expanded={fieldQuery !== undefined}
              onClick={() => setFieldQuery(fieldQuery === undefined ? '' : undefined)}
            >
              <Plus aria-hidden className={ADD_ICON} />
              Add field
            </button>
          </div>
          <WorkbenchMaterialFieldSelector
            isOpen={fieldQuery !== undefined}
            triggerRef={fieldButtonRef}
            choices={fieldQuery === undefined ? [] : actions.fieldChoices(sources)}
            pinnedKeys={actions.pinnedKeys(item.group)}
            query={fieldQuery ?? ''}
            onQueryChange={setFieldQuery}
            onToggle={key => actions.toggleField(item.id, key)}
            onTogglePin={key => actions.togglePin(item.group, key)}
            onAddCustom={() => {
              const label = withGreekLetters((fieldQuery ?? '').trim());
              if (label) actions.addCustomField(item.id, label);
              setFieldQuery('');
            }}
            onClose={() => setFieldQuery(undefined)}
          />
          {sources.rows.length > 0 && (
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className={HEAD_CELL}>Name</th>
                  {columns.map(column => (
                    <th key={column.key} className={HEAD_CELL}>
                      {capsKeepingGreek(column.label)}
                      <Tooltip content="Hide this column">
                        <button
                          type="button"
                          className="ml-1.5 inline-flex align-middle text-muted-foreground opacity-0 transition-opacity hover:text-danger-text focus-visible:opacity-100 group-hover/head:opacity-100"
                          aria-label={`Hide ${column.label}`}
                          onClick={() => actions.toggleField(item.id, column.key)}
                        >
                          <X aria-hidden className="h-3 w-3" />
                        </button>
                      </Tooltip>
                    </th>
                  ))}
                  <th className={`${HEAD_CELL} w-px`} />
                </tr>
              </thead>
              <tbody>
                {sources.rows.map(source => {
                  const workedOut = workedCountsByKey(source.values);
                  return (
                    <tr key={source.id} className="group">
                      <td className={CELL}>
                        <span className="flex items-center gap-2">
                          <WorkbenchMarkSwatch swatch={swatchOf(source.name)} />
                          <span className="inline-edit">
                            <input
                              value={source.name}
                              placeholder="Name"
                              aria-label={`Name in ${sources.label}`}
                              spellCheck={false}
                              className={`${FIELD} w-28 font-semibold`}
                              onFocus={() => {
                                nameAtStart.current = source.name;
                              }}
                              onChange={event =>
                                actions.rename(item.id, source.id, event.target.value)
                              }
                              onBlur={() =>
                                actions.finishRename(item.id, source.id, nameAtStart.current)
                              }
                            />
                          </span>
                        </span>
                      </td>
                      {columns.map(column => (
                        <td key={column.key} className={CELL}>
                          <SourceCell
                            source={source}
                            column={column}
                            workedOut={workedOut.get(column.key)}
                            onChange={value => actions.write(item.id, source.id, column.key, value)}
                          />
                        </td>
                      ))}
                      <td className={`${CELL} w-px text-right`}>
                        <Button
                          variant="ghost-danger"
                          size="xs"
                          className={ROW_ACTION}
                          onClick={() => actions.remove(item.id, source.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <span className="inline-edit mt-1 flex">
            <input
              ref={isJustOpened ? focusOnMount : undefined}
              value={draft}
              placeholder={`Add to ${sources.label}: a name, or a Donor ID you used before`}
              aria-label={`Add to ${sources.label}`}
              spellCheck={false}
              autoComplete="off"
              className={`${FIELD} w-full`}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addDraft();
              }}
            />
          </span>
          <div className="flex flex-col gap-1 pt-1">
            <WorkbenchPlateSuggestionList
              label="Used before"
              suggestions={known.map(source => ({
                key: source.values[DONOR_ID_FIELD] ?? source.name,
                text: knownLabel(source),
              }))}
              onPick={label => {
                const source = knownByLabel.get(label);
                if (!source) return;
                actions.recall(item.id, source);
                setDraft('');
              }}
            />
            {plateNames.length > 0 && (
              <span className="flex flex-wrap items-center gap-1">
                <WorkbenchPlateSuggestionList
                  label="From your plate"
                  suggestions={plateNames.map(name => ({ key: name, text: name }))}
                  onPick={name => actions.add(item.id, [name])}
                />
                {plateNames.length > 1 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => actions.add(item.id, plateNames)}
                  >
                    Add all
                  </Button>
                )}
              </span>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
});
