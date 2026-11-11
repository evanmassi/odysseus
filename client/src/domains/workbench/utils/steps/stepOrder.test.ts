import {
  insertSection,
  insertStepBelow,
  insertSubStep,
  levelShifts,
  moveStepBlock,
  moveStepDown,
  moveStepUp,
  shiftStepLevel,
} from './stepOrder';

import type { ProtocolStep } from '@odysseus/shared-schemas';

const step = (id: string, level: 1 | 2 | 3 = 1): ProtocolStep => ({
  id,
  kind: 'step',
  level,
  text: id,
  isMeanwhile: false,
});
const section = (id: string): ProtocolStep => ({ id, kind: 'section', text: id });

const steps = [
  section('S1'),
  step('a'),
  step('a1', 2),
  step('b'),
  section('S2'),
  step('c'),
  step('c1', 2),
  step('c2', 2),
];

const ids = (list: readonly ProtocolStep[]) => list.map(item => item.id).join(' ');

describe('moveStepBlock', () => {
  it('carries a step’s sub-steps with it', () => {
    expect(ids(moveStepBlock(steps, 'a', 'b', true))).toBe('S1 b a a1 S2 c c1 c2');
  });

  it('carries a section’s steps with it', () => {
    expect(ids(moveStepBlock(steps, 'S2', 'S1', false))).toBe('S2 c c1 c2 S1 a a1 b');
  });

  it('drops a step after a section heading at the top of that section', () => {
    expect(ids(moveStepBlock(steps, 'b', 'S2', true))).toBe('S1 a a1 S2 b c c1 c2');
  });

  it('drops a section after another section’s whole block', () => {
    expect(ids(moveStepBlock(steps, 'S1', 'S2', true))).toBe('S2 c c1 c2 S1 a a1 b');
  });

  it('moves a lone sub-step', () => {
    expect(ids(moveStepBlock(steps, 'c2', 'a1', false))).toBe('S1 a c2 a1 b S2 c c1');
  });

  it('leaves the order alone when dropped onto itself or its own sub-steps', () => {
    expect(moveStepBlock(steps, 'c', 'c1', true)).toBe(steps);
    expect(moveStepBlock(steps, 'missing', 'a', true)).toBe(steps);
  });
});

describe('moveStepUp and moveStepDown', () => {
  it('swap a step with the previous or next main step, sub-steps included', () => {
    expect(ids(moveStepUp(steps, 'b'))).toBe('S1 b a a1 S2 c c1 c2');
    expect(ids(moveStepDown(steps, 'a'))).toBe('S1 b a a1 S2 c c1 c2');
  });

  it('move a step across a section boundary', () => {
    expect(ids(moveStepUp(steps, 'c'))).toBe('S1 a a1 b c c1 c2 S2');
    expect(ids(moveStepDown(steps, 'b'))).toBe('S1 a a1 S2 b c c1 c2');
  });

  it('swap sub-steps among themselves', () => {
    expect(ids(moveStepDown(steps, 'c1'))).toBe('S1 a a1 b S2 c c2 c1');
  });

  it('swap whole sections', () => {
    expect(ids(moveStepDown(steps, 'S1'))).toBe('S2 c c1 c2 S1 a a1 b');
  });

  it('do nothing at the ends', () => {
    expect(moveStepUp(steps, 'S1')).toBe(steps);
    expect(moveStepDown(steps, 'c2')).toBe(steps);
  });
});

const nested = [step('a'), step('a1', 2), step('a1x', 3), step('a2', 2), step('b')];
const levels = (list: readonly ProtocolStep[]) =>
  list.map(item => (item.kind === 'step' ? `${item.id}:${item.level}` : item.id)).join(' ');

describe('sub-sub-steps', () => {
  it('move with their sub-step, and both move with the step', () => {
    expect(ids(moveStepDown(nested, 'a1'))).toBe('a a2 a1 a1x b');
    expect(ids(moveStepBlock(nested, 'a', 'b', true))).toBe('b a a1 a1x a2');
  });
});

describe('insertSubStep', () => {
  it('adds the sub-step after everything already under its parent', () => {
    expect(levels(insertSubStep(nested, 'a', 'new'))).toBe('a:1 a1:2 a1x:3 a2:2 new:2 b:1');
    expect(levels(insertSubStep(nested, 'a1', 'new'))).toBe('a:1 a1:2 a1x:3 new:3 a2:2 b:1');
  });

  it('adds nothing under the deepest level', () => {
    expect(insertSubStep(nested, 'a1x', 'new')).toBe(nested);
  });
});

describe('insertStepBelow', () => {
  it('adds a step at the same level after everything under it', () => {
    expect(levels(insertStepBelow(nested, 'a', 'new'))).toBe('a:1 a1:2 a1x:3 a2:2 new:1 b:1');
    expect(levels(insertStepBelow(nested, 'a1', 'new'))).toBe('a:1 a1:2 a1x:3 new:2 a2:2 b:1');
    expect(levels(insertStepBelow(nested, 'b', 'new'))).toBe('a:1 a1:2 a1x:3 a2:2 b:1 new:1');
  });

  it('keeps a step added below the last step of a section inside that section', () => {
    expect(ids(insertStepBelow(steps, 'b', 'new'))).toBe('S1 a a1 b new S2 c c1 c2');
  });

  it('adds a step at the top of a section when added below its heading', () => {
    expect(levels(insertStepBelow(steps, 'S2', 'new'))).toBe(
      'S1 a:1 a1:2 b:1 S2 new:1 c:1 c1:2 c2:2'
    );
  });
});

describe('insertSection', () => {
  it('adds a section below a main step and everything under it', () => {
    expect(ids(insertSection(steps, 'a', 'new', true))).toBe('S1 a a1 new b S2 c c1 c2');
    expect(ids(insertSection(nested, 'a', 'new', true))).toBe('a a1 a1x a2 new b');
  });

  it('adds a section above the first step', () => {
    expect(ids(insertSection(nested, 'a', 'new', false))).toBe('new a a1 a1x a2 b');
  });

  it('adds no section at a sub-step, a heading, or above a section’s first step', () => {
    expect(insertSection(steps, 'a1', 'new', true)).toBe(steps);
    expect(insertSection(steps, 'S2', 'new', true)).toBe(steps);
    expect(insertSection(steps, 'c', 'new', false)).toBe(steps);
  });
});

describe('shiftStepLevel', () => {
  it('moves a step in or out with everything under it', () => {
    expect(levels(shiftStepLevel(nested, 'b', 1))).toBe('a:1 a1:2 a1x:3 a2:2 b:2');
    expect(levels(shiftStepLevel(nested, 'a1', -1))).toBe('a:1 a1:1 a1x:2 a2:2 b:1');
  });

  it('only moves in under a step that can hold it, and keeps within three levels', () => {
    expect(levelShifts(nested, 'a')).toEqual({ canMoveIn: false, canMoveOut: false });
    expect(levelShifts(nested, 'a1')).toEqual({ canMoveIn: false, canMoveOut: true });
    expect(levelShifts(nested, 'a2')).toEqual({ canMoveIn: true, canMoveOut: true });
    expect(levelShifts(nested, 'a1x')).toEqual({ canMoveIn: false, canMoveOut: true });
    expect(shiftStepLevel(nested, 'a1', 1)).toBe(nested);
  });
});
