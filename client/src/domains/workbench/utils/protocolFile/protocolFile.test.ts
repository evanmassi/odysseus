import { SHARED_PREP_KEYS, sharedPrepSource } from '../dilutions/dilutionCalculations';
import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';

import cellsLegacy from './fixtures/cells.legacy.json';
import cellsMockup from './fixtures/cells.mockup.json';
import cytotoxLegacy from './fixtures/cytotox.legacy.json';
import cytotoxMockup from './fixtures/cytotox.mockup.json';
import elisaLegacy from './fixtures/elisa.legacy.json';
import elisaMockup from './fixtures/elisa.mockup.json';
import everyCardV4 from './fixtures/everyCard.v4.json';
import everyCardV5 from './fixtures/everyCard.v5.json';
import everyCardV6 from './fixtures/everyCard.v6.json';
import everyCardV7 from './fixtures/everyCard.v7.json';
import { ProtocolFileError, readProtocolFile, writeProtocolFile } from './protocolFile';

import type { Protocol, ProtocolCard, ProtocolCardType } from '@odysseus/shared-schemas';

const EXAMPLES = {
  cells: [cellsLegacy, cellsMockup],
  cytotox: [cytotoxLegacy, cytotoxMockup],
  elisa: [elisaLegacy, elisaMockup],
} as const;

const ids = vi.hoisted(() => ({ next: 0 }));

vi.mock('../ids/createId', () => ({ createId: () => `new-${++ids.next}` }));

beforeEach(() => {
  ids.next = 0;
});

const read = (file: unknown) => readProtocolFile(JSON.stringify(file));

const legacyFile = (protocol: Record<string, unknown>) => ({
  format: 'odysseus-workbench-protocol',
  version: 1,
  savedAt: '',
  protocol: { title: 'Test', blocks: [], ...protocol },
});

const card = (type: string, fields: Record<string, unknown> = {}) => ({
  id: `${type}-1`,
  type,
  title: type,
  x: 0,
  y: 0,
  w: 6,
  h: 6,
  ...fields,
});

const plateOf = (protocol: Protocol) => {
  const plateMap = protocol.cards.find(candidate => candidate.type === 'plateMap');
  if (plateMap?.type !== 'plateMap') throw new Error('no plate block');
  return plateMap;
};

// PITFALL: the mockup resizes blocks and caches section names while rendering, so those fields differ by design.
const RENDER_WRITES = new Set(['y', 'h', 'materialName']);

function normalizeIds(protocol: Protocol): unknown {
  const ids: string[] = [];
  const collect = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === 'object') {
      for (const key of Object.keys(node).sort()) {
        const child = (node as Record<string, unknown>)[key];
        if (key === 'id' && typeof child === 'string' && !ids.includes(child)) ids.push(child);
        collect(child);
      }
    }
  };
  collect(protocol);
  const replace = (text: string) =>
    ids.reduce((result, id, index) => result.split(id).join(`#${index}`), text);
  const rewrite = (node: unknown): unknown => {
    if (typeof node === 'string') return replace(node);
    if (Array.isArray(node)) return node.map(rewrite);
    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.keys(node)
          .filter(key => !RENDER_WRITES.has(key))
          .sort()
          .map(key => [replace(key), rewrite((node as Record<string, unknown>)[key])])
      );
    }
    return node;
  };
  return rewrite(protocol);
}

describe.each(Object.entries(EXAMPLES))('the %s example', (_, [legacy, mockup]) => {
  it('opens from its legacy shape', () => {
    expect(read(legacy).pages.length).toBeGreaterThan(0);
  });

  it('upgrades to what the mockup loader produced', () => {
    expect(normalizeIds(read(legacy))).toEqual(normalizeIds(read(mockup)));
  });

  it('survives a save and reopen unchanged', () => {
    const protocol = read(mockup);
    expect(readProtocolFile(writeProtocolFile(protocol))).toEqual(protocol);
  });
});

describe('upgrading older files', () => {
  it('moves steps from before pages onto a Setup page that holds every card', () => {
    const protocol = read(
      legacyFile({
        steps: [{ id: 's1', kind: 'step', level: 1, text: 'Thaw', meanwhile: false }],
        blocks: [card('steps')],
      })
    );
    expect(protocol.pages).toEqual([
      {
        id: expect.any(String),
        name: 'Setup',
        steps: [{ id: 's1', kind: 'step', level: 1, text: 'Thaw', isMeanwhile: false }],
      },
    ]);
    expect(protocol.cards[0].page).toBe(protocol.pages[0].id);
  });

  it('gives a file with no pages a Setup page instead of failing', () => {
    expect(read(legacyFile({ pages: [] })).pages).toHaveLength(1);
  });

  it('renames old concentration fields on materials and lot memory', () => {
    const protocol = read(
      legacyFile({
        lotMemory: { m1: { L1: { concentration: '5' } } },
        blocks: [
          card('materials', {
            items: [
              {
                id: 'm1',
                group: 'chem',
                type: 'Drug or inhibitor',
                name: 'Drug',
                on: ['concentration', 'working-concentration'],
                values: { concentration: '10', 'working-concentration': '1' },
                units: { concentration: 'mM' },
                custom: [],
              },
            ],
          }),
        ],
      })
    );
    const materials = protocol.cards[0];
    if (materials.type !== 'materials') throw new Error('no materials');
    expect(materials.items[0]).toMatchObject({
      shownFields: ['stock-concentration', 'final-concentration'],
      values: { 'stock-concentration': '10', 'final-concentration': '1' },
      units: { 'stock-concentration': 'mM' },
    });
    expect(protocol.lotMemory).toEqual({ m1: { L1: { 'stock-concentration': '5' } } });
  });

  it('spells the fold unit the way the unit registry does', () => {
    const protocol = read(
      legacyFile({
        blocks: [card('values', { items: [{ id: 'v1', name: 'Fold', value: '4', unit: 'x' }] })],
      })
    );
    expect(protocol.cards[0]).toMatchObject({ items: [{ unit: 'X' }] });
  });

  it('splits an old single-plate card into named plates with their own well keys', () => {
    const protocol = read(
      legacyFile({
        blocks: [
          card('plate', {
            vessel: '96',
            count: 2,
            names: ['Day 1'],
            wells: { '1:B2': 'g1' },
            groups: [{ id: 'g1', label: 'Treated', color: '#fff' }],
            fields: [{ id: 'f1', name: 'Drug', values: [] }],
            cells: { '0:A1': { f1: 'Aspirin' } },
          }),
        ],
      })
    );
    const plateMap = plateOf(protocol);
    expect(plateMap.plates.map(({ name }) => name)).toEqual(['Day 1', '']);
    expect(Object.keys(plateMap.samples)).toEqual([
      `${plateMap.plates[0].id}:A1`,
      `${plateMap.plates[1].id}:B2`,
    ]);
    const [aspirin] = plateMap.lines[0].values;
    expect(aspirin.text).toBe('Aspirin');
    expect(plateMap.samples[`${plateMap.plates[0].id}:A1`]).toEqual({
      f1: { valueId: aspirin.id },
    });
  });

  it('turns an old flask card into other labware with its own keys', () => {
    const plateMap = plateOf(
      read(
        legacyFile({
          blocks: [
            card('plate', {
              vessel: 'T75',
              count: 3,
              wells: { '2:1': 'g1' },
              groups: [{ id: 'g1', label: 'Fed', color: '#fff' }],
            }),
          ],
        })
      )
    );
    expect(plateMap.plates).toEqual([]);
    expect(plateMap.otherLabware).toEqual([{ id: expect.any(String), labware: 'T75', count: 3 }]);
    expect(Object.keys(plateMap.samples)).toEqual([`${plateMap.otherLabware[0].id}#2:1`]);
  });

  it('drops sample entries the mockup would have crashed on', () => {
    const plateMap = plateOf(
      read(
        legacyFile({
          blocks: [
            card('plate', {
              plates: [{ id: 'p1', vessel: '96', name: '' }],
              sets: [],
              fields: [{ id: 'f1', name: 'Drug', values: [{ id: 'v1', text: 'A' }] }],
              cells: {
                'p1:A1': { f1: null, gone: 'orphan text' },
                'p1:A2': { f1: { v: 'v1', amt: '5', unit: 'x' } },
              },
            }),
          ],
        })
      )
    );
    expect(plateMap.samples).toEqual({
      'p1:A2': { f1: { valueId: 'v1', amount: '5', unit: 'X' } },
    });
  });

  it('names series cells and renames their fields', () => {
    const plateMap = plateOf(
      read(
        legacyFile({
          blocks: [
            card('plate', {
              plates: [{ id: 'p1', vessel: '96', name: '' }],
              sets: [],
              fields: [{ id: 'f1', name: 'Drug', values: [], show: 'band' }],
              cells: { 'p1:A1': { f1: { s: 's1', step: 2 } } },
              series: {
                s1: {
                  start: '300',
                  unit: 'nM',
                  fold: '3',
                  op: 'divide',
                  prep: { add: '20', step: '5' },
                },
              },
              merge: false,
              active: 1,
            }),
          ],
        })
      )
    );
    const drug = plateMap.lines[0];
    expect(drug.role).toBe('band');
    expect(drug.values.map(({ text }) => text)).toEqual(['Drug']);
    expect(plateMap.samples['p1:A1']['f1']).toEqual({
      valueId: drug.values[0].id,
      seriesId: 's1',
      seriesPoint: 2,
    });
    expect(plateMap.series['s1']).toEqual({
      top: '300',
      unit: 'nM',
      dilutionFactor: '3',
      direction: 'right',
      prep: { roundTo: '5' },
    });
    expect(plateMap).toMatchObject({ showsReplicatesAsOne: false, activeTab: 1 });
  });
});

describe('readProtocolFile errors', () => {
  it('rejects text that is not JSON', () => {
    expect(() => readProtocolFile('{nope')).toThrow(
      new ProtocolFileError("This isn't a workbench protocol file.")
    );
  });

  it('rejects JSON from something else', () => {
    expect(() => readProtocolFile('{"format":"spreadsheet"}')).toThrow(
      "This isn't a workbench protocol file."
    );
  });

  it('says where a current file is damaged', () => {
    const protocol = read(cellsMockup);
    const damaged = JSON.parse(writeProtocolFile(protocol));
    damaged.protocol.pages = [];
    expect(() => read(damaged)).toThrow(/damaged at protocol\.pages/);
  });

  it('reports an unknown card type in an old file', () => {
    expect(() => read(legacyFile({ blocks: [card('hologram')] }))).toThrow(
      'Unknown card type "hologram"'
    );
  });
});

describe('retiring painted colors', () => {
  const RED = '#d97a7a';
  const GREEN = '#6fbf73';

  const paintedPlate = (fields: Record<string, unknown>) =>
    plateOf(
      read(
        legacyFile({
          blocks: [
            card('plate', { plates: [{ id: 'p1', vessel: '96', name: '' }], sets: [], ...fields }),
          ],
        })
      )
    );

  const drugLine = (values: Record<string, string>) => ({
    id: 'drug',
    name: 'Drug',
    values: Object.entries(values).map(([id, text]) => ({ id, text })),
  });

  it('gives each painted color to the value its wells share, the first color winning', () => {
    const plateMap = paintedPlate({
      fields: [drugLine({ a: 'Aspirin', b: 'Brufen' })],
      cells: { 'p1:A1': { drug: { v: 'a' } }, 'p1:A2': { drug: { v: 'b' } } },
      groups: [
        { id: 'g1', label: 'Low', color: RED },
        { id: 'g2', label: 'High', color: GREEN },
        { id: 'g3', label: 'Again', color: '#fff' },
      ],
      wells: { 'p1:A1': 'g1', 'p1:A2': 'g2', 'p1:B2': 'g3' },
      counts: { g1: '12', g2: '5', used: '40' },
      amountNames: { 'a:drug:aspirin-concentration:g1': 'Aspirin low dose' },
    });
    expect(plateMap.lines[0].values).toEqual([
      { id: 'a', text: 'Aspirin', color: RED },
      { id: 'b', text: 'Brufen', color: GREEN },
      { id: expect.any(String), text: 'Again', color: '#fff' },
    ]);
    expect(plateMap.counts).toEqual({ a: '12', b: '5', used: '40' });
    expect(plateMap.amountNames).toEqual({ 'a:drug:aspirin-concentration:a': 'Aspirin low dose' });
    expect(plateMap).not.toHaveProperty('groups');
    expect(plateMap).not.toHaveProperty('wells');
  });

  it('lets the first painted color win when two colors share one value', () => {
    const plateMap = paintedPlate({
      fields: [drugLine({ a: 'Aspirin', b: 'Brufen' })],
      cells: {
        'p1:A1': { drug: { v: 'a' } },
        'p1:A2': { drug: { v: 'a' } },
        'p1:A3': { drug: { v: 'b' } },
      },
      groups: [
        { id: 'g1', label: '', color: RED },
        { id: 'g2', label: '', color: GREEN },
      ],
      wells: { 'p1:A1': 'g1', 'p1:A2': 'g2' },
      counts: { g2: '7' },
    });
    expect(plateMap.lines[0].values.map(({ text, color }) => [text, color])).toEqual([
      ['Aspirin', RED],
      ['Brufen', '#6fa8e8'],
    ]);
    expect(plateMap.counts).toEqual({ a: '7' });
  });

  it('keeps the colors on the line that tells the most of them apart', () => {
    const plateMap = paintedPlate({
      fields: [
        {
          id: 'cells',
          name: 'Cells',
          values: [
            { id: 'both', text: 'Targets + T cells' },
            { id: 'raji', text: 'Targets only' },
          ],
        },
        drugLine({ x: 'Compound X', d: 'DMSO' }),
      ],
      cells: {
        'p1:A1': { cells: { v: 'both' }, drug: { v: 'x' } },
        'p1:A2': { cells: { v: 'both' }, drug: { v: 'd' } },
        'p1:A3': { cells: { v: 'raji' } },
      },
      groups: [
        { id: 'g1', label: 'Compound X', color: RED },
        { id: 'g2', label: 'T cells only', color: GREEN },
        { id: 'g3', label: 'Targets only', color: '#fff' },
      ],
      wells: { 'p1:A1': 'g1', 'p1:A2': 'g2', 'p1:A3': 'g3' },
      counts: { g2: '3' },
    });
    const drug = plateMap.lines.find(candidate => candidate.id === 'drug');
    expect(drug?.role).toBe('fill');
    expect(drug?.values.map(({ text, color }) => [text, color])).toEqual([
      ['Compound X', RED],
      ['DMSO', GREEN],
      ['Targets only', '#fff'],
    ]);
    expect(plateMap.counts).toEqual({ d: '3' });
  });

  it('leaves a color whose wells all hold different values to those values', () => {
    const plateMap = paintedPlate({
      fields: [drugLine({ a: 'Aspirin', b: 'Brufen' })],
      cells: { 'p1:A1': { drug: { v: 'a' } }, 'p1:A2': { drug: { v: 'b' } } },
      groups: [{ id: 'g1', label: 'Both', color: RED }],
      wells: { 'p1:A1': 'g1', 'p1:A2': 'g1' },
      counts: { g1: '2' },
    });
    expect(plateMap.lines[0].values.map(({ text }) => text)).toEqual(['Aspirin', 'Brufen']);
    expect(plateMap.counts).toEqual({});
  });

  it('writes the painted label onto wells without a value, naming blank labels by color number', () => {
    const plateMap = paintedPlate({
      fields: [drugLine({ a: 'Aspirin', b: 'Brufen' })],
      cells: { 'p1:A1': { drug: { v: 'a', amt: '5', unit: 'µM' } }, 'p1:A2': { drug: { v: 'b' } } },
      groups: [
        { id: 'g1', label: 'Standard', color: RED },
        { id: 'g2', label: ' ', color: GREEN },
      ],
      wells: { 'p1:A1': 'g1', 'p1:B1': 'g1', 'p1:B2': 'g2' },
    });
    const valueId = (text: string) =>
      plateMap.lines[0].values.find(value => value.text === text)?.id;
    expect(plateMap.samples['p1:A1']).toEqual({ drug: { valueId: 'a', amount: '5', unit: 'µM' } });
    expect(plateMap.samples['p1:B1']).toEqual({ drug: { valueId: valueId('Standard') } });
    expect(plateMap.samples['p1:B2']).toEqual({ drug: { valueId: valueId('Color 2') } });
    expect(plateMap.lines[0].values.map(({ text, color }) => [text, color])).toEqual([
      ['Aspirin', '#6fa8e8'],
      ['Brufen', '#5cc8bd'],
      ['Standard', RED],
      ['Color 2', GREEN],
    ]);
  });

  it('adds a color line when no line varies, keeping painted colors on neutral names', () => {
    const plateMap = paintedPlate({
      groups: [{ id: 'g1', label: 'Blank', color: RED }],
      wells: { 'p1:A1': 'g1', 'p1:A2': 'g1' },
    });
    expect(plateMap.lines).toEqual([
      {
        id: expect.any(String),
        name: '',
        role: 'fill',
        values: [{ id: expect.any(String), text: 'Blank', color: RED }],
      },
    ]);
    expect(Object.keys(plateMap.samples)).toEqual(['p1:A1', 'p1:A2']);
  });

  it('colors unpainted values from the free palette, and neutral ones grey', () => {
    const plateMap = paintedPlate({
      fields: [drugLine({ a: 'Aspirin', v: 'vehicle (DMSO)', c: 'Celecoxib' })],
      cells: {
        'p1:A1': { drug: { v: 'a' } },
        'p1:A2': { drug: { v: 'v' } },
        'p1:A3': { drug: { v: 'c' } },
      },
      groups: [{ id: 'g1', label: '', color: '#6fa8e8' }],
      wells: { 'p1:A1': 'g1' },
    });
    expect(plateMap.lines[0].values.map(({ color }) => color)).toEqual([
      '#6fa8e8',
      '#7d8494',
      '#5cc8bd',
    ]);
  });

  it('treats values that differ only in case or spacing as one, and merges lines sharing one', () => {
    const plateMap = paintedPlate({
      fields: [
        { id: 'l1', name: 'Drug', values: [{ id: 'h1', text: 'STX' }] },
        {
          id: 'l2',
          name: '',
          values: [
            { id: 'h2', text: ' stx ' },
            { id: 'z', text: 'Zeta' },
            { id: 'unused', text: 'Gone' },
          ],
        },
      ],
      cells: {
        'p1:A1': { l1: { v: 'h1', amt: '1', unit: 'µM' } },
        'p1:A2': { l2: { v: 'h2' } },
        'p1:A3': { l2: { v: 'z' } },
      },
      amountNames: { 'a:l2:zeta-concentration': 'Zeta dose' },
    });
    expect(
      plateMap.lines.map(({ id, name, values }) => [id, name, values.map(v => v.text)])
    ).toEqual([['l1', 'Drug', ['STX', 'Zeta']]]);
    expect(plateMap.samples['p1:A2']).toEqual({ l1: { valueId: 'h1' } });
    expect(plateMap.amountNames).toEqual({ 'a:l1:zeta-concentration': 'Zeta dose' });
  });

  it('keeps lines apart when a well holds both', () => {
    const plateMap = paintedPlate({
      fields: [
        { id: 'l1', name: 'Drug', values: [{ id: 'h1', text: 'STX' }] },
        { id: 'l2', name: 'Other', values: [{ id: 'h2', text: 'STX' }] },
      ],
      cells: { 'p1:A1': { l1: { v: 'h1' }, l2: { v: 'h2' } } },
    });
    expect(plateMap.lines.map(({ id }) => id)).toEqual(['l1', 'l2']);
  });

  it('upgrades a version 2 file', () => {
    const protocol = read({
      format: 'odysseus-workbench-protocol',
      version: 2,
      savedAt: '',
      protocol: {
        title: 'Test',
        descriptor: '',
        runNumber: '',
        runOn: { from: '', to: '' },
        pages: [{ id: 'page', name: 'Setup', steps: [] }],
        blocks: [
          {
            ...card('plate'),
            page: 'page',
            plates: [{ id: 'p1', vessel: '96', name: '' }],
            sets: [],
            activeTab: 0,
            groups: [{ id: 'g1', label: 'Treated', color: RED }],
            wells: { 'p1:A1': 'g1' },
            lines: [],
            cells: {},
            series: {},
          },
        ],
        lotMemory: {},
        keptBoth: [],
      },
    });
    expect(plateOf(protocol).lines[0].values).toEqual([
      { id: expect.any(String), text: 'Treated', color: RED },
    ]);
  });
});

describe('the protocol diluent', () => {
  const versionThree = (diluent: string | undefined) => {
    type SeriesV4 = { prep?: { diluent?: string } };
    const file = structuredClone(everyCardV4) as unknown as {
      version: number;
      protocol: {
        diluent?: string;
        blocks: Array<{ type: string; series?: Record<string, SeriesV4> }>;
      };
    };
    file.version = 3;
    delete file.protocol.diluent;
    const allSeries = file.protocol.blocks
      .filter(item => item.type === 'plate')
      .flatMap(plate => Object.values(plate.series ?? {}));
    for (const each of allSeries) delete each.prep?.diluent;
    const [series] = allSeries;
    if (diluent !== undefined) series.prep = { ...series.prep, diluent };
    return file;
  };

  it('upgrades an older file with the first diluent one of its series chose', () => {
    expect(read(versionThree('Complete RPMI')).diluent).toBe('Complete RPMI');
    expect(read(versionThree(undefined)).diluent).toBe('');
    expect(read(cytotoxLegacy).diluent).toBe('');
  });

  it('survives a save and reopen', () => {
    const protocol = { ...read(cytotoxMockup), diluent: 'PBS' };
    expect(read(JSON.parse(writeProtocolFile(protocol))).diluent).toBe('PBS');
  });
});

describe('opening a current file', () => {
  it('keeps a card that shows a plate map from another page', () => {
    const file = JSON.parse(writeProtocolFile(read(cytotoxMockup)));
    const plate = file.protocol.cards.find((item: { type: string }) => item.type === 'plateMap');
    file.protocol.cards.push({
      id: 'view',
      type: 'linkedPlateMap',
      title: plate.title,
      page: plate.page,
      x: 0,
      y: 40,
      w: 6,
      h: 14,
      shows: plate.id,
      side: 'stain',
    });
    const view = read(file).cards.find(card => card.type === 'linkedPlateMap');
    expect(view).toMatchObject({
      shows: plate.id,
      side: 'stain',
      activeTab: 0,
      showsReplicatesAsOne: true,
    });
  });

  it('moves mix names typed on wells to the Stain side', () => {
    const file = JSON.parse(writeProtocolFile(read(cytotoxMockup)));
    const plate = file.protocol.cards.find((item: { type: string }) => item.type === 'plateMap');
    file.protocol.cards.push({
      id: 'panel',
      type: 'flowCytometryPanel',
      title: 'Flow panel',
      page: plate.page,
      x: 0,
      y: 0,
      w: 12,
      h: 10,
      markers: [],
      stains: [{ id: 'full', name: 'Full Stain', markerIds: [], plus: [] }],
    });
    plate.lines = [
      { id: 'drug', name: '', role: 'auto', values: [{ id: 'x', text: 'Compound X' }] },
      { id: 'mix', name: 'Stain', role: 'band', values: [{ id: 'f', text: 'full stain' }] },
    ];
    plate.samples = {
      'p:A1': { drug: { valueId: 'x' }, mix: { valueId: 'f' } },
      'p:A2': { drug: { valueId: 'x' } },
    };
    plate.series = {};
    const opened = plateOf(read(file));
    expect(opened.stain).toEqual({ 'p:A1': 'full' });
    expect(opened.lines.map(line => line.id)).toEqual(['drug']);
    expect(Object.keys(opened.samples)).toEqual(['p:A1', 'p:A2']);
  });

  it('merges plate lines that share a name and no well', () => {
    const file = JSON.parse(writeProtocolFile(read(cytotoxMockup)));
    const plate = file.protocol.cards.find((item: { type: string }) => item.type === 'plateMap');
    plate.lines = [1, 2].map(index => ({
      id: `d${index}`,
      name: 'Donors',
      role: 'auto',
      values: [{ id: `v${index}`, text: `Donor ${index}` }],
    }));
    plate.samples = { 'p:A1': { d1: { valueId: 'v1' } }, 'p:A2': { d2: { valueId: 'v2' } } };
    plate.series = {};
    const { lines } = plateOf(read(file));
    expect(lines).toHaveLength(1);
    expect(lines[0].values.map(value => value.text)).toEqual(['Donor 1', 'Donor 2']);
  });
});

const cardOf = <Type extends ProtocolCardType>(protocol: Protocol, type: Type) => {
  const card = protocol.cards.find(
    (candidate): candidate is Extract<ProtocolCard, { type: Type }> => candidate.type === type
  );
  if (!card) throw new Error(`no ${type} card`);
  return card;
};

function savedFacts(protocol: Protocol) {
  const materials = cardOf(protocol, 'materials');
  const material = (name: string) => {
    const item = materials.items.find(candidate => candidate.name === name);
    if (!item) throw new Error(`no material ${name}`);
    return item;
  };
  const nameOf = (materialId: string) => materials.items.find(item => item.id === materialId)?.name;
  const values = cardOf(protocol, 'values');
  const board = calculateBoard(collectBoardNames(protocol));
  const linked = cardOf(protocol, 'linkedPlateMap');
  const plateMap = cardOf(protocol, 'plateMap');
  const flowCytometryPanel = cardOf(protocol, 'flowCytometryPanel');
  const stainName = (id: string | undefined) =>
    flowCytometryPanel.stains.find(stain => stain.id === id)?.name;
  const factorSeries = plateMap.series['series-factor'];
  const listSeries = plateMap.series['series-list'];
  const amountOf = (name: string) =>
    [material(name).values['amount'], material(name).units['amount']].filter(Boolean).join(' ');
  return {
    cardTypes: protocol.cards.map(card => card.type).sort(),
    linkedPlateMap: { page: linked.page, shows: linked.shows, sourcePage: plateMap.page },
    donorListLabel: material('PBMC').donors?.label,
    donors: material('PBMC').donors?.rows.map(donor => ({
      name: donor.name,
      donorId: donor.values['donor-id'],
      lotVial: donor.values['lot-vial'],
      totalCellConc: donor.values['total-cell-conc'],
      liveCellConc: donor.values['live-cell-conc'],
      freezeNote: donor.values['freeze-note'],
    })),
    sampleEntry: {
      source: material('Cell line A').values['source'],
      totalCellConc: material('Cell line A').values['total-cell-conc'],
      viability: material('Cell line A').values['viability'],
      renamedCatalogLabel: material('Cell line A').fieldLabels['catalog'],
    },
    setAside: materials.items.filter(item => item.isSetAside).map(item => item.name),
    isSetAsideOpen: materials.isSetAsideOpen,
    recipe: {
      ingredients: material('Medium A').recipe.map(
        entry => `${nameOf(entry.materialId)} ${entry.amount} ${entry.unit}`
      ),
      note: material('Medium A').values['recipe-note'],
    },
    stainingAmounts: {
      'CD3 BV421': amountOf('CD3 BV421'),
      'CD8 PE': amountOf('CD8 PE'),
      'Fc block X': amountOf('Fc block X'),
      'Viability dye X': material('Viability dye X').values['amount'],
    },
    customField: material('Drug X').values['batch-note'],
    valueRows: values.rows.map(row => ('mixName' in row ? row.mixName : nameOf(row.materialId))),
    wholeExperimentTitle: values.generalTitle,
    calculations: cardOf(protocol, 'calculations').items.map(
      item => `${item.name} = ${item.formula}`
    ),
    otherLabware: plateMap.otherLabware.map(labware => `${labware.labware} × ${labware.count}`),
    otherLabwareTabName: plateMap.otherLabwareTabName,
    samples: {
      A1: plateMap.samples['plate-1:A1']['line-cells'],
      A2SeriesPoint: plateMap.samples['plate-1:A2']['line-drug'].seriesPoint,
      firstFlask: plateMap.samples['flasks#0:1']['line-cells'].valueId,
      firstTube: plateMap.samples['tubes#0:1']['line-cells'].valueId,
    },
    series: {
      top: 'top' in factorSeries ? `${factorSeries.top} ${factorSeries.unit}` : undefined,
      dilutionFactor: 'dilutionFactor' in factorSeries ? factorSeries.dilutionFactor : undefined,
      typedValues: 'typedValues' in listSeries ? listSeries.typedValues : undefined,
      dilutionsSettings: factorSeries.prep,
      sharedValues: Object.fromEntries(
        SHARED_PREP_KEYS.map(key => {
          const entry = sharedPrepSource(board.names, 'Drug X', key)?.entry;
          return [key, entry?.kind === 'value' ? `${entry.value} ${entry.unit}` : undefined];
        })
      ),
    },
    renamedTopName: plateMap.amountNames['s:series-factor:top'],
    indicators: plateMap.lines.map(line => ({
      line: line.name,
      look: line.role,
      hidden: line.hiddenIndicators,
      ratioTo: line.ratioTo,
    })),
    showsReplicatesAsOne: plateMap.showsReplicatesAsOne,
    typedCounts: plateMap.counts,
    shownSide: plateMap.side,
    stains: {
      A1: stainName(plateMap.stain['plate-1:A1']),
      B1: stainName(plateMap.stain['plate-1:B1']),
      firstTube: stainName(plateMap.stain['tubes#0:1']),
    },
    stainedIn: plateMap.stainedIn,
    cytometer: flowCytometryPanel.cytometer?.name,
    markers: flowCytometryPanel.markers.map(
      marker =>
        `${nameOf(marker.materialId)} · ${marker.detectorId} · ${marker.staining} · ${amountOf(nameOf(marker.materialId) ?? '')}`
    ),
    stainList: flowCytometryPanel.stains.map(stain => ({
      name: stain.name,
      markers: stain.markerIds.length,
      added: stain.plus.map(entry => `${nameOf(entry.materialId)} · ${entry.staining}`),
    })),
    fluors: protocol.fluors.map(fluor => fluor.name),
    ignoredSuggestions: protocol.ignoredSuggestions,
    steps: protocol.pages[0].steps.map(step => step.text),
  };
}

const EVERY_CARD_FACTS = {
  cardTypes: [
    'calculations',
    'dilutions',
    'flowCytometryPanel',
    'flowDiagram',
    'linkedPlateMap',
    'materials',
    'plateMap',
    'procedure',
    'sketch',
    'table',
    'text',
    'values',
  ],
  linkedPlateMap: { page: 'page-setup', shows: 'card-plate', sourcePage: 'page-plates' },
  donorListLabel: 'Donors',
  donors: [
    {
      name: 'Donor 1',
      donorId: 'D-01',
      lotVial: 'V1',
      totalCellConc: '1.00E+7',
      liveCellConc: undefined,
      freezeNote: 'Slow freeze',
    },
    {
      name: 'Donor 2',
      donorId: 'D-02',
      lotVial: undefined,
      totalCellConc: undefined,
      liveCellConc: '8.00E+6',
      freezeNote: undefined,
    },
  ],
  sampleEntry: {
    source: 'Supplier A',
    totalCellConc: '1.00E+6',
    viability: '95',
    renamedCatalogLabel: 'Cat. no.',
  },
  setAside: ['Old reagent Z'],
  isSetAsideOpen: true,
  recipe: { ingredients: ['Supplement Y 10 %'], note: 'Warm before use' },
  stainingAmounts: {
    'CD3 BV421': '200 1:N',
    'CD8 PE': '5 µL',
    'Fc block X': '5',
    'Viability dye X': '1000',
  },
  customField: 'Batch 2',
  valueRows: ['Cell line A', 'Medium A + Supplement Y', 'Drug X'],
  wholeExperimentTitle: 'Plate setup',
  calculations: ['Cell line A vol. needed = Cell line A vol./well × 2'],
  otherLabware: ['T75 × 2', 'facs × 3'],
  otherLabwareTabName: 'Culture flasks',
  samples: {
    A1: { valueId: 'cells-a', amount: '40000', unit: 'cells' },
    A2SeriesPoint: 1,
    firstFlask: 'cells-a',
    firstTube: 'cells-donor-1',
  },
  series: {
    top: '10 µM',
    dilutionFactor: '3',
    typedValues: ['1', '5'],
    dilutionsSettings: { roundTo: '1', diluent: 'Medium A' },
    sharedValues: { totalWellVolume: '200 µL', volumePerWell: '20 µL', extra: '10 %' },
  },
  renamedTopName: 'Drug X top',
  indicators: [
    { line: 'Cells', look: 'band', hidden: ['bracket'], ratioTo: undefined },
    { line: 'Drug', look: 'fill', hidden: undefined, ratioTo: undefined },
    { line: 'Effectors', look: 'auto', hidden: undefined, ratioTo: 'line-cells' },
  ],
  showsReplicatesAsOne: false,
  typedCounts: { 'used:well': '8' },
  shownSide: 'stain',
  stains: { A1: 'Full stain', B1: 'FMO CD8', firstTube: 'Unstained' },
  stainedIn: { 'plate-1:A2': 'plate-1:A1', 'plate-1:A3': 'plate-1:D3' },
  cytometer: 'Test cytometer',
  markers: ['CD3 BV421 · VL1 · Surface · 200 1:N', 'CD8 PE · BL2 · Surface · 5 µL'],
  stainList: [
    {
      name: 'Full stain',
      markers: 2,
      added: ['Viability dye X · Viability', 'Fc block X · Surface'],
    },
    { name: 'FMO CD8', markers: 1, added: [] },
    { name: 'Unstained', markers: 0, added: [] },
  ],
  fluors: ['Qx Fluor 512'],
  ignoredSuggestions: ['plate:Edge', 'value:Spin speed'],
  steps: ['Prepare cells', 'Thaw PBMC.', 'Spin 300 g, 5 min.'],
};

describe.each([
  ['version 4', everyCardV4],
  ['version 5', everyCardV5],
  ['version 6', everyCardV6],
])('a %s file holding every card', (_, sample) => {
  it('opens in today’s words with every saved value kept', () => {
    expect(read(sample)).toEqual(everyCardV7.protocol);
  });

  it('survives a save and reopen unchanged', () => {
    const opened = read(sample);
    expect(readProtocolFile(writeProtocolFile(opened))).toEqual(opened);
  });

  it('still holds everything it was saved with', () => {
    expect(savedFacts(read(sample))).toEqual(EVERY_CARD_FACTS);
  });
});

describe('a version 7 file holding every card', () => {
  it('opens exactly as it was saved', () => {
    expect(read(everyCardV7)).toEqual(everyCardV7.protocol);
  });

  it('still holds everything it was saved with', () => {
    expect(savedFacts(read(everyCardV7))).toEqual(EVERY_CARD_FACTS);
  });
});
