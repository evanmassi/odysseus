import { blankProtocol } from '../protocolFile/blankProtocol';

import {
  STARTING_DONOR_FIELDS,
  addCustomDonorField,
  addDonor,
  findDonor,
  moveIntoDonors,
  donorColumns,
  donorFieldChoices,
  donorSummaries,
  donorsIn,
  startDonors,
  toggleDonorField,
} from './materialDonors';
import { materialFromGuess } from './materialItems';
import { EMPTY_LAB_MEMORY, knownDonors, learnFromMaterials } from './materialMemory';

import type { MaterialItem, ExperimentDonors, Protocol } from '@odysseus/shared-schemas';

const pbmc = (): MaterialItem => {
  const item = materialFromGuess(
    { group: 'bio', type: 'Primary cells', name: 'PBMC', values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );
  startDonors(item, STARTING_DONOR_FIELDS, []);
  return item;
};

const listOf = (item: MaterialItem): ExperimentDonors => {
  if (!item.sources) throw new Error('no donors list');
  return item.sources;
};

const withMaterials = (...items: MaterialItem[]): Protocol => {
  const protocol = blankProtocol();
  protocol.blocks.push({
    id: 'm',
    type: 'materials',
    title: 'Materials',
    page: protocol.pages[0].id,
    x: 0,
    y: 0,
    w: 6,
    h: 6,
    isCollapsed: false,
    foldedGroups: [],
    customGroups: [],
    isDroppedOpen: false,
    items,
  });
  return protocol;
};

describe('a donors list', () => {
  it('starts with the default fields and keeps an existing list', () => {
    const item = pbmc();
    expect(donorColumns(listOf(item)).map(column => column.label)).toEqual([
      'Donor ID',
      'Source',
      'Lot / vial',
      'Cells per vial',
      'Total cell conc.',
      'Viability',
      'Live cell conc.',
      'Vol.',
      'Total cells',
      'Live cells',
    ]);
    addDonor(listOf(item), 'Donor 1');
    startDonors(item, ['donor-id'], []);
    expect(listOf(item).rows).toHaveLength(1);
  });

  it('starts with pinned custom fields it has learned', () => {
    const item = materialFromGuess(
      { group: 'bio', type: 'Cell line', name: 'Raji', values: {}, why: '', source: 'list' },
      EMPTY_LAB_MEMORY
    );
    const freezer = {
      key: 'custom-freezer',
      label: 'Freezer',
      kind: 'text' as const,
      scope: 'protocol' as const,
      unit: '',
      options: [],
    };
    startDonors(item, ['donor-id', 'custom-freezer'], [freezer]);
    expect(donorColumns(listOf(item)).map(column => column.label)).toEqual(['Donor ID', 'Freezer']);
  });

  it('shows a recalled donor’s filled fields, hides and adds fields', () => {
    const donors = listOf(pbmc());
    donors.shownFields = ['donor-id'];
    addDonor(donors, ' Donor 2 ', { values: { 'lot-vial': '7', 'donor-id': 'D-9' }, units: {} });
    expect(donors.rows[0].name).toBe('Donor 2');
    expect(donors.shownFields).toEqual(['donor-id', 'lot-vial']);
    toggleDonorField(donors, 'donor-id', []);
    addCustomDonorField(donors, 'Freezer box');
    expect(donorColumns(donors).map(column => column.label)).toEqual(['Lot / vial', 'Freezer box']);
  });
});

describe('donors on the plate', () => {
  it('finds a donor by the name on the plate and sums up its ID and lot', () => {
    const item = pbmc();
    addDonor(listOf(item), 'Donor 1', {
      values: { 'donor-id': 'D-12', 'lot-vial': '3' },
      units: {},
    });
    const protocol = withMaterials(item);
    expect(findDonor(donorsIn(protocol), 'donor 1')?.donor.name).toBe('Donor 1');
    expect(findDonor(donorsIn(protocol), 'Donor 2')).toBeUndefined();
    expect(donorSummaries(protocol)).toEqual([
      { name: 'Donor 1', summary: 'PBMC · ID D-12 · Lot 3' },
    ]);
  });
});

describe('remembered donors', () => {
  it('remembers donors with an ID and offers them by ID or name, skipping ones listed', () => {
    const item = pbmc();
    addDonor(listOf(item), 'Donor 1', { values: { 'donor-id': 'D-12' }, units: {} });
    addDonor(listOf(item), 'Donor 2');
    const memory = learnFromMaterials(EMPTY_LAB_MEMORY, [item]);
    expect(Object.keys(memory.sources)).toEqual(['d12']);
    expect(knownDonors(memory, 'd-1', []).map(knownDonor => knownDonor.name)).toEqual(['Donor 1']);
    expect(knownDonors(memory, 'donor', []).map(knownDonor => knownDonor.material)).toEqual([
      'PBMC',
    ]);
    expect(knownDonors(memory, 'd-1', listOf(item).rows)).toEqual([]);
  });

  it('offers remembered fields and brings one in when it is turned on', () => {
    const item = pbmc();
    const donors = listOf(item);
    const freezer = {
      ...donorFieldChoices(donors, [])[0].definition,
      key: 'custom-freezer',
      label: 'Freezer',
    };
    expect(donorFieldChoices(donors, [freezer]).at(-1)).toEqual({
      definition: freezer,
      isShown: false,
    });
    toggleDonorField(donors, 'custom-freezer', [freezer]);
    expect(donorColumns(donors).at(-1)?.label).toBe('Freezer');
    toggleDonorField(donors, 'custom-unknown', []);
    expect(donors.shownFields).not.toContain('custom-unknown');
  });

  it('learns custom donor fields that are shown', () => {
    const item = pbmc();
    addCustomDonorField(listOf(item), 'Freezer box');
    const memory = learnFromMaterials(EMPTY_LAB_MEMORY, [item]);
    expect(memory.sourceFields.map(field => field.label)).toEqual(['Freezer box']);
  });
});

describe('making a material a donor', () => {
  it('moves it under the cell material, carrying the fields a donor has, counts included', () => {
    const stray = materialFromGuess(
      { group: 'unsorted', type: '', name: 'Donor 1 (spare)', values: {}, why: '', source: 'list' },
      EMPTY_LAB_MEMORY
    );
    Object.assign(stray.values, {
      lot: 'L7',
      vendor: 'Blood bank',
      'donor-id': 'D-101',
      viability: '92',
      count: '1e6',
    });
    const host = pbmc();
    const protocol = withMaterials(host, stray);
    moveIntoDonors(protocol, stray.id, host.id);
    const [donor] = listOf(host).rows;
    expect(donor).toMatchObject({
      name: 'Donor 1',
      values: {
        'lot-vial': 'L7',
        source: 'Blood bank',
        'donor-id': 'D-101',
        viability: '92',
        count: '1e6',
      },
    });
    expect(donorsIn(protocol)).toHaveLength(1);
    expect(protocol.blocks.flatMap(card => (card.type === 'materials' ? card.items : []))).toEqual([
      host,
    ]);
  });
});
