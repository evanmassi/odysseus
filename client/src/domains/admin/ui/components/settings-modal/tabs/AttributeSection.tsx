/**
 * Attribute Section
 *
 * The pane behind an attribute leaf: how the field behaves on reagent forms, above the
 * curated option list it offers. Free-text and number attributes have no option list.
 */

import { Chip, ConsolePanel, SettingsRow, Subsection } from '@shared/ui';
import { Button, Select, Toggle } from '@shared/ui/primitives';

import { CatalogEntryTable, type CatalogEntry } from './CatalogEntryTable';

import type { AttributeDefinition, AttributeValueType } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';

const VALUE_TYPE_LABELS: Record<AttributeValueType, string> = {
  select: 'Single choice',
  multi_select: 'Multiple choice',
  text: 'Free text',
  number: 'Number',
};

const ALL_TYPES = '';

interface AttributeSectionProps {
  definition: AttributeDefinition;
  options: CatalogEntry[];
  /** Reagent types this attribute can be scoped to; empty while the lab has defined none. */
  reagentTypeOptions: SelectOption[];
  itemsUsingCount: number;
  loading?: boolean;
  onScopeChange: (appliesToType: string | null) => void;
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
  const usesOptions = definition.valueType === 'select' || definition.valueType === 'multi_select';

  const deleteHint = definition.isSystem
    ? 'Built-in attributes stay available to every lab'
    : itemsUsingCount > 0
      ? `${itemsUsingCount} ${itemsUsingCount === 1 ? 'reagent records' : 'reagents record'} a value for this`
      : 'Removes the attribute and its options';

  return (
    <div className="space-y-2">
      <ConsolePanel intensity="soft">
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
            hint="Reagent types that offer this attribute"
            className="col-span-2"
          >
            <div className="w-48">
              <Select
                options={[{ value: ALL_TYPES, label: 'All reagent types' }, ...reagentTypeOptions]}
                value={definition.appliesToType ?? ALL_TYPES}
                onChange={value => onScopeChange(String(value ?? '') || null)}
                disabled={readOnly}
                size="sm"
                fullWidth
                aria-label="Applies to reagent type"
              />
            </div>
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
      </ConsolePanel>

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
        <ConsolePanel intensity="soft" className="px-4 py-3">
          <p className="text-body-sm text-muted-foreground">
            {VALUE_TYPE_LABELS[definition.valueType]} attributes are typed in on the reagent form —
            there is no option list to curate.
          </p>
        </ConsolePanel>
      )}
    </div>
  );
}
