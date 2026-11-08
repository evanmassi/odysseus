import { PASTE_EXAMPLE, parseProtocolText } from './protocolText';

const outline = (raw: string) =>
  parseProtocolText(raw).map(item =>
    item.kind === 'section' ? `§ ${item.text}` : `${item.level === 2 ? '  ' : ''}${item.text}`
  );

describe('parseProtocolText', () => {
  it('reads the paste example into sections, steps, sub-steps and notes', () => {
    expect(outline(PASTE_EXAMPLE)).toEqual([
      '§ PREPARE THE PLATE',
      'Dilute the capture antibody to its working concentration in coating buffer and add 100 µL per well. Seal and incubate overnight at 4 °C.',
      'Wash the plate three times.',
      '  Fill each well with 300 µL of wash buffer and aspirate.',
      '  After the last wash, invert the plate and blot it on paper towels.',
      'Add 200 µL of blocking buffer per well and incubate for at least 1 hour at room temperature. Note: blocked plates can be stored sealed at 4 °C for up to two weeks.',
      '§ RUN THE ASSAY',
      'Add 100 µL of standards or samples per well. Incubate 2 hours at room temperature.',
      'Wash as in step 2.',
    ]);
  });

  it('gives every step a level and no meanwhile flag', () => {
    const steps = parseProtocolText(PASTE_EXAMPLE).filter(item => item.kind === 'step');
    expect(steps.every(step => step.kind === 'step' && !step.isMeanwhile)).toBe(true);
  });

  it('returns nothing for blank text', () => {
    expect(parseProtocolText('  \n\n \r\n')).toEqual([]);
  });

  it('recognizes roman, word and colon headings', () => {
    expect(outline('I. Coating\n1. Coat.\nDay 2\n2. Block.\nDetection:\n3. Read.')).toEqual([
      '§ Coating',
      'Coat.',
      '§ Day 2',
      'Block.',
      '§ Detection',
      'Read.',
    ]);
  });

  it('treats small roman numerals after a step as sub-steps, not headings', () => {
    expect(outline('1. Spin down.\ni. Remove the supernatant.\nii. Resuspend.')).toEqual([
      'Spin down.',
      '  Remove the supernatant.',
      '  Resuspend.',
    ]);
  });

  it('accepts step-prefixed and colon numbering', () => {
    expect(outline('Step 1: Thaw cells.\nStep 2) Count them.')).toEqual([
      'Thaw cells.',
      'Count them.',
    ]);
  });

  it('nests bullets under a step and keeps loose bullets as steps', () => {
    expect(outline('- Thaw.\n- Count.')).toEqual(['Thaw.', 'Count.']);
    expect(outline('1. Prepare buffers.\n• wash buffer\n• blocking buffer')).toEqual([
      'Prepare buffers.',
      '  wash buffer',
      '  blocking buffer',
    ]);
  });

  it('reads an all-caps line as a heading even when bulleted', () => {
    expect(outline('1. Prepare.\n• PBS')).toEqual(['Prepare.', '§ • PBS']);
  });

  it('joins hyphenated and wrapped lines and normalizes CRLF and spacing', () => {
    expect(outline('1. Incu-\r\nbate   for\r\n  30 min.')).toEqual(['Incubate for 30 min.']);
  });

  it('starts a new step after a gap when nothing is numbered', () => {
    expect(outline('Thaw the cells\nin a water bath.\n\nCount them.')).toEqual([
      'Thaw the cells in a water bath.',
      'Count them.',
    ]);
  });

  it('keeps notes that come before any step as their own step', () => {
    expect(outline('Note: work on ice.')).toEqual(['Note: work on ice.']);
  });

  it('capitalizes note labels it folds into a step', () => {
    expect(outline('1. Add the dye.\nCAUTION - light sensitive.')).toEqual([
      'Add the dye. Caution: light sensitive.',
    ]);
  });
});
