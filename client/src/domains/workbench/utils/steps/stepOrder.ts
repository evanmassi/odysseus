import type { OutlineStep } from './stepOutline';
import type { ProtocolStep } from '@odysseus/shared-schemas';

type StepLevel = OutlineStep['level'];

export const DEEPEST_STEP_LEVEL: StepLevel = 3;

const depthOf = (step: ProtocolStep) => (step.kind === 'section' ? 0 : step.level);

function blockEnd(steps: readonly ProtocolStep[], index: number): number {
  const depth = depthOf(steps[index]);
  let end = index + 1;
  while (end < steps.length && depthOf(steps[end]) > depth) end++;
  return end;
}

const isSameRank = (candidate: ProtocolStep, moving: ProtocolStep) =>
  depthOf(candidate) <= depthOf(moving);

export function moveStepBlock(
  steps: ProtocolStep[],
  id: string,
  targetId: string,
  isAfter: boolean
): ProtocolStep[] {
  const from = steps.findIndex(step => step.id === id);
  if (from < 0) return steps;
  const end = blockEnd(steps, from);
  const moving = steps.slice(from, end);
  if (moving.some(step => step.id === targetId)) return steps;
  const rest = [...steps.slice(0, from), ...steps.slice(end)];
  let to = rest.findIndex(step => step.id === targetId);
  if (to < 0) return steps;
  if (isAfter) {
    to =
      rest[to].kind === 'section' && steps[from].kind !== 'section' ? to + 1 : blockEnd(rest, to);
  }
  rest.splice(to, 0, ...moving);
  return rest;
}

export function moveStepUp(steps: ProtocolStep[], id: string): ProtocolStep[] {
  const index = steps.findIndex(step => step.id === id);
  for (let candidate = index - 1; candidate >= 0; candidate--) {
    if (isSameRank(steps[candidate], steps[index])) {
      return moveStepBlock(steps, id, steps[candidate].id, false);
    }
  }
  return steps;
}

export function moveStepDown(steps: ProtocolStep[], id: string): ProtocolStep[] {
  const index = steps.findIndex(step => step.id === id);
  if (index < 0) return steps;
  for (let candidate = blockEnd(steps, index); candidate < steps.length; candidate++) {
    if (isSameRank(steps[candidate], steps[index])) {
      return moveStepBlock(steps, id, steps[candidate].id, true);
    }
  }
  return steps;
}

export function insertSubStep(steps: ProtocolStep[], parentId: string, id: string): ProtocolStep[] {
  const index = steps.findIndex(step => step.id === parentId);
  const parent = steps[index];
  if (parent?.kind !== 'step' || parent.level >= DEEPEST_STEP_LEVEL) return steps;
  const subStep: OutlineStep = {
    id,
    kind: 'step',
    level: (parent.level + 1) as StepLevel,
    text: '',
    isMeanwhile: false,
  };
  const end = blockEnd(steps, index);
  return [...steps.slice(0, end), subStep, ...steps.slice(end)];
}

export function levelShifts(
  steps: readonly ProtocolStep[],
  id: string
): { canMoveIn: boolean; canMoveOut: boolean } {
  const index = steps.findIndex(step => step.id === id);
  const step = steps[index];
  if (step?.kind !== 'step') return { canMoveIn: false, canMoveOut: false };
  const block = steps.slice(index, blockEnd(steps, index));
  const previous = steps[index - 1];
  return {
    canMoveIn:
      previous?.kind === 'step' &&
      previous.level >= step.level &&
      block.every(member => depthOf(member) < DEEPEST_STEP_LEVEL),
    canMoveOut: step.level > 1,
  };
}

export function shiftStepLevel(steps: ProtocolStep[], id: string, shift: 1 | -1): ProtocolStep[] {
  const { canMoveIn, canMoveOut } = levelShifts(steps, id);
  if (!(shift > 0 ? canMoveIn : canMoveOut)) return steps;
  const index = steps.findIndex(step => step.id === id);
  const end = blockEnd(steps, index);
  return steps.map((step, at) =>
    at >= index && at < end && step.kind === 'step'
      ? { ...step, level: (step.level + shift) as StepLevel }
      : step
  );
}
