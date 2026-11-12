import { CONCENTRATION_UNIT_IDS } from '@shared/utils/unitOptions';

import type { FieldDefinition, MaterialItem } from '@odysseus/shared-schemas';

interface MaterialGroup {
  key: string;
  label: string;
  core: readonly FieldDefinition[];
  types: Readonly<Record<string, readonly FieldDefinition[]>>;
}

type FieldExtras = Partial<Omit<FieldDefinition, 'label' | 'kind'>>;

export const fieldKey = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const field = (
  label: string,
  kind: FieldDefinition['kind'] = 'text',
  extras: FieldExtras = {}
): FieldDefinition => ({
  key: fieldKey(label),
  label,
  kind,
  scope: 'protocol',
  unit: '',
  options: [],
  ...extras,
});
const numberField = (label: string, unit = '', extras: FieldExtras = {}) =>
  field(label, 'number', { unit, ...extras });
const dateField = (label: string, extras: FieldExtras = {}) => field(label, 'date', extras);
const choiceField = (label: string, options: string[], extras: FieldExtras = {}) =>
  field(label, 'choice', { options, ...extras });

export const UNIT_PER_ITEM = '*';
export const ANTIBODY_GROUP = 'ab';
const LOT_SCOPED: FieldExtras = { scope: 'lot' };
const YES_NO = ['Yes', 'No'];
const LASERS = [
  'UV 355',
  'Violet 405',
  'Blue 488',
  'Green 532',
  'Yellow-green 561',
  'Red 640',
  'Near-IR 808',
];
export const MOLAR_MASS_UNITS = ['g/mol', 'kDa'];

const stockField = (defaultUnit: string, extras: FieldExtras = {}) =>
  numberField('Stock concentration', UNIT_PER_ITEM, {
    defaultUnit,
    units: CONCENTRATION_UNIT_IDS,
    ...extras,
  });
const finalField = (defaultUnit: string) =>
  numberField('Final concentration', UNIT_PER_ITEM, { defaultUnit, units: CONCENTRATION_UNIT_IDS });
const molarMassField = (defaultUnit: string) =>
  numberField('Molecular weight', UNIT_PER_ITEM, {
    defaultUnit,
    units: defaultUnit === 'kDa' ? ['kDa', 'g/mol'] : MOLAR_MASS_UNITS,
  });

const consent = field('Consent or IRB reference');
const MADE_HERE = [
  field('Recipe'),
  numberField('Volume made', 'mL'),
  dateField('Made on'),
  field('Made by'),
  choiceField('Sterile-filtered', YES_NO),
];
const PHYSICAL_CORE = [
  field('Vendor or source', 'text', { key: 'vendor' }),
  field('Catalog #', 'text', { key: 'catalog' }),
  field('Lot'),
  dateField('Expires', { warnsWhenPast: true }),
  field('Storage'),
  field('Hazard or biosafety', 'text', { key: 'hazard' }),
  field('Notes'),
  stockField('µM'),
  molarMassField('g/mol'),
  ...MADE_HERE,
];
const EQUIPMENT_CORE = [field('Model'), field('Manufacturer'), field('Notes')];
const SOFTWARE_CORE = [field('Source'), field('Notes')];

export const MATERIAL_GROUPS: readonly MaterialGroup[] = [
  {
    key: 'bio',
    label: 'Biological Material',
    core: PHYSICAL_CORE,
    types: {
      'Cell line': [
        field('Species'),
        field('Tissue of origin'),
        field('RRID'),
        field('Genetic modification'),
        field('Medium'),
        field('Culture conditions'),
        dateField('Authentication date'),
        dateField('Mycoplasma test date'),
        numberField('Passage'),
        numberField('Count', 'cells/mL'),
        numberField('Viability', '%'),
      ],
      'Primary cells': [
        field('Species'),
        field('Donor ID'),
        field('Tissue'),
        field('Isolation method'),
        dateField('Collected'),
        dateField('Frozen'),
        numberField('Count', 'cells/mL'),
        numberField('Viability', '%'),
        consent,
      ],
      '3D culture': [
        field('Species'),
        field('Source line or donor'),
        field('Matrix'),
        numberField('Passage'),
        numberField('Days in culture'),
      ],
      Tissue: [
        field('Species'),
        field('Donor or animal ID'),
        field('Tissue'),
        dateField('Collected'),
        choiceField('Preservation', ['Fresh', 'Frozen', 'FFPE']),
        field('Section thickness'),
        consent,
      ],
      'Body fluid': [
        choiceField('Fluid', ['Serum', 'Plasma', 'Whole blood', 'CSF', 'Urine', 'Other']),
        field('Donor ID'),
        field('Anticoagulant'),
        dateField('Collected'),
        numberField('Freeze-thaw count'),
        numberField('Dilution', '1:N'),
        consent,
      ],
      Organism: [
        field('Species'),
        field('Strain'),
        choiceField('Sex', ['Female', 'Male', 'Mixed']),
        field('Age'),
        field('Genotype'),
        field('Animal or cohort ID'),
        field('Protocol number'),
      ],
      'Microbial strain': [
        field('Species'),
        field('Strain'),
        field('Genotype'),
        field('Antibiotic resistance'),
        field('Stock ID'),
        numberField('OD at use'),
      ],
      'Virus or vector': [
        field('Virus type'),
        field('Construct'),
        field('Serotype or pseudotype'),
        numberField('Titer per mL', '', LOT_SCOPED),
        field('Biosafety level'),
      ],
      'Nucleic acid sample': [
        choiceField('Nucleic acid', ['DNA', 'RNA']),
        field('Source sample'),
        stockField('ng/µL'),
        numberField('A260/280'),
        numberField('RIN'),
      ],
      'Protein sample': [field('Source sample'), field('Lysis buffer'), stockField('mg/mL')],
    },
  },
  {
    key: ANTIBODY_GROUP,
    label: 'Antibodies & Stains',
    core: PHYSICAL_CORE,
    types: {
      Antibody: [
        field('Target'),
        field('Clone'),
        field('Host species'),
        field('Reactivity'),
        field('Isotype'),
        field('Conjugate'),
        choiceField('Laser', LASERS),
        stockField('µg/mL', LOT_SCOPED),
        molarMassField('kDa'),
        numberField('Amount', UNIT_PER_ITEM, {
          defaultUnit: '1:N',
          units: ['µL', '1:N', 'µg/mL', 'ng/mL'],
          nameByUnit: { '1:N': 'dilution', µL: 'per test' },
        }),
        field('Application'),
        field('RRID'),
        field('Panel'),
      ],
      'Secondary reagent': [
        field('Host species'),
        field('Target species and isotype'),
        field('Conjugate'),
        choiceField('Cross-adsorbed', YES_NO),
        numberField('Dilution', '1:N'),
        field('Panel'),
      ],
      'Isotype control': [
        field('Isotype'),
        field('Host species'),
        field('Conjugate'),
        stockField('µg/mL'),
        molarMassField('kDa'),
        field('Matched antibody'),
        field('Panel'),
      ],
      Dye: [
        field('Target'),
        choiceField('Fixable', YES_NO),
        choiceField('Laser', LASERS),
        field('Excitation and emission'),
        stockField('µM'),
        numberField('Dilution', '1:N'),
        field('Panel'),
      ],
      Multimer: [
        field('Specificity'),
        field('Conjugate'),
        numberField('Dilution', '1:N'),
        field('Panel'),
      ],
      'Fc block': [field('Species'), numberField('Amount', 'µL')],
      Beads: [
        choiceField('Purpose', ['Compensation', 'Counting', 'Calibration', 'Stimulation']),
        numberField('Beads per µL', '', LOT_SCOPED),
      ],
    },
  },
  {
    key: 'chem',
    label: 'Chemicals & Proteins',
    core: PHYSICAL_CORE,
    types: {
      Chemical: [
        field('CAS number'),
        molarMassField('g/mol'),
        field('Formula'),
        field('Purity'),
        field('Grade'),
      ],
      'Drug or inhibitor': [
        field('Target'),
        field('CAS number'),
        molarMassField('g/mol'),
        stockField('mM'),
        field('Vehicle'),
        finalField('µM'),
      ],
      'Recombinant protein': [
        field('Species'),
        field('Tag'),
        field('Expression host'),
        choiceField('Carrier-free', YES_NO),
        field('Activity', 'text', LOT_SCOPED),
        stockField('µg/mL'),
        molarMassField('kDa'),
        finalField('ng/mL'),
      ],
      Enzyme: [
        field('Activity', 'text', LOT_SCOPED),
        field('Reaction buffer'),
        stockField('mg/mL'),
      ],
      'Antibiotic or selection agent': [
        finalField('µg/mL'),
        choiceField('Purpose', ['Selection', 'Contamination control']),
      ],
      'Transfection reagent': [
        field('Ratio to nucleic acid'),
        numberField('Volume per well', 'µL'),
      ],
      Stimulant: [field('Target or pathway'), finalField('ng/mL'), field('Duration')],
      Peptide: [field('Sequence'), field('Modifications'), field('Purity'), stockField('mM')],
      Standard: [
        numberField('Top concentration', UNIT_PER_ITEM, {
          defaultUnit: 'pg/mL',
          units: ['pg/mL', 'ng/mL', 'µg/mL', 'mM', 'µM', 'nM'],
        }),
        numberField('Reconstitution volume', 'µL'),
      ],
      'Detection reagent': [
        choiceField('Detection', ['Colorimetric', 'Chemiluminescent', 'Fluorescent']),
        field('Read wavelength'),
      ],
      Solvent: [field('Grade'), field('Purity')],
    },
  },
  {
    key: 'media',
    label: 'Media, Buffers, & Solutions',
    core: PHYSICAL_CORE,
    types: {
      Medium: [
        field('Base medium'),
        field('Glucose'),
        field('Glutamine'),
        choiceField('Phenol red', YES_NO),
        ...MADE_HERE,
      ],
      Buffer: [
        field('Strength'),
        choiceField('Calcium and magnesium', ['With', 'Without']),
        numberField('pH'),
        ...MADE_HERE,
      ],
      Supplement: [finalField('%'), choiceField('Heat-inactivated', YES_NO)],
      'Stock solution': [
        stockField('mM'),
        field('Solvent'),
        dateField('Made on'),
        field('Aliquot ID'),
      ],
      'Fix or perm': [field('Fixative or detergent'), stockField('%'), field('Time')],
      'Coating or matrix': [
        field('Matrix'),
        numberField('Protein concentration', 'mg/mL', LOT_SCOPED),
        numberField('Coating concentration', 'µg/mL'),
      ],
      'Mounting medium': [
        choiceField('DAPI', ['With', 'Without']),
        choiceField('Hardening', YES_NO),
      ],
    },
  },
  {
    key: 'kits',
    label: 'Kits & Assays',
    core: PHYSICAL_CORE,
    types: { Kit: [field('Kit version'), field('Components used'), field('Protocol version')] },
  },
  {
    key: 'mol',
    label: 'Molecular Biology',
    core: PHYSICAL_CORE,
    types: {
      Oligo: [
        field('Sequence'),
        field('Target gene'),
        field('Modifications'),
        field('Purification'),
        stockField('µM'),
        field('Tm'),
      ],
      Probe: [field('Sequence'), field('Reporter and quencher'), field('Target')],
      Plasmid: [
        field('Backbone'),
        field('Insert'),
        field('Resistance'),
        field('Repository ID'),
        stockField('ng/µL'),
        choiceField('Sequence verified', YES_NO),
      ],
      'siRNA or guide RNA': [field('Target gene'), field('Sequence'), stockField('µM')],
      'Master mix': [field('Chemistry'), numberField('Volume per reaction', 'µL')],
      Ladder: [field('Size range'), numberField('Amount loaded', 'µL')],
    },
  },
  {
    key: 'supplies',
    label: 'Supplies',
    core: PHYSICAL_CORE,
    types: {
      Plate: [
        choiceField('Format', ['6-well', '12-well', '24-well', '48-well', '96-well', '384-well']),
        choiceField('Surface', ['TC-treated', 'High-binding', 'Low-binding', 'Untreated']),
        choiceField('Color', ['Clear', 'White', 'Black']),
        choiceField('Bottom', ['Flat', 'Round', 'V']),
        choiceField('Sterile', YES_NO),
      ],
      Tube: [
        field('Volume'),
        field('Material'),
        choiceField('Low-binding', YES_NO),
        choiceField('Sterile', YES_NO),
      ],
      'Flask or dish': [field('Size'), field('Surface'), choiceField('Vented', YES_NO)],
      Tips: [
        field('Volume'),
        choiceField('Filtered', YES_NO),
        choiceField('Low-retention', YES_NO),
      ],
      Filter: [field('Pore size'), field('Membrane'), field('Format')],
      'Column or cartridge': [field('Chemistry'), field('Capacity')],
      'Slide or coverslip': [field('Size'), field('Coating'), field('Thickness')],
      Gel: [field('Percentage'), field('Wells'), field('Chemistry')],
      Membrane: [choiceField('Membrane type', ['PVDF', 'Nitrocellulose']), field('Pore size')],
    },
  },
  {
    key: 'equip',
    label: 'Equipment',
    core: EQUIPMENT_CORE,
    types: {
      Instrument: [
        field('Asset or serial ID'),
        field('Location'),
        field('Settings'),
        dateField('Calibration date'),
        field('Software version'),
      ],
    },
  },
  {
    key: 'soft',
    label: 'Software & Data',
    core: SOFTWARE_CORE,
    types: {
      Software: [field('Version'), field('Settings or template file')],
      Dataset: [field('Repository'), field('Accession number'), dateField('Date deposited')],
    },
  },
  { key: 'unsorted', label: 'Unsorted', core: PHYSICAL_CORE, types: {} },
];

const CUSTOM_GROUP_PREFIX = 'custom:';
const GROUP_BY_KEY = new Map(MATERIAL_GROUPS.map(group => [group.key, group]));

export function materialGroup(key: string): MaterialGroup {
  const known = GROUP_BY_KEY.get(key);
  if (known) return known;
  const label = key.startsWith(CUSTOM_GROUP_PREFIX) ? key.slice(CUSTOM_GROUP_PREFIX.length) : key;
  return { key, label, core: PHYSICAL_CORE, types: {} };
}

export const materialGroupsOf = (customGroups: readonly string[]): MaterialGroup[] => [
  ...MATERIAL_GROUPS,
  ...customGroups.map(label => materialGroup(`${CUSTOM_GROUP_PREFIX}${label}`)),
];

export function materialFields(item: MaterialItem): FieldDefinition[] {
  const group = materialGroup(item.group);
  const own = [...(group.types[item.type] ?? []), ...item.customFields];
  const ownKeys = new Set(own.map(definition => definition.key));
  return [...group.core.filter(definition => !ownKeys.has(definition.key)), ...own];
}

export const fieldUnit = (item: MaterialItem, definition: FieldDefinition): string =>
  definition.unit === UNIT_PER_ITEM
    ? (item.units[definition.key] ?? definition.defaultUnit ?? '')
    : definition.unit;

export function fieldLabel(item: MaterialItem, definition: FieldDefinition): string {
  const label =
    item.fieldLabels[definition.key] ??
    definition.nameByUnit?.[fieldUnit(item, definition)] ??
    definition.label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function fieldName(item: MaterialItem, definition: FieldDefinition): string {
  const label =
    item.fieldLabels[definition.key] ??
    definition.nameByUnit?.[fieldUnit(item, definition)] ??
    definition.label;
  return `${item.name.trim()} ${label.toLowerCase()}`;
}

const LABEL_FIELDS = ['vendor', 'catalog', 'model', 'version'];

export const materialLabel = (item: MaterialItem): string =>
  LABEL_FIELDS.filter(key => item.shownFields.includes(key))
    .map(key => (item.values[key] ?? '').trim())
    .filter(Boolean)
    .join(' ');
