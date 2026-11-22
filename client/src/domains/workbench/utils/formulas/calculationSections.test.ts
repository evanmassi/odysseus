import { calculateBoard, type BoardName, type WorkedOutGroup } from './boardCalculation';
import { calculationLayout, calculationSections, WHOLE_EXPERIMENT } from './calculationSections';

import type { FormulaBlock, MaterialItem } from '@odysseus/shared-schemas';

const drug = {
  id: 'm-drug',
  name: 'Drug X (Sigma)',
  type: 'Drug or inhibitor',
  shownFields: [],
  values: {},
} as unknown as MaterialItem;

const prepGroup = (subject: string): WorkedOutGroup => ({
  key: `prep:${subject}`,
  subject,
  title: 'Dilution prep for Plate 1',
  settingsBlockId: 'dilutions',
});

const names: BoardName[] = [
  {
    kind: 'value',
    id: 'stock',
    name: 'Drug X (Sigma) stock concentration',
    value: '10',
    unit: 'µM',
  },
  {
    kind: 'value',
    id: 'added',
    name: 'Drug X volume added',
    value: '20',
    unit: 'µL',
    workedOut: prepGroup('Drug X'),
  },
  {
    kind: 'formula',
    id: 'transfer',
    name: 'Drug X transfer',
    expr: 'Drug X volume added × 2',
    unit: '',
    workedOut: prepGroup('Drug X'),
  },
  {
    kind: 'formula',
    id: 'raji',
    name: 'Raji transfer',
    expr: '5 µL',
    unit: '',
    workedOut: prepGroup('Raji'),
  },
  { kind: 'formula', id: 'own', name: 'Drug X (Sigma) needed', expr: '2 µL', unit: '' },
];

const block = {
  id: 'calc',
  type: 'formula',
  items: [{ id: 'own', name: 'Drug X (Sigma) needed', expr: '2 µL', unit: '' }],
  materialSections: [],
} as unknown as FormulaBlock;

describe('calculation sections', () => {
  const board = calculateBoard(names);

  it('puts the app math under its material, or under the treatment when it has no material', () => {
    const sections = calculationSections(block, [drug], board, true, 'Whole experiment');
    expect(sections.map(section => [section.key, section.owner])).toEqual([
      [WHOLE_EXPERIMENT, ''],
      ['m-drug', 'Drug X (Sigma)'],
      ['subject:raji', 'Raji'],
    ]);
    const [, drugSection] = sections;
    expect(drugSection.items.map(item => item.id)).toEqual(['own']);
    expect(drugSection.groups.map(view => view.lines.map(line => line.id))).toEqual([['transfer']]);
  });

  it('titles the whole-experiment section with the name the Values card gives it', () => {
    const sections = calculationSections(block, [drug], board, true, 'Bench setup');
    expect(sections.map(section => section.title)).toEqual([
      'Bench setup',
      'Drug X (Sigma)',
      'Raji',
    ]);
  });

  it('leaves the app math off a second Calculations card', () => {
    const sections = calculationSections(block, [drug], board, false, 'Whole experiment');
    expect(sections.flatMap(section => section.groups)).toEqual([]);
  });

  it('lays a group repeated across treatments out as one table and gathers what is missing', () => {
    const withGaps = calculateBoard([
      ...names,
      {
        kind: 'formula',
        id: 'raji-gap',
        name: 'Raji volume',
        expr: '',
        unit: '',
        problem: 'Needs a stain step',
        workedOut: { ...prepGroup('Raji'), key: 'stain:raji', title: 'Amount per well' },
      },
    ]);
    const sections = calculationSections(block, [drug], withGaps, true, 'Whole experiment');
    const { parts, missing } = calculationLayout(sections, withGaps, []);
    expect(missing).toEqual([{ message: 'Needs a stain step', subjects: ['Raji'] }]);
    expect(parts.map(part => part.kind)).toEqual(['table', 'section']);
    const [table, drugPart] = parts;
    expect(table.kind === 'table' && table.table).toMatchObject({
      title: 'Dilution prep for Plate 1',
      columns: ['Transfer'],
      rows: [
        { label: 'Drug X (Sigma)', lines: [{ id: 'transfer' }] },
        { label: 'Raji', lines: [{ id: 'raji' }] },
      ],
    });
    expect(drugPart.kind === 'section' && drugPart.section).toMatchObject({
      key: 'm-drug',
      groups: [],
    });
  });
});
