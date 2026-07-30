/**
 * Attribute Definition Modal
 *
 * Creates a lab-defined reagent attribute. The value type is chosen here and fixed
 * afterwards, since existing values are stored per type.
 */

import { useEffect, useRef, useState } from 'react';

import { Plus, Tags } from 'lucide-react';

import { Button, Chip, Input, Select, SettingsRow, Toggle } from '@shared/ui';
import { FIELD_LABEL_STANDARD } from '@shared/ui/components/inputs/fieldLabelClass';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import type {
  AttributeValueType,
  CreateAttributeDefinitionRequest,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';

const VALUE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'select', label: 'Single choice', description: 'One value from a list you curate' },
  { value: 'multi_select', label: 'Multiple choice', description: 'Any number of listed values' },
  { value: 'text', label: 'Free text', description: 'Typed in per reagent' },
  { value: 'number', label: 'Number', description: 'A numeric value per reagent' },
];

interface AttributeDefinitionModalProps {
  isOpen: boolean;
  reagentTypeOptions: SelectOption[];
  isPending: boolean;
  onClose: () => void;
  onCreate: (data: CreateAttributeDefinitionRequest) => Promise<unknown>;
}

export function AttributeDefinitionModal({
  isOpen,
  reagentTypeOptions,
  isPending,
  onClose,
  onCreate,
}: AttributeDefinitionModalProps) {
  const [name, setName] = useState('');
  const [valueType, setValueType] = useState<AttributeValueType>('select');
  const [appliesToTypes, setAppliesToTypes] = useState<string[]>([]);
  const [promptOnForm, setPromptOnForm] = useState(false);
  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setName('');
      setValueType('select');
      setAppliesToTypes([]);
      setPromptOnForm(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await onCreate({
        name: trimmed,
        valueType,
        appliesToCatalog: 'reagent',
        appliesToTypes,
        promptOnForm,
      });
      notifications.success(`Attribute "${trimmed}" created`);
      onClose();
    } catch {
      // The global handler toasts; the dialog stays open with the typed values.
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title="New Attribute"
      icon={<Tags size={24} />}
      onClose={onClose}
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="attributeName" className={FIELD_LABEL_STANDARD}>
            Attribute Name
          </label>
          <Input
            id="attributeName"
            type="text"
            value={name}
            onValueChange={setName}
            onKeyDown={e => {
              if (e.key === 'Enter' && name.trim() && !isPending) {
                e.preventDefault();
                void handleSave();
              }
            }}
            placeholder="e.g., Fluorophore"
            maxLength={200}
            fullWidth
          />
        </div>

        <div>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
          <label id="attributeValueType" className={FIELD_LABEL_STANDARD}>
            Value Type
          </label>
          <Select
            options={VALUE_TYPE_OPTIONS}
            value={valueType}
            onChange={value => setValueType(value as AttributeValueType)}
            fullWidth
            aria-labelledby="attributeValueType"
          />
        </div>

        <div>
          <span className={FIELD_LABEL_STANDARD}>Applies To</span>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Applies to reagent types"
          >
            {reagentTypeOptions.map(option => {
              const value = String(option.value);
              const selected = appliesToTypes.includes(value);
              return (
                <Chip
                  key={value}
                  size="xs"
                  behavior="selectable"
                  selected={selected}
                  onSelect={() =>
                    setAppliesToTypes(prev =>
                      selected ? prev.filter(type => type !== value) : [...prev, value]
                    )
                  }
                >
                  {option.label}
                </Chip>
              );
            })}
          </div>
          <p className="mt-1 text-caption text-muted-foreground">
            {appliesToTypes.length === 0
              ? 'Offered on every reagent type'
              : `Offered on ${appliesToTypes.length} of ${reagentTypeOptions.length} types`}
          </p>
        </div>

        <SettingsRow
          label="Prompt on new items"
          hint="Render the field blank instead of waiting to be added"
        >
          <Toggle
            checked={promptOnForm}
            onChange={setPromptOnForm}
            size="sm"
            aria-label="Prompt on new items"
          />
        </SettingsRow>

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={!name.trim()}
            isLoading={isPending}
            loadingText="Adding..."
            leftIcon={<Plus size={16} />}
          >
            Add
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
