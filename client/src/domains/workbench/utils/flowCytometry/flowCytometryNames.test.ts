import { produce } from 'immer';

import { calculateBoard, calculationAnswerText, nameKey } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';
import { keepRecognizedTerms } from '../terms/savedTerms';

import type {
  FlowCytometryPanel,
  PlateMap,
  Protocol,
  ProtocolCard,
  ProtocolValues,
} from '@odysseus/shared-schemas';

const antibody = (name: string, values: Record<string, string>, units: Record<string, string>) => {
  const item = materialFromGuess(
    { group: 'ab', type: 'Antibody', name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );
  Object.assign(item.values, values);
  Object.assign(item.units, units);
  item.shownFields.push(...Object.keys(values));
  return item;
};

const cd3 = antibody('CD3 BV421', { amount: '100' }, { amount: '1:N' });
const cd4 = antibody('CD4 FITC', { amount: '200' }, { amount: '1:N' });

const placement = { page: 'page', x: 0, y: 0, w: 12, h: 10, isCollapsed: false };

const panel: FlowCytometryPanel = {
  id: 'panel',
  title: 'Flow panel',
  markers: [
    { id: 'cd3', materialId: cd3.id, detectorId: 'VL1', staining: 'Surface' },
    { id: 'cd4', materialId: cd4.id, detectorId: 'BL1', staining: 'Surface' },
  ],
  stains: [
    { id: 'full', name: 'Full stain', markerIds: ['cd3', 'cd4'], plus: [] },
    { id: 'fmo', name: 'FMO CD3', markerIds: ['cd4'], plus: [] },
  ],
};

const plateMap: PlateMap = {
  id: 'plate',
  title: '',
  plates: [{ id: 'p1', labware: '96', name: '' }],
  otherLabware: [],
  lines: [],
  samples: {},
  series: {},
  counts: {},
  amountNames: {},
  stain: { 'p1:A1': 'full', 'p1:A2': 'full', 'p1:A3': 'fmo' },
  stainedIn: {},
};

const panelCard: ProtocolCard = {
  ...placement,
  id: 'panel-card',
  type: 'flowCytometryPanel',
  shows: 'panel',
};

const plateCard: ProtocolCard = {
  ...placement,
  id: 'plate-card',
  type: 'plateMap',
  shows: 'plate',
  side: 'stain',
  activeTab: 0,
  showsReplicatesAsOne: true,
};

const protocol = (
  data: Partial<Pick<Protocol, 'values' | 'calculations'>> = {},
  items = [cd3, cd4],
  panelCards: ProtocolCard[] = [panelCard]
): Protocol =>
  produce<Protocol>(
    {
      title: 'Panel',
      descriptor: '',
      purpose: '',
      runNumber: '',
      runOn: { from: '', to: '' },
      pages: [{ id: 'page', name: 'Flow', steps: [] }],
      fluors: [],
      diluent: '',
      materials: { items, customGroups: [] },
      values: data.values ?? { items: [], rows: [] },
      calculations: data.calculations ?? { items: [], materialSections: [] },
      plateMaps: [plateMap],
      flowCytometryPanels: [panel],
      cards: [
        {
          ...placement,
          id: 'materials',
          type: 'materials',
          title: 'Materials',
          foldedGroups: [],
          isSetAsideOpen: false,
        },
        ...panelCards,
        plateCard,
      ],
      lotMemory: {},
      keptBoth: [],
      ignoredSuggestions: [],
    },
    keepRecognizedTerms
  );

const answer = (board: ReturnType<typeof calculateBoard>, name: string) => {
  const entry = board.names.get(nameKey(name));
  const result = entry && board.results.get(entry.id);
  return result?.status === 'ok' ? calculationAnswerText(result) : result?.status;
};

describe('flow panel names', () => {
  it('reads each marker’s dil. from Materials and gives each cocktail its wells and share', () => {
    const board = calculateBoard(collectBoardNames(protocol()));
    expect(board.names.get(nameKey('CD3 BV421 dil.'))).toMatchObject({
      kind: 'value',
      value: '100',
      unit: '1:N',
    });
    expect(board.names.get(nameKey('Full stain Surface cocktail wells'))).toMatchObject({
      kind: 'count',
      count: 2,
    });
    expect(answer(board, 'Full stain Surface cocktail antibodies')).toBe('1.5%');
    expect(answer(board, 'FMO CD3 Surface cocktail antibodies')).toBe('0.5%');
  });

  it('points its go-to at the panel, whether or not a card shows it', () => {
    const wells = (cards: ProtocolCard[]) =>
      calculateBoard(collectBoardNames(protocol({}, [cd3, cd4], cards))).names.get(
        nameKey('Full stain Surface cocktail wells')
      );
    const shown = { type: 'flowCytometryPanel', shows: 'panel' };
    for (const cards of [[panelCard], []]) {
      expect(wells(cards)).toMatchObject({
        id: 'panel:surface|cd3|cd4:wells',
        count: 2,
        origin: shown,
        workedOut: { settings: shown },
      });
    }
  });

  it('leaves a name that is already the scientist’s own to them', () => {
    const calculations = {
      items: [
        { id: 'mine', name: 'Full stain Surface cocktail antibodies', formula: '2', unit: '' },
      ],
      materialSections: [],
    };
    const board = calculateBoard(collectBoardNames(protocol({ calculations })));
    expect(board.names.get(nameKey('Full stain Surface cocktail antibodies'))?.id).toBe('mine');
    expect(board.takenNameIds.size).toBe(0);
  });

  it('works out each marker’s vol./well from its staining’s cocktail volume', () => {
    const values: ProtocolValues = {
      items: [{ id: 'volume', name: 'Surface stain volume', value: '50', unit: 'µL' }],
      rows: [],
    };
    expect(
      answer(calculateBoard(collectBoardNames(protocol({ values }))), 'CD3 BV421 vol./well')
    ).toBe('0.5 µL');
    const cocktailVolume: ProtocolValues = {
      ...values,
      items: [{ id: 'volume', name: 'Surface cocktail vol./well', value: '50', unit: 'µL' }],
    };
    expect(
      answer(
        calculateBoard(collectBoardNames(protocol({ values: cocktailVolume }))),
        'CD3 BV421 vol./well'
      )
    ).toBe('0.5 µL');
    const missing = calculateBoard(collectBoardNames(protocol()));
    const entry = missing.names.get(nameKey('CD3 BV421 vol./well'));
    expect(entry && missing.results.get(entry.id)).toMatchObject({
      status: 'error',
      message: 'Needs "Surface cocktail vol./well" or "Cocktail vol./well" in Values',
    });
  });

  it('gives a stain in wells and tubes each container’s vol. from its own cocktail volume', () => {
    const inBoth = (items: Array<{ id: string; name: string; value: string; unit: string }>) => {
      const base = protocol({ values: { items, rows: [] } });
      return {
        ...base,
        plateMaps: [
          {
            ...plateMap,
            otherLabware: [{ id: 't', labware: 'facs' as const, count: 2 }],
            stain: { 'p1:A1': 'full', 'p1:A2': 'full', 't#1:1': 'full', 't#2:1': 'full' },
          },
        ],
      } as Protocol;
    };
    const board = calculateBoard(
      collectBoardNames(
        inBoth([
          { id: 'w', name: 'Surface cocktail vol./well', value: '50', unit: 'µL' },
          { id: 't', name: 'Surface cocktail vol./tube', value: '100', unit: 'µL' },
        ])
      )
    );
    expect(answer(board, 'CD3 BV421 vol./well')).toBe('0.5 µL');
    expect(answer(board, 'CD3 BV421 vol./tube')).toBe('1 µL');
    expect(board.names.get(nameKey('Full stain Surface cocktail wells'))).toMatchObject({
      count: 2,
    });
    expect(board.names.get(nameKey('Full stain Surface cocktail tubes'))).toMatchObject({
      count: 2,
    });
    const missing = calculateBoard(
      collectBoardNames(
        inBoth([{ id: 'w', name: 'Surface cocktail vol./well', value: '50', unit: 'µL' }])
      )
    );
    const entry = missing.names.get(nameKey('CD3 BV421 vol./tube'));
    expect(entry && missing.results.get(entry.id)).toMatchObject({
      status: 'error',
      message: 'Needs "Surface cocktail vol./tube" or "Cocktail vol./tube" in Values',
    });
  });

  const surfaceVolume = {
    values: {
      items: [{ id: 'volume', name: 'Surface cocktail vol./well', value: '50', unit: 'µL' }],
      rows: [],
    },
  };

  it('takes a per-test volume as the vol./well and its share of the cocktail', () => {
    const perTest = antibody('CD4 FITC', { amount: '5' }, { amount: 'µL' });
    perTest.id = cd4.id;
    const board = calculateBoard(collectBoardNames(protocol(surfaceVolume, [cd3, perTest])));
    expect(answer(board, 'CD4 FITC vol./well')).toBe('5 µL');
    expect(answer(board, 'Full stain Surface cocktail antibodies')).toBe('11%');
  });

  it('works a final conc. back through the stock conc.', () => {
    const atConc = antibody(
      'CD3 BV421',
      { amount: '0.5', 'stock-concentration': '500' },
      { amount: 'µg/mL', 'stock-concentration': 'µg/mL' }
    );
    atConc.id = cd3.id;
    const board = calculateBoard(collectBoardNames(protocol(surfaceVolume, [atConc, cd4])));
    expect(answer(board, 'CD3 BV421 vol./well')).toBe('0.05 µL');
    expect(answer(board, 'FMO CD3 Surface cocktail antibodies')).toBe('0.5%');
    expect(answer(board, 'Full stain Surface cocktail antibodies')).toBe('0.6%');
    const noStock = antibody('CD3 BV421', { amount: '0.5' }, { amount: 'µg/mL' });
    noStock.id = cd3.id;
    const missing = calculateBoard(collectBoardNames(protocol(surfaceVolume, [noStock, cd4])));
    expect(missing.names.get(nameKey('CD3 BV421 vol./well'))).toMatchObject({
      problem: "Needs CD3 BV421's stock conc. in Materials",
    });
  });

  it('waits for every antibody before giving a cocktail its share', () => {
    const blank = antibody('CD4 FITC', {}, {});
    blank.id = cd4.id;
    const board = calculateBoard(collectBoardNames(protocol(surfaceVolume, [cd3, blank])));
    expect(board.names.get(nameKey('Full stain Surface cocktail antibodies'))).toMatchObject({
      problem: 'CD4 FITC needs a dil.: set it here or in Materials',
    });
    expect(answer(board, 'FMO CD3 Surface cocktail antibodies')).toBe('error');
  });
});
