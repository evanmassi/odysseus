/**
 * Seeded System Attributes
 *
 * The attribute palette every lab starts with. Labs may extend, reorder and rename these, but not
 * delete them; code that needs one (the hazard badge) resolves it by `systemKey`, never by name.
 */

import type { AttributeCatalog, AttributeValueType } from '@odysseus/shared-schemas';

interface SystemAttributeSeed {
  systemKey: string;
  name: string;
  valueType: AttributeValueType;
  appliesToCatalog: AttributeCatalog;
  sortOrder: number;
  options: string[];
}

export const SYSTEM_ATTRIBUTE_SEEDS: SystemAttributeSeed[] = [
  {
    systemKey: 'hazard_class',
    name: 'Hazard Class',
    valueType: 'multi_select',
    appliesToCatalog: 'reagent',
    sortOrder: 1,
    options: [
      'Explosive',
      'Flammable',
      'Oxidizing',
      'Compressed Gas',
      'Corrosive',
      'Acute Toxicity',
      'Irritant',
      'Health Hazard',
      'Environmental Hazard',
    ],
  },
  {
    systemKey: 'physical_form',
    name: 'Physical Form',
    valueType: 'select',
    appliesToCatalog: 'reagent',
    sortOrder: 2,
    options: ['Liquid', 'Powder', 'Lyophilized', 'Solution', 'Suspension', 'Gas'],
  },
  {
    systemKey: 'grade',
    name: 'Grade',
    valueType: 'select',
    appliesToCatalog: 'reagent',
    sortOrder: 3,
    options: ['ACS', 'Reagent', 'HPLC', 'Molecular Biology', 'Cell Culture', 'Technical'],
  },
  {
    systemKey: 'storage_conditions',
    name: 'Storage Conditions',
    valueType: 'select',
    appliesToCatalog: 'reagent',
    sortOrder: 4,
    options: ['−80 °C', '−20 °C', '4 °C', 'Room Temperature', 'Desiccated', 'Protect from Light'],
  },
];
