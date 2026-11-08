import { calculateBoard } from '../formulas/boardCalculation';

import { parseStepTemplate, splitProse, templateText } from './stepTemplate';

const calculation = calculateBoard([
  { kind: 'value', id: 'v1', name: 'Volume per well', value: '50', unit: 'µL' },
  {
    kind: 'item',
    id: 'i1',
    name: 'PBS',
    groupTitle: 'Media, buffers, & solutions',
    hint: '',
    label: 'Buffer',
  },
]);

describe('parseStepTemplate', () => {
  it('splits text, references and blanks', () => {
    expect(parseStepTemplate('Add {Volume per well} of ‹buffer› per well.')).toEqual([
      { kind: 'text', text: 'Add ' },
      { kind: 'reference', name: 'Volume per well' },
      { kind: 'text', text: ' of ' },
      { kind: 'blank', label: 'buffer' },
      { kind: 'text', text: ' per well.' },
    ]);
  });

  it('drops empty pieces around leading and adjacent tokens', () => {
    expect(parseStepTemplate('{PBS}{Volume per well}')).toEqual([
      { kind: 'reference', name: 'PBS' },
      { kind: 'reference', name: 'Volume per well' },
    ]);
  });

  it('leaves unmatched braces as text', () => {
    expect(parseStepTemplate('Mix {gently')).toEqual([{ kind: 'text', text: 'Mix {gently' }]);
  });
});

describe('splitProse', () => {
  it('marks quantities and the opening verb', () => {
    expect(splitProse('Incubate for 30 min at 37 °C.', true)).toEqual([
      { kind: 'verb', text: 'Incubate' },
      { kind: 'plain', text: ' for ' },
      { kind: 'quantity', text: '30 min' },
      { kind: 'plain', text: ' at ' },
      { kind: 'quantity', text: '37 °C' },
      { kind: 'plain', text: '.' },
    ]);
  });

  it('marks verbs that start a later sentence but not mid-sentence words', () => {
    expect(splitProse('the plate. Wash it; read it', false)).toEqual([
      { kind: 'plain', text: 'the plate. ' },
      { kind: 'verb', text: 'Wash' },
      { kind: 'plain', text: ' it; ' },
      { kind: 'verb', text: 'read' },
      { kind: 'plain', text: ' it' },
    ]);
  });

  it('only treats a leading verb as one at the start of the step', () => {
    expect(splitProse('Add more', false)).toEqual([{ kind: 'plain', text: 'Add more' }]);
  });

  it('recognizes ratios and named conditions', () => {
    const quantities = splitProse('Dilute 1:1000 overnight on ice', true)
      .filter(piece => piece.kind === 'quantity')
      .map(piece => piece.text);
    expect(quantities).toEqual(['1:1000', 'overnight', 'on ice']);
  });
});

describe('templateText', () => {
  it('shows live values, item names, missing names and blanks', () => {
    expect(templateText('Add {volume per well} of {PBS} and {Nothing}, ‹time›.', calculation)).toBe(
      'Add 50 µL of PBS and Nothing, [time].'
    );
  });
});
