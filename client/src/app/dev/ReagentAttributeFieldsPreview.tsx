/**
 * Reagent Attribute Fields Preview (Dev Only)
 *
 * The reagent form's Attributes section on fixtures: all four value types, a prompted
 * attribute, and a type-scoped palette driven by the Type picker above it.
 */

import { useState } from 'react';

import { Biohazard } from 'lucide-react';

// Dev-only preview: reaches domain internals directly, bypassing the public barrels.
import { SectionHeader, Select, withPlaceholder } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { AttributeFields } from '@shared/ui/components/inventory';
import { BaseModal } from '@shared/ui/components/overlays';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';

import type { AttributeDefinition, AttributeOption } from '@odysseus/shared-schemas';
import type { AttributeDrafts } from '@shared/ui/components/inventory';

const FIXTURE_DATE = new Date('2026-07-01T00:00:00.000Z');

const REAGENT_TYPES = withPlaceholder('Select...', [
  { value: 'Antibody', label: 'Antibody' },
  { value: 'Buffer', label: 'Buffer' },
]);

function definition(
  id: string,
  name: string,
  valueType: AttributeDefinition['valueType'],
  overrides: Partial<AttributeDefinition> = {}
): AttributeDefinition {
  return {
    id,
    labId: 'lab_preview',
    name,
    valueType,
    appliesToCatalog: 'reagent',
    appliesToTypes: [],
    sortOrder: 0,
    isSystem: false,
    systemKey: null,
    promptOnForm: false,
    createdAt: FIXTURE_DATE,
    updatedAt: FIXTURE_DATE,
    ...overrides,
  };
}

const DEFINITIONS: AttributeDefinition[] = [
  definition('adef-hazard', 'Hazard Class', 'multi_select', { isSystem: true, sortOrder: 1 }),
  definition('adef-form', 'Physical Form', 'select', {
    isSystem: true,
    sortOrder: 2,
    promptOnForm: true,
  }),
  definition('adef-storage', 'Storage Conditions', 'select', { isSystem: true, sortOrder: 4 }),
  definition('adef-fluor', 'Fluorophore', 'select', { appliesToTypes: ['Antibody'], sortOrder: 5 }),
  definition('adef-clone', 'Clone', 'text', { appliesToTypes: ['Antibody'], sortOrder: 6 }),
  definition('adef-dilution', 'Working Dilution', 'number', {
    appliesToTypes: ['Antibody'],
    sortOrder: 7,
  }),
];

const option = (id: string, definitionId: string, value: string, sortOrder: number) =>
  ({ id, definitionId, value, sortOrder }) as AttributeOption;

const OPTIONS: AttributeOption[] = [
  option('aopt-1', 'adef-hazard', 'Flammable', 1),
  option('aopt-2', 'adef-hazard', 'Corrosive', 2),
  option('aopt-3', 'adef-hazard', 'Acute Toxicity', 3),
  option('aopt-4', 'adef-hazard', 'Health Hazard', 4),
  option('aopt-5', 'adef-form', 'Liquid', 1),
  option('aopt-6', 'adef-form', 'Powder', 2),
  option('aopt-7', 'adef-form', 'Lyophilized', 3),
  option('aopt-8', 'adef-storage', '−20 °C', 1),
  option('aopt-9', 'adef-storage', '4 °C', 2),
  option('aopt-10', 'adef-storage', 'Room Temperature', 3),
  option('aopt-11', 'adef-fluor', 'FITC', 1),
  option('aopt-12', 'adef-fluor', 'PE', 2),
  option('aopt-13', 'adef-fluor', 'APC', 3),
];

export function ReagentAttributeFieldsPreview({ onClose }: { onClose: () => void }) {
  const [reagentType, setReagentType] = useState('Antibody');
  const [drafts, setDrafts] = useState<AttributeDrafts>({
    'adef-hazard': { optionIds: ['aopt-1'] },
    'adef-fluor': { optionIds: ['aopt-11'] },
  });

  return (
    <BaseModal
      isOpen
      icon={<Biohazard size={24} />}
      title="Add Reagent"
      subtitle="Attributes section — preview fixtures"
      size="md"
      onClose={onClose}
    >
      <ConsolePanel intensity="soft" className="space-y-2 p-4">
        <SectionHeader title="Chemistry" size="sm" />
        <div>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
          <label id="preview-reagent-type" className={FIELD_LABEL_COMPACT}>
            Type
          </label>
          <Select
            options={REAGENT_TYPES}
            value={reagentType}
            onChange={value => setReagentType(String(value ?? ''))}
            fullWidth
            aria-labelledby="preview-reagent-type"
          />
          <p className="mt-1 text-caption text-muted-foreground">
            Switch to Buffer — the antibody-only attributes leave the palette, but values already
            set stay put.
          </p>
        </div>

        <div className="!mt-3.5">
          <SectionHeader title="Attributes" size="sm" />
        </div>
        <AttributeFields
          definitions={DEFINITIONS}
          options={OPTIONS}
          drafts={drafts}
          itemType={reagentType}
          onChange={(definitionId, draft) =>
            setDrafts(prev => ({ ...prev, [definitionId]: draft }))
          }
          onRemove={definitionId =>
            setDrafts(prev => {
              const next = { ...prev };
              delete next[definitionId];
              return next;
            })
          }
        />
      </ConsolePanel>
    </BaseModal>
  );
}
