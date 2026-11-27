import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';
import { boardKind } from '../terms/savedTerms';
import { termOfName } from '../terms/termLookup';
import { GENERAL } from '../values/valueNames';

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

const board = calculateBoard([
  item(drug.id, 'Drug X'),
  item(pbs.id, 'PBS'),
  { kind: 'value', id: 'v1', name: 'Drug X stock concentration', value: '10', unit: 'mM' },
  {
    kind: 'calculation',
    id: 'f1',
    name: 'Drug X stock to take',
    formula: '2 µL',
    unit: '',
    workedOut: {
      key: 'run',
      subject: 'Drug X',
      title: 'Dilution prep',
      settings: { type: 'dilutions' },
    },
  },
  { kind: 'count', id: 'c1', name: 'Drug X wells', count: 24 },
  { kind: 'value', id: 'v2', name: 'Total volume', value: '9.6', unit: 'mL' },
  {
    kind: 'value',
    id: 'v3',
    name: 'Total well vol.',
    value: '80',
    unit: 'µL',
    kindOf: boardKind(termOfName('Total well vol.', 'µL'), GENERAL),
  },
]);

const outline = (isForFormula: boolean) =>
  insertListGroups(board, [drug, pbs], [], isForFormula, 'ASSAY SETUP').map(group => ({
    title: group.title,
    kind: group.kind,
    headingName: group.headingName,
    rows: group.rows.map(row => row.label),
  }));

describe('insertListGroups', () => {
  it('lists each material with its own numbers first, then worked-out lines, then Assay setup, then unsorted values', () => {
    expect(outline(false)).toEqual([
      {
        title: 'Drug X',
        kind: 'Compound',
        headingName: 'Drug X',
        rows: ['Stock concentration', 'Wells', 'Stock to take'],
      },
      { title: 'PBS', kind: 'Buffer', headingName: 'PBS', rows: [] },
      { title: 'ASSAY SETUP', kind: '', headingName: undefined, rows: ['Total well vol.'] },
      { title: 'Unsorted', kind: '', headingName: undefined, rows: ['Total volume'] },
    ]);
  });

  it('leaves materials out of a formula, keeping only their numbers', () => {
    expect(outline(true).map(group => [group.title, group.headingName])).toEqual([
      ['Drug X', undefined],
      ['ASSAY SETUP', undefined],
      ['Unsorted', undefined],
    ]);
  });
});
