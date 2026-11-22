import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { materialFromGuess } from '../materials/materialItems';
import { EMPTY_LAB_MEMORY } from '../materials/materialMemory';
import { blankProtocol } from '../protocolFile/blankProtocol';

import { acceptStepReadings, readingStepsText, readStepReadings } from './stepReadings';
import { templateText } from './stepTemplate';

import type { MaterialItem, MaterialsCard, Protocol } from '@odysseus/shared-schemas';

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
  const card = protocol.cards.find(
    (candidate): candidate is MaterialsCard => candidate.type === 'materials'
  );
  if (!card) throw new Error('blank protocol has no materials block');
  card.items = items;
  return { protocol, card };
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
    protocol.ignoredSuggestions = ['material:pbs'];
    expect(read(protocol)).toEqual([]);
  });
});

describe('accepting readings', () => {
  it('adds new materials, links existing ones and rewrites the steps as references', () => {
    const { protocol, card } = protocolWith(
      ['Wash with Pbs, then add 50 µL of Bright-Glo.', 'Wash again with Pbs.'],
      [material('PBS', 'media', 'Buffer')]
    );
    card.foldedGroups = ['chem'];
    acceptStepReadings(protocol, { materials: read(protocol) }, name => material(name));
    expect(protocol.pages[0].steps.map(step => step.text)).toEqual([
      'Wash with {PBS}, then add 50 µL of {Bright-Glo}.',
      'Wash again with {PBS}.',
    ]);
    expect(card.items.map(item => item.name)).toEqual(['PBS', 'Bright-Glo']);
    expect(card.foldedGroups).toEqual([]);
    expect(read(protocol)).toEqual([]);
  });

  it('reads a material by its short name, links it by its full name and shows the short name', () => {
    const medium = material('ImmunoCult™-XF T Cell Expansion Medium', 'media', 'Medium');
    medium.shownFields.push('short-name');
    medium.values['short-name'] = 'ImmunoCult XF';
    const { protocol } = protocolWith(['Resuspend in ImmunoCult XF.'], [medium]);
    expect(read(protocol)).toMatchObject([{ name: medium.name, isOnBoard: true }]);
    acceptStepReadings(protocol, { materials: read(protocol) }, name => material(name));
    const [step] = protocol.pages[0].steps;
    expect(step.text).toBe(`Resuspend in {${medium.name}}.`);
    expect(templateText(step.text, calculateBoard(collectBoardNames(protocol)))).toBe(
      'Resuspend in ImmunoCult XF.'
    );
  });

  it('adds a read value under its material and rewrites both names as references', () => {
    const { protocol, card } = protocolWith(['Add 50 µL of Bright-Glo per well.']);
    acceptStepReadings(protocol, { values: readAll(protocol).values }, name => material(name));
    expect(protocol.pages[0].steps[0].text).toBe(
      'Add {Bright-Glo vol./well} of {Bright-Glo} per well.'
    );
    expect(card.items.map(item => item.name)).toEqual(['Bright-Glo']);
    const values = protocol.cards.find(candidate => candidate.type === 'values');
    expect(values?.type === 'values' && values.items.at(-1)).toMatchObject({
      name: 'Vol./well',
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
      ['Bright-Glo vol./well', '50', 'µL'],
      ['PBS final conc.', '10', 'µM'],
    ]);
  });

  it('offers a condition once it repeats across steps, and skips conflicting amounts', () => {
    const once = protocolWith(['Incubate 30 min at 37 °C.']).protocol;
    expect(readAll(once).values).toEqual([]);
    const twice = protocolWith(['Incubate 30 min at 37 °C.', 'Incubate 30 min again.']).protocol;
    expect(readAll(twice).values.map(({ name }) => name)).toEqual(['Incubation time']);
    const past = protocolWith(['Spun 5 min at 4 °C.', 'Centrifuged 5 min again.']).protocol;
    expect(readAll(past).values.map(({ name }) => name)).toEqual(['Centrifuge time']);
    const conflict = protocolWith([
      'Add 50 µL of Bright-Glo.',
      'Add 20 µL of Bright-Glo.',
    ]).protocol;
    expect(readAll(conflict).values).toEqual([]);
  });
});
