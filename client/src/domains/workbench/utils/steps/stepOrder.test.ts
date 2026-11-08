import { moveStepBlock, moveStepDown, moveStepUp } from './stepOrder';

import type { ProtocolStep } from '@odysseus/shared-schemas';

const step = (id: string, level: 1 | 2 = 1): ProtocolStep => ({
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
