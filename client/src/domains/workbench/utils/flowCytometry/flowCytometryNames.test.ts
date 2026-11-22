import { calculateBoard, calculationAnswerText, nameKey } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';

import type { FlowCytometryPanelBlock, Protocol, ProtocolBlock } from '@odysseus/shared-schemas';

const antibody = (name: string) =>
  materialFromGuess(
    { group: 'ab', type: 'Antibody', name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );

const cd3 = antibody('CD3 BV421');
const cd4 = antibody('CD4 FITC');

const placement = { page: 'page', x: 0, y: 0, w: 12, h: 10, isCollapsed: false };

const panel: FlowCytometryPanelBlock = {
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

const plateMap: ProtocolBlock = {
  ...placement,
  id: 'plate',
  type: 'plate',
  title: 'Vessel map',
  plates: [{ id: 'p1', vessel: '96', name: '' }],
  sets: [],
  activeTab: 0,
  lines: [],
  cells: {},
  series: {},
  mergesReplicates: true,
  counts: {},
  amountNames: {},
  side: 'stain',
  stain: { 'p1:A1': 'full', 'p1:A2': 'full', 'p1:A3': 'fmo' },
  stainedIn: {},
};

const protocol = (extra: ProtocolBlock[] = []): Protocol => ({
  title: 'Panel',
  descriptor: '',
  purpose: '',
  runNumber: '',
  runOn: { from: '', to: '' },
  pages: [{ id: 'page', name: 'Flow', steps: [] }],
  dyes: [],
  diluent: '',
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
    plateMap,
    ...extra,
  ],
  lotMemory: {},
  keptBoth: [],
  ignoredReadings: [],
});

const answer = (board: ReturnType<typeof calculateBoard>, name: string) => {
  const entry = board.names.get(nameKey(name));
  const result = entry && board.results.get(entry.id);
  return result?.status === 'ok' ? calculationAnswerText(result) : result?.status;
};

describe('flow panel names', () => {
  it('gives each marker a dilution factor and each cocktail its wells and antibody share', () => {
    const board = calculateBoard(collectBoardNames(protocol()));
    expect(board.names.get(nameKey('CD3 BV421 dilution factor'))).toMatchObject({
      kind: 'value',
      value: '100',
    });
    expect(board.names.get(nameKey('Full stain Surface cocktail wells'))).toMatchObject({
      kind: 'count',
      count: 2,
    });
    expect(answer(board, 'Full stain Surface cocktail antibodies')).toBe('1.5%');
    expect(answer(board, 'FMO CD3 Surface cocktail antibodies')).toBe('0.5%');
  });

  it('leaves a name that is already the scientist’s own to them', () => {
    const own: ProtocolBlock = {
      ...placement,
      id: 'formulas',
      type: 'formula',
      title: 'Calculations',
      items: [{ id: 'mine', name: 'Full stain Surface cocktail antibodies', expr: '2', unit: '' }],
      materialSections: [],
    };
    const board = calculateBoard(collectBoardNames(protocol([own])));
    expect(board.names.get(nameKey('Full stain Surface cocktail antibodies'))?.id).toBe('mine');
    expect(board.takenNameIds.size).toBe(0);
  });

  it('works out each marker’s amount per well from its staining’s cocktail volume', () => {
    const values: ProtocolBlock = {
      ...placement,
      id: 'values',
      type: 'values',
      title: 'Values',
      items: [{ id: 'volume', name: 'Surface stain volume', value: '50', unit: 'µL' }],
      sections: [],
    };
    expect(
      answer(calculateBoard(collectBoardNames(protocol([values]))), 'CD3 BV421 amount per well')
    ).toBe('0.5 µL');
    const cocktailVolume: ProtocolBlock = {
      ...values,
      items: [{ id: 'volume', name: 'Surface cocktail vol./well', value: '50', unit: 'µL' }],
    };
    expect(
      answer(
        calculateBoard(collectBoardNames(protocol([cocktailVolume]))),
        'CD3 BV421 amount per well'
      )
    ).toBe('0.5 µL');
    const missing = calculateBoard(collectBoardNames(protocol()));
    const entry = missing.names.get(nameKey('CD3 BV421 amount per well'));
    expect(entry && missing.results.get(entry.id)).toMatchObject({
      status: 'error',
      message: 'Needs "Surface cocktail vol./well" or "Cocktail vol./well" in Values',
    });
  });
});
