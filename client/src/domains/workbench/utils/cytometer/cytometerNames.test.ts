import { calculateBoard, formulaAnswerText, nameKey } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';

import type { CytometerBlock, Protocol, ProtocolBlock } from '@odysseus/shared-schemas';

const antibody = (name: string) =>
  materialFromGuess(
    { group: 'ab', type: 'Antibody', name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );

const cd3 = antibody('CD3 BV421');
const cd4 = antibody('CD4 FITC');

const placement = { page: 'page', x: 0, y: 0, w: 12, h: 10, isCollapsed: false };

const panel: CytometerBlock = {
  ...placement,
  id: 'panel',
  type: 'cytometer',
  title: 'Flow panel',
  rows: [
    { id: 'cd3', materialId: cd3.id, detectorId: 'VL1', stain: 'Surface', dilution: '100' },
    { id: 'cd4', materialId: cd4.id, detectorId: 'BL1', stain: 'Surface', dilution: '200' },
  ],
  mixes: [
    { id: 'full', name: 'Full stain', rowIds: ['cd3', 'cd4'], plus: [] },
    { id: 'fmo', name: 'FMO CD3', rowIds: ['cd4'], plus: [] },
  ],
};

const plate: ProtocolBlock = {
  ...placement,
  id: 'plate',
  type: 'plate',
  title: 'Vessel map',
  plates: [{ id: 'p1', vessel: '96', name: '' }],
  sets: [],
  activeTab: 0,
  lines: [
    {
      id: 'stain',
      name: '',
      role: 'auto',
      values: [
        { id: 'full', text: 'Full stain' },
        { id: 'fmo', text: 'FMO CD3' },
      ],
    },
  ],
  cells: {
    'p1:A1': { stain: { valueId: 'full' } },
    'p1:A2': { stain: { valueId: 'full' } },
    'p1:A3': { stain: { valueId: 'fmo' } },
  },
  series: {},
  mergesReplicates: true,
  counts: {},
  amountNames: {},
};

const protocol = (extra: ProtocolBlock[] = []): Protocol => ({
  title: 'Panel',
  descriptor: '',
  runNumber: '',
  runOn: { from: '', to: '' },
  pages: [{ id: 'page', name: 'Flow', steps: [] }],
  blocks: [
    {
      ...placement,
      id: 'materials',
      type: 'materials',
      title: 'Materials',
      foldedGroups: [],
      customGroups: [],
      isDroppedOpen: false,
      items: [cd3, cd4],
    },
    panel,
    plate,
    ...extra,
  ],
  lotMemory: {},
  keptBoth: [],
  ignoredReadings: [],
});

const answer = (calculation: ReturnType<typeof calculateBoard>, name: string) => {
  const entry = calculation.names.get(nameKey(name));
  const result = entry && calculation.results.get(entry.id);
  return result?.status === 'ok' ? formulaAnswerText(result) : result?.status;
};

describe('flow panel names', () => {
  it('gives each stain a dilution factor and each cocktail its wells and antibody share', () => {
    const calculation = calculateBoard(collectBoardNames(protocol()));
    expect(calculation.names.get(nameKey('CD3 BV421 dilution factor'))).toMatchObject({
      kind: 'value',
      value: '100',
    });
    expect(calculation.names.get(nameKey('Full stain Surface wells'))).toMatchObject({
      kind: 'count',
      count: 2,
    });
    expect(answer(calculation, 'Full stain Surface antibodies')).toBe('1.5 %');
    expect(answer(calculation, 'FMO CD3 Surface antibodies')).toBe('0.5 %');
  });

  it('leaves a name that is already the scientist’s own to them', () => {
    const own: ProtocolBlock = {
      ...placement,
      id: 'formulas',
      type: 'formula',
      title: 'Calculations',
      items: [{ id: 'mine', name: 'Full stain Surface antibodies', expr: '2', unit: '' }],
      materialSections: [],
    };
    const calculation = calculateBoard(collectBoardNames(protocol([own])));
    expect(calculation.names.get(nameKey('Full stain Surface antibodies'))?.id).toBe('mine');
    expect(calculation.duplicateIds.size).toBe(0);
  });
});
