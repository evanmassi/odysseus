import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { blankProtocol } from '../protocolFile/blankProtocol';

import { conjugateClashes } from './materialClashes';
import { materialFromGuess } from './materialItems';
import { acceptMaterialReadings, readMaterialReadings, readingStepsText } from './materialReadings';
import { fieldSuggestions } from './materialSuggestions';

import type { MaterialItem, MaterialsBlock, Protocol } from '@odysseus/shared-schemas';

const material = (name: string, group = 'chem', type = 'Chemical'): MaterialItem =>
  materialFromGuess({ group, type, name, values: {}, why: '', source: 'list' }, {});

function protocolWith(stepTexts: string[], items: MaterialItem[] = []) {
  const protocol: Protocol = blankProtocol();
  protocol.pages[0].steps = stepTexts.map((text, index) => ({
    id: `s${index + 1}`,
    kind: 'step',
    level: 1,
    text,
    isMeanwhile: false,
  }));
  const block = protocol.blocks.find(
    (candidate): candidate is MaterialsBlock => candidate.type === 'materials'
  );
  if (!block) throw new Error('blank protocol has no materials block');
  block.items = items;
  return { protocol, block };
}

const read = (protocol: Protocol) =>
  readMaterialReadings(protocol, calculateBoard(collectBoardNames(protocol)));

describe('readMaterialReadings', () => {
  it('finds materials after amounts and after cue words, with the steps that use them', () => {
    const { protocol } = protocolWith([
      'Add 50 µL of Bright-Glo to each well.',
      'Wash twice with PBS.',
      'Resuspend in PBS.',
    ]);
    const readings = read(protocol);
    expect(readings.map(reading => reading.name)).toEqual(['Bright-Glo', 'PBS']);
    expect(readingStepsText(readings[1].uses)).toBe('steps 2, 3');
    expect(readingStepsText(readings[0].uses)).toBe('step 1');
  });

  it('skips referenced names, blanks, lowercase words after bare amounts and non-materials', () => {
    const { protocol } = protocolWith([
      'Add 50 µL {Bright-Glo} and 20 µL ‹Reagent›.',
      'Spin 5 min then add 10 µL buffer.',
      'Repeat with Step 2.',
    ]);
    expect(read(protocol)).toEqual([]);
  });

  it('names materials already on the board as they are written there, and honours ignores', () => {
    const { protocol } = protocolWith(['Wash with Pbs.'], [material('PBS', 'media', 'Buffer')]);
    expect(read(protocol)).toMatchObject([{ name: 'PBS', isOnBoard: true, key: 'material:pbs' }]);
    protocol.ignoredReadings = ['material:pbs'];
    expect(read(protocol)).toEqual([]);
  });
});

describe('acceptMaterialReadings', () => {
  it('adds new materials, links existing ones and rewrites the steps as references', () => {
    const { protocol, block } = protocolWith(
      ['Wash with Pbs, then add 50 µL of Bright-Glo.', 'Wash again with Pbs.'],
      [material('PBS', 'media', 'Buffer')]
    );
    block.foldedGroups = ['chem'];
    acceptMaterialReadings(protocol, block.id, read(protocol), name => material(name));
    expect(protocol.pages[0].steps.map(step => step.text)).toEqual([
      'Wash with {PBS}, then add 50 µL of {Bright-Glo}.',
      'Wash again with {PBS}.',
    ]);
    expect(block.items.map(item => item.name)).toEqual(['PBS', 'Bright-Glo']);
    expect(block.foldedGroups).toEqual([]);
    expect(read(protocol)).toEqual([]);
  });
});

describe('conjugateClashes', () => {
  const antibody = (name: string, conjugate: string, panel = '') => {
    const item = material(name, 'ab', 'Antibody');
    item.values['conjugate'] = conjugate;
    item.values['panel'] = panel;
    return item;
  };

  it('flags two antibodies sharing a fluorochrome in the same panel', () => {
    const clashes = conjugateClashes([
      antibody('CD4', 'BV421'),
      antibody('CD8', 'Brilliant Violet 421'),
      antibody('CD3', 'BV421', 'Tube 2'),
      antibody('CD19', 'Biotin'),
      antibody('CD20', 'Biotin'),
    ]);
    expect(clashes).toHaveLength(1);
    expect(clashes[0].items.map(item => item.name)).toEqual(['CD4', 'CD8']);
    expect(clashes[0].panel).toBe('');
  });
});

describe('fieldSuggestions', () => {
  it('offers values used elsewhere first, then the built-in vendor list', () => {
    const a = material('A');
    a.values['vendor'] = 'Acme Bio';
    const b = material('B');
    b.values['vendor'] = 'Acme Bio';
    const { protocol } = protocolWith([], [a, b]);
    const suggestions = fieldSuggestions(protocol, 'vendor', 'ac', 'other');
    expect(suggestions[0]).toBe('Acme Bio');
    expect(suggestions.length).toBeLessThanOrEqual(8);
    expect(fieldSuggestions(protocol, 'vendor', 'acme bio', 'other')).not.toContain('Acme Bio');
  });
});
