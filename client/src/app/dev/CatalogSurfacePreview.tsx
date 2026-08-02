/**
 * Catalog Surface Preview (Dev Only)
 *
 * The admin catalog rail beside every pane it opens, on fixtures that edit in local state.
 */

import { useMemo, useState } from 'react';

import { Plus, ShieldUser } from 'lucide-react';

// Dev-only preview: reaches domain internals directly, bypassing the public barrels.
import { AttributeDefinitionModal } from '@domains/admin/ui/components/settings-modal/tabs/AttributeDefinitionModal';
import { AttributeSection } from '@domains/admin/ui/components/settings-modal/tabs/AttributeSection';
import {
  CatalogEntryTable,
  type CatalogEntry,
} from '@domains/admin/ui/components/settings-modal/tabs/CatalogEntryTable';
import {
  CatalogRail,
  type CatalogLeaf,
} from '@domains/admin/ui/components/settings-modal/tabs/CatalogRail';
import {
  CustomUnitSection,
  type CustomUnitEntry,
} from '@domains/admin/ui/components/settings-modal/tabs/CustomUnitSection';
import { Button, SectionHeader } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';

import type { AttributeDefinition } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';

const FIXTURE_DATE = new Date('2026-07-01T00:00:00.000Z');

const LOOKUP_GROUP = 'Dropdown Lists';
const ATTRIBUTE_GROUP = 'Item Attributes';
const UNIT_GROUP = 'Units';

const REAGENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Antibody', label: 'Antibody' },
  { value: 'Buffer', label: 'Buffer' },
  { value: 'Enzyme', label: 'Enzyme' },
  { value: 'Stain', label: 'Stain' },
];

const LOOKUP_FIXTURE: CatalogEntry[] = [
  { id: 'lkp-1', value: 'Antibody', usageCount: 4 },
  { id: 'lkp-2', value: 'Buffer', usageCount: 0 },
  { id: 'lkp-3', value: 'Enzyme', usageCount: 2 },
  { id: 'lkp-4', value: 'Stain', usageCount: 0 },
];

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

const DEFINITION_FIXTURES: AttributeDefinition[] = [
  definition('adef-hazard', 'Hazard Class', 'multi_select', {
    isSystem: true,
    systemKey: 'hazard_class',
    sortOrder: 1,
  }),
  definition('adef-fluor', 'Fluorophore', 'select', { appliesToTypes: ['Antibody'] }),
  definition('adef-clone', 'Clone', 'text', { appliesToTypes: ['Antibody'] }),
  definition('adef-form', 'Physical Form', 'select', {
    isSystem: true,
    systemKey: 'physical_form',
    sortOrder: 2,
    promptOnForm: true,
  }),
];

const OPTION_FIXTURES: Record<string, CatalogEntry[]> = {
  'adef-hazard': [
    { id: 'aopt-1', value: 'Flammable', usageCount: 3 },
    { id: 'aopt-2', value: 'Corrosive', usageCount: 1 },
    { id: 'aopt-3', value: 'Acute Toxicity', usageCount: 0 },
    { id: 'aopt-4', value: 'Health Hazard', usageCount: 0 },
  ],
  'adef-fluor': [
    { id: 'aopt-5', value: 'FITC', usageCount: 6 },
    { id: 'aopt-6', value: 'PE', usageCount: 4 },
    { id: 'aopt-7', value: 'APC', usageCount: 2 },
    { id: 'aopt-8', value: 'BV421', usageCount: 0 },
  ],
  'adef-clone': [],
  'adef-form': [
    { id: 'aopt-9', value: 'Liquid', usageCount: 5 },
    { id: 'aopt-10', value: 'Powder', usageCount: 1 },
    { id: 'aopt-11', value: 'Lyophilized', usageCount: 0 },
  ],
};

const UNIT_FIXTURES: CustomUnitEntry[] = [
  { id: 'rcun-1', value: 'beads/50 µL', usageCount: 2, kind: 'count-conc' },
  { id: 'rcun-2', value: 'rxn', usageCount: 0, kind: 'count' },
];

const LOOKUP_LEAVES: Array<{ id: string; title: string; count: number; usedBy?: string[] }> = [
  { id: 'lookup:equipment_maintenance_type', title: 'Maintenance Activities', count: 2 },
  {
    id: 'lookup:manufacturer',
    title: 'Manufacturers',
    count: 5,
    usedBy: ['Supplies', 'Reagents', 'Equipment'],
  },
  { id: 'lookup:media', title: 'Media Types', count: 2 },
  { id: 'lookup:reagent_type', title: 'Reagent Types', count: 4 },
  { id: 'lookup:source', title: 'Sources', count: 2 },
  { id: 'lookup:species', title: 'Species', count: 2 },
  { id: 'lookup:specimen_type', title: 'Specimens', count: 2 },
  {
    id: 'lookup:vendor',
    title: 'Vendors',
    count: 3,
    usedBy: ['Supplies', 'Reagents', 'Equipment'],
  },
];

const ITEMS_USING_FIXTURE: Record<string, number> = { 'adef-fluor': 12 };

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-preview-${++idCounter}`;

export function CatalogSurfacePreview({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState('lookup:reagent_type');
  const [definitions, setDefinitions] = useState(DEFINITION_FIXTURES);
  const [options, setOptions] = useState(OPTION_FIXTURES);
  const [lookupValues, setLookupValues] = useState(LOOKUP_FIXTURE);
  const [units, setUnits] = useState(UNIT_FIXTURES);
  const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);

  const leaves = useMemo<CatalogLeaf[]>(
    () => [
      ...LOOKUP_LEAVES.map(leaf => ({ ...leaf, group: LOOKUP_GROUP })),
      ...[...definitions]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(def => ({
          id: `attr:${def.id}`,
          title: def.name,
          group: ATTRIBUTE_GROUP,
          count:
            def.valueType === 'select' || def.valueType === 'multi_select'
              ? (options[def.id]?.length ?? 0)
              : undefined,
        })),
      { id: 'units', title: 'Custom Units', group: UNIT_GROUP, count: units.length },
    ],
    [definitions, options, units]
  );

  const activeDefinition = definitions.find(def => `attr:${def.id}` === selected);

  const patchDefinition = (id: string, patch: Partial<AttributeDefinition>) =>
    setDefinitions(prev => prev.map(def => (def.id === id ? { ...def, ...patch } : def)));

  const patchOptions = (
    definitionId: string,
    update: (entries: CatalogEntry[]) => CatalogEntry[]
  ) => setOptions(prev => ({ ...prev, [definitionId]: update(prev[definitionId] ?? []) }));

  return (
    <BaseModal
      isOpen
      icon={<ShieldUser size={24} />}
      title="Admin Settings"
      subtitle="Catalog — preview fixtures"
      size="xl"
      className="h-[85vh]"
      onClose={onClose}
    >
      <SectionHeader
        title="Catalog"
        size="lg"
        rightMeta={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setIsDefinitionModalOpen(true)}
          >
            New attribute
          </Button>
        }
      />

      <div className="flex min-h-0 gap-4">
        <CatalogRail leaves={leaves} selected={selected} onSelect={setSelected} />

        <div className="min-w-0 flex-1">
          {activeDefinition && (
            <AttributeSection
              key={activeDefinition.id}
              definition={activeDefinition}
              options={options[activeDefinition.id] ?? []}
              reagentTypeOptions={REAGENT_TYPE_OPTIONS}
              itemsUsingCount={ITEMS_USING_FIXTURE[activeDefinition.id] ?? 0}
              onScopeChange={appliesToTypes =>
                patchDefinition(activeDefinition.id, { appliesToTypes })
              }
              onPromptChange={promptOnForm =>
                patchDefinition(activeDefinition.id, { promptOnForm })
              }
              onDeleteDefinition={() => {
                setDefinitions(prev => prev.filter(def => def.id !== activeDefinition.id));
                setSelected('units');
              }}
              onAddOption={async value => {
                patchOptions(activeDefinition.id, entries => [
                  ...entries,
                  { id: nextId('aopt'), value, usageCount: 0 },
                ]);
              }}
              onRenameOption={(id, value) =>
                patchOptions(activeDefinition.id, entries =>
                  entries.map(entry => (entry.id === id ? { ...entry, value } : entry))
                )
              }
              onDeleteOption={id =>
                patchOptions(activeDefinition.id, entries =>
                  entries.filter(entry => entry.id !== id)
                )
              }
            />
          )}

          {selected === 'units' && (
            <CustomUnitSection
              entries={units}
              onAdd={async (value, kind) =>
                setUnits(prev => [...prev, { id: nextId('rcun'), value, kind, usageCount: 0 }])
              }
              onRename={(id, value) =>
                setUnits(prev => prev.map(unit => (unit.id === id ? { ...unit, value } : unit)))
              }
              onKindChange={(id, kind) =>
                setUnits(prev => prev.map(unit => (unit.id === id ? { ...unit, kind } : unit)))
              }
              onDelete={id => setUnits(prev => prev.filter(unit => unit.id !== id))}
            />
          )}

          {selected.startsWith('lookup:') && (
            <CatalogEntryTable
              entries={lookupValues}
              labels={{
                singular: 'entry',
                plural: 'entries',
                usageHeader: 'Uses',
                usageSingular: 'record',
                usagePlural: 'records',
              }}
              ariaLabel="Lookup entries list"
              onAdd={async value =>
                setLookupValues(prev => [...prev, { id: nextId('lkp'), value, usageCount: 0 }])
              }
              onRename={(id, value) =>
                setLookupValues(prev =>
                  prev.map(entry => (entry.id === id ? { ...entry, value } : entry))
                )
              }
              onDelete={id => setLookupValues(prev => prev.filter(entry => entry.id !== id))}
            />
          )}
        </div>
      </div>

      <AttributeDefinitionModal
        isOpen={isDefinitionModalOpen}
        reagentTypeOptions={REAGENT_TYPE_OPTIONS}
        isPending={false}
        onClose={() => setIsDefinitionModalOpen(false)}
        onCreate={async data => {
          const id = nextId('adef');
          setDefinitions(prev => [
            ...prev,
            definition(id, data.name, data.valueType, {
              appliesToTypes: data.appliesToTypes ?? [],
              promptOnForm: data.promptOnForm ?? false,
            }),
          ]);
          setOptions(prev => ({ ...prev, [id]: [] }));
          setSelected(`attr:${id}`);
        }}
      />
    </BaseModal>
  );
}
