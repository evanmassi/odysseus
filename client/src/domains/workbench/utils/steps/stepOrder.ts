import type { ProtocolStep } from '@odysseus/shared-schemas';

const isSubStep = (step: ProtocolStep) => step.kind === 'step' && step.level === 2;

function blockEnd(steps: readonly ProtocolStep[], index: number): number {
  const head = steps[index];
  const belongs = (candidate: ProtocolStep) =>
    head.kind === 'section'
      ? candidate.kind !== 'section'
      : !isSubStep(head) && isSubStep(candidate);
  let end = index + 1;
  while (end < steps.length && belongs(steps[end])) end++;
  return end;
}

const isSameRank = (candidate: ProtocolStep, moving: ProtocolStep) =>
  moving.kind === 'section'
    ? candidate.kind === 'section'
    : isSubStep(moving) || !isSubStep(candidate);

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
