import { useState } from 'react';

import { Chip, SettingsRow, Subsection, Tooltip } from '@shared/ui';
import { Button, Toggle } from '@shared/ui/primitives';

import { CatalogEntryTable, type CatalogEntry } from './CatalogEntryTable';

import type { AttributeDefinition, AttributeValueType } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';

const VALUE_TYPE_LABELS: Record<AttributeValueType, string> = {
  select: 'Single choice',
  multi_select: 'Multiple choice',
  text: 'Free text',
  number: 'Number',
};

interface AttributeSectionProps {
  definition: AttributeDefinition;
  options: CatalogEntry[];
  reagentTypeOptions: SelectOption[];
  itemsUsingCount: number;
  loading?: boolean;
  onScopeChange: (appliesToTypes: string[]) => void;
  onPromptChange: (promptOnForm: boolean) => void;
  onDeleteDefinition: () => void;
  onAddOption: (value: string) => Promise<void>;
  onRenameOption: (id: string, value: string) => void;
  onDeleteOption: (id: string, value: string) => void;
  deletingOptionId?: string | null;
  readOnly?: boolean;
}

export function AttributeSection({
  definition,
  options,
  reagentTypeOptions,
  itemsUsingCount,
  loading = false,
  onScopeChange,
  onPromptChange,
  onDeleteDefinition,
  onAddOption,
  onRenameOption,
  onDeleteOption,
  deletingOptionId,
  readOnly = false,
}: AttributeSectionProps) {
  const [isEditingScope, setIsEditingScope] = useState(false);
  const usesOptions = definition.valueType === 'select' || definition.valueType === 'multi_select';

  const scopeSummary =
    definition.appliesToTypes.length === 0
      ? 'All reagent types'
      : definition.appliesToTypes.slice(0, 3).join(' · ') +
        (definition.appliesToTypes.length > 3 ? ` +${definition.appliesToTypes.length - 3}` : '');

  const deleteHint = definition.isSystem
    ? 'Built-in attributes stay available to every lab'
    : itemsUsingCount > 0
      ? `${itemsUsingCount} ${itemsUsingCount === 1 ? 'reagent records' : 'reagents record'} a value for this`
      : 'Removes the attribute and its options';

  return (
    <div className="space-y-2">
      <div>
        <Subsection
          title="Attribute Settings"
          meta={
            definition.isSystem ? (
              <Chip size="xs" color="info">
                Built-in
              </Chip>
            ) : undefined
          }
        >
          <SettingsRow
            label="Value type"
            hint="Fixed when the attribute is created"
            className="col-span-2"
          >
            <Chip size="sm" color="default">
              {VALUE_TYPE_LABELS[definition.valueType]}
            </Chip>
          </SettingsRow>

          <SettingsRow
            label="Applies to"
            hint={
              definition.appliesToTypes.length === 0
                ? 'Offered on every reagent type — pick some to narrow it'
                : 'Reagent types that offer this attribute'
            }
            className="col-span-2"
          >
            {isEditingScope ? (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <div
                  className="flex flex-wrap justify-end gap-1.5"
                  role="group"
                  aria-label="Applies to reagent types"
                >
                  <Chip
                    size="xs"
                    behavior="selectable"
                    selected={definition.appliesToTypes.length === 0}
                    disabled={readOnly}
                    onSelect={() => onScopeChange([])}
                  >
                    All types
                  </Chip>
                  {reagentTypeOptions.map(option => {
                    const value = String(option.value);
                    const selected = definition.appliesToTypes.includes(value);
                    return (
                      <Chip
                        key={value}
                        size="xs"
                        behavior="selectable"
                        selected={selected}
                        disabled={readOnly}
                        onSelect={() =>
                          onScopeChange(
                            selected
                              ? definition.appliesToTypes.filter(type => type !== value)
                              : [...definition.appliesToTypes, value]
                          )
                        }
                      >
                        {option.label}
                      </Chip>
                    );
                  })}
                </div>
                <Button variant="ghost" size="xs" onClick={() => setIsEditingScope(false)}>
                  Done
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Tooltip
                  content={
                    definition.appliesToTypes.length > 0
                      ? definition.appliesToTypes.join(', ')
                      : 'Every reagent type, including ones added later'
                  }
                  side="bottom"
                >
                  <span className="font-display text-body-sm text-card-foreground">
                    {reagentTypeOptions.length === 0
                      ? 'No reagent types defined yet'
                      : scopeSummary}
                  </span>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setIsEditingScope(true)}
                  disabled={readOnly || reagentTypeOptions.length === 0}
                >
                  Edit
                </Button>
              </div>
            )}
          </SettingsRow>

          <SettingsRow
            label="Prompt on new items"
            hint="Render the field blank instead of waiting to be added"
            className="col-span-2"
          >
            <Toggle
              checked={definition.promptOnForm}
              onChange={onPromptChange}
              disabled={readOnly}
              size="sm"
              aria-label="Prompt on new items"
            />
          </SettingsRow>

          <SettingsRow label="Delete attribute" hint={deleteHint} className="col-span-2">
            <Button
              variant="ghost-danger"
              size="sm"
              onClick={onDeleteDefinition}
              disabled={readOnly || definition.isSystem || itemsUsingCount > 0}
            >
              Delete
            </Button>
          </SettingsRow>
        </Subsection>
      </div>

      {usesOptions ? (
        <CatalogEntryTable
          entries={options}
          labels={{
            singular: 'option',
            plural: 'options',
            usageHeader: 'Items',
            usageSingular: 'item',
            usagePlural: 'items',
          }}
          ariaLabel={`${definition.name} options`}
          loading={loading}
          onAdd={onAddOption}
          onRename={onRenameOption}
          onDelete={onDeleteOption}
          deletingId={deletingOptionId}
          readOnly={readOnly}
        />
      ) : (
        <p className="pt-2 text-body-sm text-muted-foreground">
          {VALUE_TYPE_LABELS[definition.valueType]} attributes are typed in on the reagent form —
          there is no option list to curate.
        </p>
      )}
    </div>
  );
}
