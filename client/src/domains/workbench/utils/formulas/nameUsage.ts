import { stepLabels } from '../steps/stepNumbering';

import { nameKey, type BoardCalculation } from './boardCalculation';
import { formulaNameReferences } from './formulaParser';

import type { Protocol } from '@odysseus/shared-schemas';

export interface NameUsage {
  steps: string[];
  formulaCount: number;
}

const STEP_REFERENCE = /\{([^}]+)\}/g;

export function nameUsage(
  protocol: Protocol,
  calculation: BoardCalculation,
  ids: readonly string[]
): Map<string, NameUsage> {
  const wanted = new Set(ids);
  const ownerByName = new Map<string, string>();
  for (const [key, entry] of calculation.names) {
    const owner = wanted.has(entry.id) ? entry.id : entry.id.split(':')[0];
    if (wanted.has(owner)) ownerByName.set(key, owner);
  }
  const usage = new Map(ids.map(id => [id, { steps: [] as string[], formulaCount: 0 }]));
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
  const names = [...calculation.names.values()].map(entry => entry.name);
  for (const block of protocol.blocks) {
    if (block.type !== 'formula') continue;
    for (const formula of block.items) {
      const owners = new Set(
        formulaNameReferences(formula.expr, names).flatMap(
          name => ownerByName.get(nameKey(name)) ?? []
        )
      );
      for (const owner of owners) {
        const use = usage.get(owner);
        if (use) use.formulaCount += 1;
      }
    }
  }
  return usage;
}

export function usageSummary({ steps, formulaCount }: NameUsage): string {
  const parts: string[] = [];
  if (steps.length) parts.push(`${steps.length === 1 ? 'Step' : 'Steps'} ${steps.join(', ')}`);
  if (formulaCount) parts.push(`${formulaCount} formula${formulaCount === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export const usageTitle = (name: string, usage: string): string =>
  usage ? `${name}: used in ${usage}` : `${name}: not used in any step or formula`;
