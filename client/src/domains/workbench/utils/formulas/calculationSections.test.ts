import { calculateBoard, type BoardName, type WorkedOutGroup } from './boardCalculation';
import { calculationSections, sectionNumbers, WHOLE_EXPERIMENT } from './calculationSections';

import type { FormulaBlock, MaterialItem } from '@odysseus/shared-schemas';

const drug = { id: 'm-drug', name: 'Drug X (Sigma)', type: 'Drug or inhibitor' } as MaterialItem;

const prepGroup = (subject: string): WorkedOutGroup => ({
  key: `prep:${subject}`,
  subject,
  title: 'Dilution prep for Plate 1',
  settingsBlockId: 'dilutions',
});

const board: BoardName[] = [
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
  const calculation = calculateBoard(board);

  it('puts the app math under its material, or under the treatment when it has no material', () => {
    const sections = calculationSections(block, [drug], calculation, true);
    expect(sections.map(section => [section.key, section.owner])).toEqual([
      [WHOLE_EXPERIMENT, ''],
      ['m-drug', 'Drug X (Sigma)'],
      ['subject:raji', 'Raji'],
    ]);
    const [, drugSection] = sections;
    expect(drugSection.items.map(item => item.id)).toEqual(['own']);
    expect(drugSection.groups.map(view => view.lines.map(line => line.id))).toEqual([['transfer']]);
  });

  it('leaves the app math off a second Calculations card', () => {
    const sections = calculationSections(block, [drug], calculation, false);
    expect(sections.flatMap(section => section.groups)).toEqual([]);
  });

  it('lists the numbers on the board for a section, plain numbers first, without the one being edited', () => {
    const [, drugSection] = calculationSections(block, [drug], calculation, true);
    expect(sectionNumbers(drugSection, [drug], calculation, 'own')).toEqual([
      { name: 'Drug X (Sigma) stock concentration', label: 'Stock concentration', text: '10 µM' },
      { name: 'Drug X volume added', label: 'Volume added', text: '20 µL' },
      { name: 'Drug X transfer', label: 'Transfer', text: '40 µL' },
    ]);
  });
});
