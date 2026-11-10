import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';
import { blankProtocol } from '../protocolFile/blankProtocol';

import { acceptStepReadings, readingStepsText, readStepReadings } from './stepReadings';

import type { MaterialItem, MaterialsBlock, Protocol } from '@odysseus/shared-schemas';

const material = (name: string, group = 'chem', type = 'Chemical'): MaterialItem =>
  materialFromGuess({ group, type, name, values: {}, why: '', source: 'list' }, EMPTY_LAB_MEMORY);

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

const readAll = (protocol: Protocol) =>
  readStepReadings(protocol, calculateBoard(collectBoardNames(protocol)));
const read = (protocol: Protocol) => readAll(protocol).materials;

describe('material readings', () => {
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

  it('reads steps written in the past tense', () => {
    const { protocol } = protocolWith(['Added Trypsin to the flask.', 'Took Supernatant.']);
    expect(read(protocol).map(reading => reading.name)).toEqual(['Trypsin', 'Supernatant']);
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

describe('accepting readings', () => {
  it('adds new materials, links existing ones and rewrites the steps as references', () => {
    const { protocol, block } = protocolWith(
      ['Wash with Pbs, then add 50 µL of Bright-Glo.', 'Wash again with Pbs.'],
      [material('PBS', 'media', 'Buffer')]
    );
    block.foldedGroups = ['chem'];
    acceptStepReadings(protocol, { materials: read(protocol) }, name => material(name));
    expect(protocol.pages[0].steps.map(step => step.text)).toEqual([
      'Wash with {PBS}, then add 50 µL of {Bright-Glo}.',
      'Wash again with {PBS}.',
    ]);
    expect(block.items.map(item => item.name)).toEqual(['PBS', 'Bright-Glo']);
    expect(block.foldedGroups).toEqual([]);
    expect(read(protocol)).toEqual([]);
  });

  it('adds a read value under its material and rewrites both names as references', () => {
    const { protocol, block } = protocolWith(['Add 50 µL of Bright-Glo per well.']);
    acceptStepReadings(protocol, { values: readAll(protocol).values }, name => material(name));
    expect(protocol.pages[0].steps[0].text).toBe(
      'Add {Bright-Glo volume per well} of {Bright-Glo} per well.'
    );
    expect(block.items.map(item => item.name)).toEqual(['Bright-Glo']);
    const values = protocol.blocks.find(candidate => candidate.type === 'values');
    expect(values?.type === 'values' && values.items.at(-1)).toMatchObject({
      name: 'Volume per well',
      value: '50',
      unit: 'µL',
    });
  });
});

describe('value readings', () => {
  it('names amounts after the material they measure', () => {
    const { protocol } = protocolWith(
      ['Add 50 µL of Bright-Glo per well.', 'Treat with 10 µM {PBS}.'],
      [material('PBS', 'media', 'Buffer')]
    );
    expect(readAll(protocol).values.map(({ name, value, unit }) => [name, value, unit])).toEqual([
      ['Bright-Glo volume per well', '50', 'µL'],
      ['PBS concentration', '10', 'µM'],
    ]);
  });

  it('offers a condition once it repeats across steps, and skips conflicting amounts', () => {
    const once = protocolWith(['Incubate 30 min at 37 °C.']).protocol;
    expect(readAll(once).values).toEqual([]);
    const twice = protocolWith(['Incubate 30 min at 37 °C.', 'Incubate 30 min again.']).protocol;
    expect(readAll(twice).values.map(({ name }) => name)).toEqual(['Incubation time']);
    const past = protocolWith(['Spun 5 min at 4 °C.', 'Centrifuged 5 min again.']).protocol;
    expect(readAll(past).values.map(({ name }) => name)).toEqual(['Spin time']);
    const conflict = protocolWith([
      'Add 50 µL of Bright-Glo.',
      'Add 20 µL of Bright-Glo.',
    ]).protocol;
    expect(readAll(conflict).values).toEqual([]);
  });
});
