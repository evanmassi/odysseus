import { stepLabels } from '../steps/stepNumbering';

import { nameKey, type SolvedBoard } from './boardCalculation';
import { formulaNameReferences } from './formulaParser';

import type { Protocol } from '@odysseus/shared-schemas';

export interface NameUsage {
  steps: string[];
  calculationCount: number;
}

const STEP_REFERENCE = /\{([^}]+)\}/g;

export function nameUsage(
  protocol: Protocol,
  board: SolvedBoard,
  ids: readonly string[]
): Map<string, NameUsage> {
  const wanted = new Set(ids);
  const ownerByName = new Map<string, string>();
  for (const [key, entry] of board.names) {
    const owner = wanted.has(entry.id) ? entry.id : entry.id.split(':')[0];
    if (wanted.has(owner)) ownerByName.set(key, owner);
  }
  const usage = new Map(ids.map(id => [id, { steps: [] as string[], calculationCount: 0 }]));
  const labels = stepLabels(protocol.pages);
  for (const page of protocol.pages) {
    for (const step of page.steps) {
      if (step.kind !== 'step') continue;
      for (const [, reference] of step.text.matchAll(STEP_REFERENCE)) {
        const use = usage.get(ownerByName.get(nameKey(reference)) ?? '');
        const label = labels.get(step.id) ?? '';
        if (use && !use.steps.includes(label)) use.steps.push(label);
      }
    }
  }
  const names = [...board.names.values()].map(entry => entry.name);
  const typedExprs = protocol.calculations.items.map(calculation => calculation.formula);
  const generatedExprs = [...board.names.values()].flatMap(entry =>
    entry.kind === 'calculation' && entry.workedOut ? [entry.formula] : []
  );
  for (const expr of [...typedExprs, ...generatedExprs]) {
    const owners = new Set(
      formulaNameReferences(expr, names).flatMap(name => ownerByName.get(nameKey(name)) ?? [])
    );
    for (const owner of owners) {
      const use = usage.get(owner);
      if (use) use.calculationCount += 1;
    }
  }
  return usage;
}

export function usageSummary({ steps, calculationCount }: NameUsage): string {
  const parts: string[] = [];
  if (steps.length) parts.push(`${steps.length === 1 ? 'Step' : 'Steps'} ${steps.join(', ')}`);
  if (calculationCount)
    parts.push(`${calculationCount} calculation${calculationCount === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export const usageTitle = (usage: string): string =>
  usage ? `Used in ${usage}` : 'Not used in any step or calculation';
