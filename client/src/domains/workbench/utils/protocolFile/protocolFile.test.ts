import { PROTOCOL_FILE_VERSION } from '@odysseus/shared-schemas';

import { SHARED_PREP_KEYS, sharedPrepSource } from '../dilutions/dilutionCalculations';
import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { ownerNamed } from '../materials/plateLinks';

import cellsSample from './fixtures/cells.json';
import cytotoxSample from './fixtures/cytotox.json';
import elisaSample from './fixtures/elisa.json';
import everyCardSample from './fixtures/everyCard.json';
import { ProtocolFileError, readProtocolFile, writeProtocolFile } from './protocolFile';

import type {
  PlateMapCard,
  Protocol,
  ProtocolCard,
  ProtocolCardType,
} from '@odysseus/shared-schemas';

const read = (file: unknown) => readProtocolFile(JSON.stringify(file));

const plateOf = (protocol: Protocol) => {
  const [plateMap] = protocol.plateMaps;
  if (!plateMap) throw new Error('no plate map');
  return plateMap;
};

describe.each([
  ['cells', cellsSample],
  ['cytotox', cytotoxSample],
  ['elisa', elisaSample],
])('the %s example', (_, sample) => {
  it('survives a save and reopen unchanged', () => {
    const protocol = read(sample);
    expect(readProtocolFile(writeProtocolFile(protocol))).toEqual(protocol);
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

  it('turns away a file saved by a different version', () => {
    expect(() => read({ ...cellsSample, version: PROTOCOL_FILE_VERSION - 1 })).toThrow(
      "This protocol was saved by a different version of the workbench and can't be opened."
    );
  });

  it('says where a current file is damaged', () => {
    const damaged = JSON.parse(writeProtocolFile(read(cellsSample)));
    damaged.protocol.pages = [];
    expect(() => read(damaged)).toThrow(/damaged at protocol\.pages/);
  });
});

describe('opening a file', () => {
  it('keeps the protocol diluent through a save and reopen', () => {
    const protocol = { ...read(cytotoxSample), diluent: 'PBS' };
    expect(read(JSON.parse(writeProtocolFile(protocol))).diluent).toBe('PBS');
  });

  it('merges plate lines that share a name and no well', () => {
    const file = JSON.parse(writeProtocolFile(read(cytotoxSample)));
    const [plate] = file.protocol.plateMaps;
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
  const materials = protocol.materials.items;
  const material = (name: string) => {
    const item = materials.find(candidate => candidate.name === name);
    if (!item) throw new Error(`no material ${name}`);
    return item;
  };
  const nameOf = (materialId: string) => materials.find(item => item.id === materialId)?.name;
  const { values } = protocol;
  const board = calculateBoard(collectBoardNames(protocol));
  const plateMap = plateOf(protocol);
  const plateCards = protocol.cards.filter(
    (card): card is PlateMapCard => card.type === 'plateMap' && card.shows === plateMap.id
  );
  const plateCard = plateCards.find(card => card.id === plateMap.id);
  if (!plateCard) throw new Error('no card for the plate map');
  const panelCard = cardOf(protocol, 'flowCytometryPanel');
  const flowCytometryPanel = protocol.flowCytometryPanels.find(
    panel => panel.id === panelCard.shows
  );
  if (!flowCytometryPanel) throw new Error('no panel for the Flow card');
  const stainName = (id: string | undefined) =>
    flowCytometryPanel.stains.find(stain => stain.id === id)?.name;
  const factorSeries = protocol.series['series-factor'];
  const listSeries = protocol.series['series-list'];
  const amountOf = (name: string) =>
    [material(name).values['amount'], material(name).units['amount']].filter(Boolean).join(' ');
  return {
    cardTypes: protocol.cards.map(card => card.type).sort(),
    plateMapShownOn: plateCards.map(card => card.page).sort(),
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
    setAside: materials.filter(item => item.isSetAside).map(item => item.name),
    isSetAsideOpen: cardOf(protocol, 'materials').isSetAsideOpen,
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
    assaySetupTitle: values.assaySetupTitle,
    calculations: protocol.calculations.items.map(
      item =>
        `${item.materialId ? `${nameOf(item.materialId)} · ` : ''}${item.name} = ${item.formula}`
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
          const entry = sharedPrepSource(board.kinds, ownerNamed(protocol, 'Drug X'), key)?.entry;
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
    showsReplicatesAsOne: plateCard.showsReplicatesAsOne,
    typedCounts: plateMap.counts,
    shownSide: plateCard.side,
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
    'materials',
    'plateMap',
    'plateMap',
    'procedure',
    'values',
  ],
  plateMapShownOn: ['page-plates', 'page-setup'],
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
  assaySetupTitle: 'Plate setup',
  calculations: ['Cell line A · Vol. needed = Cell line A vol./well × 2'],
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

describe('a file holding every card', () => {
  it('opens exactly as it was saved', () => {
    expect(read(everyCardSample)).toEqual(everyCardSample.protocol);
  });

  it('survives a save and reopen unchanged', () => {
    const opened = read(everyCardSample);
    expect(readProtocolFile(writeProtocolFile(opened))).toEqual(opened);
  });

  it('still holds everything it was saved with', () => {
    expect(savedFacts(read(everyCardSample))).toEqual(EVERY_CARD_FACTS);
  });
});
