import { memo, useRef, useState } from 'react';

import { withGreekLetters } from '@odysseus/shared-schemas';
import { Plus, X } from 'lucide-react';

import { Button, Tooltip } from '@shared/ui';

import { usePlateSwatches } from '../../../../hooks/usePlateSwatches';
import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { formatNumber, readNumber } from '../../../../utils/formulas/quantities';
import { workedCountsByKey, type WorkedCount } from '../../../../utils/materials/cellCounts';
import { DONOR_ID_FIELD, donorColumns } from '../../../../utils/materials/materialDonors';
import { ADD_ICON } from '../../board/addIconClass';
import { capsKeepingGreek } from '../../board/capsKeepingGreek';
import { META_LABEL } from '../../board/metaLabelClass';
import { TREE_BRANCH_INDENT, TREE_RAIL_X, WorkbenchTreeRail } from '../../board/WorkbenchTreeRail';
import { WorkbenchIndicatorSwatch } from '../plateMap/WorkbenchIndicatorSwatch';
import { WorkbenchPlateNameField } from '../plateMap/WorkbenchPlateNameField';
import { WorkbenchPlateSuggestionList } from '../plateMap/WorkbenchPlateSuggestionList';

import { ROW_ACTION } from './materialTableStyles';
import { WorkbenchMaterialFieldSelector } from './WorkbenchMaterialFieldSelector';
import { WorkbenchMaterialHideColumnButton } from './WorkbenchMaterialHideColumnButton';

import type { KnownDonor } from '../../../../utils/materials/materialMemory';
import type { FieldChoice } from '../../../../utils/materials/materialSectionFields';
import type {
  FieldDefinition,
  MaterialItem,
  ExperimentDonor,
  ExperimentDonors,
} from '@odysseus/shared-schemas';

export interface DonorTableActions {
  renameList: (itemId: string, label: string) => void;
  removeList: (itemId: string) => void;
  add: (itemId: string, names: readonly string[]) => void;
  recall: (itemId: string, knownDonor: KnownDonor) => void;
  rename: (itemId: string, donorId: string, name: string) => void;
  finishRename: (itemId: string, donorId: string) => void;
  write: (itemId: string, donorId: string, key: string, value: string) => void;
  remove: (itemId: string, donorId: string) => void;
  toggleField: (itemId: string, key: string) => void;
  addCustomField: (itemId: string, label: string) => void;
  togglePin: (group: string, key: string) => void;
  known: (typed: string, rows: readonly ExperimentDonor[]) => KnownDonor[];
  fieldChoices: (donors: ExperimentDonors) => FieldChoice[];
  pinnedKeys: (group: string) => ReadonlySet<string>;
}

interface WorkbenchMaterialDonorTableProps {
  item: MaterialItem;
  donors: ExperimentDonors;
  span: number;
  plateNames: readonly string[];
  isJustOpened: boolean;
  actions: DonorTableActions;
}

const HEAD_LABEL =
  'group/head whitespace-nowrap px-3 py-1.5 type-label text-label-2xs font-semibold text-muted-foreground first:pl-0';
const HEAD_CELL = `${HEAD_LABEL} text-left`;
const NUMBER_HEAD_CELL = `${HEAD_LABEL} text-right`;
const CELL = 'whitespace-nowrap px-3 py-1 align-middle text-body-sm first:pl-0';
const RAIL_LEFT = -TREE_BRANCH_INDENT;
const FIELD = 'text-body-sm text-foreground placeholder:text-muted-foreground';
const NUMBER_FIELD = `${FIELD} w-24 text-right font-mono`;

const knownLabel = (knownDonor: KnownDonor) =>
  [
    knownDonor.name,
    knownDonor.values[DONOR_ID_FIELD],
    knownDonor.material && `(${knownDonor.material})`,
  ]
    .filter(Boolean)
    .join(' · ');

function normalizedNumber(text: string): string {
  const value = readNumber(text);
  return value === undefined ? text : formatNumber(value);
}

interface DonorCellProps {
  donor: ExperimentDonor;
  column: FieldDefinition;
  workedOut: WorkedCount | undefined;
  onChange: (value: string) => void;
}

function DonorCell({ donor, column, workedOut, onChange }: DonorCellProps) {
  const value = donor.values[column.key] ?? '';
  if (column.kind !== 'number') {
    return (
      <span className="inline-edit">
        <input
          value={value}
          aria-label={`${column.label} of ${donor.name}`}
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
          aria-label={`${column.label} of ${donor.name}`}
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

export const WorkbenchMaterialDonorTable = memo(function WorkbenchMaterialDonorTable({
  item,
  donors,
  span,
  plateNames,
  isJustOpened,
  actions,
}: WorkbenchMaterialDonorTableProps) {
  const [draft, setDraft] = useState('');
  const [fieldQuery, setFieldQuery] = useState<string>();
  const fieldButtonRef = useRef<HTMLButtonElement>(null);
  const swatchOf = usePlateSwatches();
  const columns = donorColumns(donors);
  const known = actions.known(draft, donors.rows);
  const knownByLabel = new Map(known.map(knownDonor => [knownLabel(knownDonor), knownDonor]));

  const hasRows = donors.rows.length > 0;
  const railColor = swatchOf(item.name)?.color;

  const addDraft = () => {
    if (!draft.trim()) return;
    actions.add(item.id, [draft]);
    setDraft('');
  };

  return (
    <tr>
      <td colSpan={span} className="pb-3 pr-4" style={{ paddingLeft: TREE_RAIL_X }}>
        <div className="w-max" style={{ paddingLeft: TREE_BRANCH_INDENT }}>
          <div className="relative flex items-center gap-2 pb-0.5 pt-1">
            {hasRows && <WorkbenchTreeRail place="passing" color={railColor} left={RAIL_LEFT} />}
            <WorkbenchPlateNameField
              name={donors.label}
              shown={capsKeepingGreek(donors.label)}
              label="Name of this list"
              className={META_LABEL}
              onRename={label => actions.renameList(item.id, label)}
            />
            <span className="font-mono text-data-sm text-muted-foreground">
              {donors.rows.length}
            </span>
            {donors.rows.length === 0 && (
              <Tooltip content="Remove this empty list">
                <button
                  type="button"
                  aria-label={`Remove the ${donors.label} list`}
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
            choices={fieldQuery === undefined ? [] : actions.fieldChoices(donors)}
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
          {donors.rows.length > 0 && (
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className={`${HEAD_CELL} relative`}>
                    <WorkbenchTreeRail place="passing" color={railColor} left={RAIL_LEFT} />
                    Name
                  </th>
                  {columns.map(column => {
                    const isNumber = column.kind === 'number';
                    const hideButton = (
                      <WorkbenchMaterialHideColumnButton
                        label={column.label}
                        isBeforeLabel={isNumber}
                        onHide={() => actions.toggleField(item.id, column.key)}
                      />
                    );
                    return (
                      <th key={column.key} className={isNumber ? NUMBER_HEAD_CELL : HEAD_CELL}>
                        {isNumber && hideButton}
                        {capsKeepingGreek(column.label)}
                        {!isNumber && hideButton}
                      </th>
                    );
                  })}
                  <th className={`${HEAD_CELL} w-px`} />
                </tr>
              </thead>
              <tbody>
                {donors.rows.map((donor, index) => {
                  const workedOut = workedCountsByKey(donor.values);
                  return (
                    <tr key={donor.id} className="group">
                      <td className={`${CELL} relative`}>
                        <WorkbenchTreeRail
                          place={index === donors.rows.length - 1 ? 'end' : 'middle'}
                          color={railColor}
                          left={RAIL_LEFT}
                        />
                        <span className="flex items-center gap-2">
                          <WorkbenchIndicatorSwatch swatch={swatchOf(donor.name)} />
                          <span className="inline-edit">
                            <input
                              value={donor.name}
                              placeholder="Name"
                              aria-label={`Name in ${donors.label}`}
                              spellCheck={false}
                              className={`${FIELD} w-28 font-semibold`}
                              onChange={event =>
                                actions.rename(item.id, donor.id, event.target.value)
                              }
                              onBlur={() => actions.finishRename(item.id, donor.id)}
                            />
                          </span>
                        </span>
                      </td>
                      {columns.map(column => (
                        <td
                          key={column.key}
                          className={`${CELL} ${column.kind === 'number' ? 'text-right' : ''}`}
                        >
                          <DonorCell
                            donor={donor}
                            column={column}
                            workedOut={workedOut.get(column.key)}
                            onChange={value => actions.write(item.id, donor.id, column.key, value)}
                          />
                        </td>
                      ))}
                      <td className={`${CELL} w-px text-right`}>
                        <Button
                          variant="ghost-danger"
                          size="xs"
                          className={ROW_ACTION}
                          onClick={() => actions.remove(item.id, donor.id)}
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
              placeholder={`Add to ${donors.label}: a name, or a Donor ID you used before`}
              aria-label={`Add to ${donors.label}`}
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
              suggestions={known.map(knownDonor => ({
                key: knownDonor.values[DONOR_ID_FIELD] ?? knownDonor.name,
                text: knownLabel(knownDonor),
              }))}
              onPick={label => {
                const knownDonor = knownByLabel.get(label);
                if (!knownDonor) return;
                actions.recall(item.id, knownDonor);
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
