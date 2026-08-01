/**
 * Attribute Fields
 *
 * The lab's attributes on an item form: add-on-demand from a palette scoped to the chosen item
 * type, plus any the lab promoted to always-prompt. A value already set stays rendered even if
 * the type no longer scopes it, so changing the type never drops data. A catalog with no type
 * discriminator passes none, and sees the attributes scoped to every type.
 */

import { useMemo, useState } from 'react';

import { Plus, X } from 'lucide-react';

import { Chip, Select, withPlaceholder } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { Input } from '@shared/ui/primitives';

import {
  EMPTY_DRAFT,
  isDraftPopulated,
  type AttributeDrafts,
  type AttributeValueDraft,
} from './attributeDrafts';
import { appliesToType } from './attributeScope';

import type { AttributeDefinition, AttributeOption } from '@odysseus/shared-schemas';

interface AttributeFieldsProps {
  definitions: AttributeDefinition[];
  options: AttributeOption[];
  drafts: AttributeDrafts;
  /** The form's current item type; scopes which attributes the palette offers. */
  itemType?: string;
  onChange: (definitionId: string, draft: AttributeValueDraft) => void;
  onRemove: (definitionId: string) => void;
}

export function AttributeFields({
  definitions,
  options,
  drafts,
  itemType,
  onChange,
  onRemove,
}: AttributeFieldsProps) {
  const [added, setAdded] = useState<string[]>([]);

  const optionsByDefinition = useMemo(() => {
    const map = new Map<string, AttributeOption[]>();
    options.forEach(option => {
      map.set(option.definitionId, [...(map.get(option.definitionId) ?? []), option]);
    });
    return map;
  }, [options]);

  const sorted = useMemo(
    () =>
      [...definitions].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [definitions]
  );

  const shown = sorted.filter(
    definition =>
      added.includes(definition.id) ||
      isDraftPopulated(drafts[definition.id] ?? EMPTY_DRAFT) ||
      (definition.promptOnForm && appliesToType(definition, itemType))
  );

  const paletteOptions = useMemo(
    () =>
      withPlaceholder(
        '+ Add attribute',
        sorted
          .filter(
            definition =>
              appliesToType(definition, itemType) &&
              !shown.some(visible => visible.id === definition.id)
          )
          .map(definition => ({ value: definition.id, label: definition.name }))
      ),
    [sorted, itemType, shown]
  );

  const renderControl = (definition: AttributeDefinition) => {
    const draft = drafts[definition.id] ?? EMPTY_DRAFT;
    const definitionOptions = optionsByDefinition.get(definition.id) ?? [];

    if (definition.valueType === 'multi_select') {
      return (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={definition.name}>
          {definitionOptions.length === 0 ? (
            <span className="text-caption text-muted-foreground">
              No options defined — add them in Admin › Catalog
            </span>
          ) : (
            definitionOptions.map(option => (
              <Chip
                key={option.id}
                size="xs"
                behavior="selectable"
                selected={draft.optionIds.includes(option.id)}
                onSelect={() =>
                  onChange(definition.id, {
                    ...draft,
                    optionIds: draft.optionIds.includes(option.id)
                      ? draft.optionIds.filter(id => id !== option.id)
                      : [...draft.optionIds, option.id],
                  })
                }
              >
                {option.value}
              </Chip>
            ))
          )}
        </div>
      );
    }

    if (definition.valueType === 'select') {
      return (
        <Select
          options={withPlaceholder(
            'Select...',
            definitionOptions.map(option => ({ value: option.id, label: option.value }))
          )}
          value={draft.optionIds[0] ?? ''}
          onChange={value =>
            onChange(definition.id, { ...draft, optionIds: value ? [String(value)] : [] })
          }
          size="sm"
          fullWidth
          aria-label={definition.name}
        />
      );
    }

    if (definition.valueType === 'number') {
      return (
        <Input
          type="number"
          value={draft.number ?? ''}
          onValueChange={value =>
            onChange(definition.id, {
              ...draft,
              number: value === '' ? undefined : Number(value),
            })
          }
          size="sm"
          fullWidth
          aria-label={definition.name}
        />
      );
    }

    return (
      <Input
        type="text"
        value={draft.text ?? ''}
        onValueChange={value => onChange(definition.id, { ...draft, text: value })}
        size="sm"
        fullWidth
        aria-label={definition.name}
      />
    );
  };

  const removeAttribute = (definitionId: string) => {
    setAdded(prev => prev.filter(id => id !== definitionId));
    onRemove(definitionId);
  };

  return (
    <div className="space-y-2.5">
      {shown.map(definition => (
        <div key={definition.id}>
          <div className="flex items-baseline justify-between gap-2">
            <span className={FIELD_LABEL_COMPACT}>{definition.name}</span>
            {!definition.promptOnForm && (
              <button
                type="button"
                onClick={() => removeAttribute(definition.id)}
                className="p-0.5 text-muted-foreground hover:text-danger-text"
                aria-label={`Remove ${definition.name}`}
              >
                <X size={12} />
              </button>
            )}
          </div>
          {renderControl(definition)}
        </div>
      ))}

      {paletteOptions.length > 1 ? (
        <div className="flex items-center gap-2">
          <Plus size={12} className="flex-shrink-0 text-muted-foreground" />
          <Select
            options={paletteOptions}
            value=""
            onChange={value => {
              const definitionId = String(value ?? '');
              if (definitionId) setAdded(prev => [...prev, definitionId]);
            }}
            size="sm"
            fullWidth
            aria-label="Add attribute"
          />
        </div>
      ) : (
        shown.length === 0 && (
          <p className="text-caption text-muted-foreground">
            No attributes apply here yet — the lab defines them in Admin › Catalog.
          </p>
        )
      )}
    </div>
  );
}
