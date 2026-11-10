import { stepLabels, stepNumbers } from './stepNumbering';
import { groupStepsBySection, precedingMainSteps } from './stepOutline';

import type { ProtocolStep } from '@odysseus/shared-schemas';

const step = (id: string, level: 1 | 2 | 3 = 1, isMeanwhile = false): ProtocolStep => ({
  id,
  kind: 'step',
  level,
  text: id,
  isMeanwhile,
});
const section = (id: string): ProtocolStep => ({ id, kind: 'section', text: id });

const steps = [
  step('loose'),
  section('s1'),
  step('a'),
  step('a1', 2),
  step('a2', 2),
  step('b', 1, true),
  section('s2'),
  step('c'),
  step('c1', 2),
];

describe('stepNumbers', () => {
  it('numbers sections in roman, steps across sections and sub-steps by letter', () => {
    expect(Object.fromEntries(stepNumbers(steps))).toEqual({
      loose: '1.',
      s1: 'I.',
      a: '2.',
      a1: 'a.',
      a2: 'b.',
      b: '3.',
      s2: 'II.',
      c: '4.',
      c1: 'a.',
    });
  });

  it('labels sub-steps with their parent number, per page', () => {
    const labels = stepLabels([
      { id: 'p1', name: 'One', steps },
      { id: 'p2', name: 'Two', steps: [step('d')] },
    ]);
    expect(labels.get('a2')).toBe('2b');
    expect(labels.get('c1')).toBe('4a');
    expect(labels.get('d')).toBe('1');
    expect(labels.has('s1')).toBe(false);
  });

  it('numbers sub-sub-steps in small roman under their sub-step, restarting for each', () => {
    const nested = [
      step('a'),
      step('a1', 2),
      step('x', 3),
      step('y', 3),
      step('a2', 2),
      step('z', 3),
    ];
    expect(Object.fromEntries(stepNumbers(nested))).toEqual({
      a: '1.',
      a1: 'a.',
      x: 'i.',
      y: 'ii.',
      a2: 'b.',
      z: 'i.',
    });
    const labels = stepLabels([{ id: 'p1', name: 'One', steps: nested }]);
    expect(labels.get('y')).toBe('1a.ii');
    expect(labels.get('z')).toBe('1b.i');
    expect(labels.get('a2')).toBe('1b');
  });
});

describe('groupStepsBySection', () => {
  it('groups steps under their section, with leading steps in an untitled group', () => {
    const groups = groupStepsBySection(steps).map(group => ({
      section: group.section?.id,
      steps: group.steps.map(item => item.id),
    }));
    expect(groups).toEqual([
      { section: undefined, steps: ['loose'] },
      { section: 's1', steps: ['a', 'a1', 'a2', 'b'] },
      { section: 's2', steps: ['c', 'c1'] },
    ]);
  });

  it('keeps an empty section as its own group', () => {
    expect(groupStepsBySection([section('s1')])).toEqual([{ section: section('s1'), steps: [] }]);
  });
});

describe('precedingMainSteps', () => {
  it('names the main step a step could run during, skipping meanwhile steps', () => {
    const outline = [step('a'), step('b', 1, true), step('c', 1, true), step('d')];
    expect(Object.fromEntries(precedingMainSteps(outline, stepNumbers(outline)))).toEqual({
      b: '1',
      c: '1',
      d: '1',
    });
  });

  it('ignores sub-steps and the first step', () => {
    expect(Object.fromEntries(precedingMainSteps(steps, stepNumbers(steps)))).toEqual({
      a: '1',
      b: '2',
      c: '2',
    });
  });
});
