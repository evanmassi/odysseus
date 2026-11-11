import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';

import { calculateBoard } from './boardCalculation';
import { insertListGroups } from './insertListGroups';

const material = (name: string, type: string) =>
  materialFromGuess(
    { group: 'chem', type, name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );

const drug = material('Drug X', 'Compound');
const pbs = material('PBS', 'Buffer');
const item = (id: string, name: string) =>
  ({ kind: 'item', id, name, groupTitle: 'Chemicals', hint: '', label: '' }) as const;

const calculation = calculateBoard([
  item(drug.id, 'Drug X'),
  item(pbs.id, 'PBS'),
  { kind: 'value', id: 'v1', name: 'Drug X stock concentration', value: '10', unit: 'mM' },
  {
    kind: 'formula',
    id: 'f1',
    name: 'Drug X stock to take',
    expr: '2 µL',
    unit: '',
    workedOut: {
      key: 'run',
      subject: 'Drug X',
      title: 'Dilution prep',
      settingsBlockId: undefined,
    },
  },
  { kind: 'count', id: 'c1', name: 'Drug X wells', count: 24 },
  { kind: 'value', id: 'v2', name: 'Total volume', value: '9.6', unit: 'mL' },
]);

const outline = (isForFormula: boolean) =>
  insertListGroups(calculation, [drug, pbs], [], isForFormula).map(group => ({
    title: group.title,
    kind: group.kind,
    headingName: group.headingName,
    rows: group.rows.map(row => row.label),
  }));

describe('insertListGroups', () => {
  it('lists each material with its own numbers first, then worked-out lines, then the whole experiment', () => {
    expect(outline(false)).toEqual([
      {
        title: 'Drug X',
        kind: 'Compound',
        headingName: 'Drug X',
        rows: ['Stock concentration', 'Wells', 'Stock to take'],
      },
      { title: 'PBS', kind: 'Buffer', headingName: 'PBS', rows: [] },
      { title: 'Whole experiment', kind: '', headingName: undefined, rows: ['Total volume'] },
    ]);
  });

  it('leaves materials out of a formula, keeping only their numbers', () => {
    expect(outline(true).map(group => [group.title, group.headingName])).toEqual([
      ['Drug X', undefined],
      ['Whole experiment', undefined],
    ]);
  });
});
