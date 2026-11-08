import type { ProtocolStep } from '@odysseus/shared-schemas';

export type OutlineStep = Extract<ProtocolStep, { kind: 'step' }>;
export type OutlineSection = Extract<ProtocolStep, { kind: 'section' }>;

interface StepGroup {
  section?: OutlineSection;
  steps: OutlineStep[];
}

export function groupStepsBySection(steps: readonly ProtocolStep[]): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const step of steps) {
    if (step.kind === 'section') groups.push({ section: step, steps: [] });
    else if (groups.length) groups[groups.length - 1].steps.push(step);
    else groups.push({ steps: [step] });
  }
  return groups;
}

export function precedingMainSteps(
  steps: readonly ProtocolStep[],
  numbers: ReadonlyMap<string, string>
): Map<string, string> {
  const preceding = new Map<string, string>();
  let lastMain: string | undefined;
  for (const step of steps) {
    if (step.kind !== 'step' || step.level === 2) continue;
    if (lastMain) preceding.set(step.id, lastMain);
    if (!step.isMeanwhile) lastMain = (numbers.get(step.id) ?? '').replace('.', '');
  }
  return preceding;
}
