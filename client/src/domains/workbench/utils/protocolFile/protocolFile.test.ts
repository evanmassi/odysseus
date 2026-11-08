import cellsLegacy from './fixtures/cells.legacy.json';
import cellsMockup from './fixtures/cells.mockup.json';
import cytotoxLegacy from './fixtures/cytotox.legacy.json';
import cytotoxMockup from './fixtures/cytotox.mockup.json';
import elisaLegacy from './fixtures/elisa.legacy.json';
import elisaMockup from './fixtures/elisa.mockup.json';
import { ProtocolFileError, readProtocolFile, writeProtocolFile } from './protocolFile';

import type { Protocol } from '@odysseus/shared-schemas';

const EXAMPLES = {
  cells: [cellsLegacy, cellsMockup],
  cytotox: [cytotoxLegacy, cytotoxMockup],
  elisa: [elisaLegacy, elisaMockup],
} as const;

const read = (file: unknown) => readProtocolFile(JSON.stringify(file));

const legacyFile = (protocol: Record<string, unknown>) => ({
  format: 'odysseus-workbench-protocol',
  version: 1,
  savedAt: '',
  protocol: { title: 'Test', blocks: [], ...protocol },
});

const block = (type: string, fields: Record<string, unknown> = {}) => ({
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
  const plate = protocol.blocks.find(candidate => candidate.type === 'plate');
  if (plate?.type !== 'plate') throw new Error('no plate block');
  return plate;
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
  it('moves steps from before pages onto a Setup page that holds every block', () => {
    const protocol = read(
      legacyFile({
        steps: [{ id: 's1', kind: 'step', level: 1, text: 'Thaw', meanwhile: false }],
        blocks: [block('steps')],
      })
    );
    expect(protocol.pages).toEqual([
      {
        id: expect.any(String),
        name: 'Setup',
        steps: [{ id: 's1', kind: 'step', level: 1, text: 'Thaw', isMeanwhile: false }],
      },
    ]);
    expect(protocol.blocks[0].page).toBe(protocol.pages[0].id);
  });

  it('gives a file with no pages a Setup page instead of failing', () => {
    expect(read(legacyFile({ pages: [] })).pages).toHaveLength(1);
  });

  it('renames old concentration fields on materials and lot memory', () => {
    const protocol = read(
      legacyFile({
        lotMemory: { m1: { L1: { concentration: '5' } } },
        blocks: [
          block('materials', {
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
    const materials = protocol.blocks[0];
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
        blocks: [block('values', { items: [{ id: 'v1', name: 'Fold', value: '4', unit: 'x' }] })],
      })
    );
    expect(protocol.blocks[0]).toMatchObject({ items: [{ unit: 'X' }] });
  });

  it('splits an old single-vessel plate block into named plates with their own well keys', () => {
    const protocol = read(
      legacyFile({
        blocks: [
          block('plate', {
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
    const plate = plateOf(protocol);
    expect(plate.plates.map(({ name }) => name)).toEqual(['Day 1', '']);
    expect(Object.keys(plate.wells)).toEqual([`${plate.plates[1].id}:B2`]);
    const [aspirin] = plate.lines[0].values;
    expect(aspirin.text).toBe('Aspirin');
    expect(plate.cells[`${plate.plates[0].id}:A1`]).toEqual({ f1: { valueId: aspirin.id } });
  });

  it('turns an old flask block into a set with set-scoped keys', () => {
    const plate = plateOf(
      read(
        legacyFile({
          blocks: [block('plate', { vessel: 'T75', count: 3, wells: { '2:1': 'g1' } })],
        })
      )
    );
    expect(plate.plates).toEqual([]);
    expect(plate.sets).toEqual([{ id: expect.any(String), vessel: 'T75', count: 3 }]);
    expect(Object.keys(plate.wells)).toEqual([`${plate.sets[0].id}#2:1`]);
  });

  it('drops cell lines the mockup would have crashed on', () => {
    const plate = plateOf(
      read(
        legacyFile({
          blocks: [
            block('plate', {
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
    expect(plate.cells).toEqual({
      'p1:A1': {},
      'p1:A2': { f1: { valueId: 'v1', amount: '5', unit: 'X' } },
    });
  });

  it('names series cells and renames their fields', () => {
    const plate = plateOf(
      read(
        legacyFile({
          blocks: [
            block('plate', {
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
    const drug = plate.lines[0];
    expect(drug.role).toBe('band');
    expect(drug.values.map(({ text }) => text)).toEqual(['Drug']);
    expect(plate.cells['p1:A1']['f1']).toEqual({
      valueId: drug.values[0].id,
      seriesId: 's1',
      seriesStep: 2,
    });
    expect(plate.series['s1']).toEqual({
      start: '300',
      unit: 'nM',
      fold: '3',
      direction: 'right',
      prep: { volumeAdded: '20', roundTo: '5' },
    });
    expect(plate).toMatchObject({ mergesReplicates: false, activeTab: 1 });
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

  it('reports an unknown block type in an old file', () => {
    expect(() => read(legacyFile({ blocks: [block('hologram')] }))).toThrow(
      'Unknown block type “hologram”'
    );
  });
});
