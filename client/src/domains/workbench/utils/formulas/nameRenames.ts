import { nameKey, type SolvedBoard } from './boardCalculation';

import type { Protocol } from '@odysseus/shared-schemas';

interface NameRenames {
  byOldName: ReadonlyMap<string, string>;
  byItemPrefix: ReadonlyMap<string, string>;
}

const STEP_REFERENCE = /\{([^}]+)\}/g;
const isWordCharacter = (character: string | undefined) => /[A-Za-z0-9_µ°]/.test(character ?? '');

export function findRenames(
  knownNames: ReadonlyMap<string, string>,
  board: SolvedBoard
): NameRenames | undefined {
  const byOldName = new Map<string, string>();
  const byItemPrefix = new Map<string, string>();
  for (const entry of board.names.values()) {
    const previous = knownNames.get(entry.id);
    if (
      !previous ||
      nameKey(previous) === nameKey(entry.name) ||
      board.names.has(nameKey(previous))
    )
      continue;
    byOldName.set(nameKey(previous), entry.name);
    if (entry.kind === 'item') byItemPrefix.set(`${nameKey(previous)} `, entry.name);
  }
  return byOldName.size ? { byOldName, byItemPrefix } : undefined;
}

function rewriteExpression(
  expression: string,
  previousNames: readonly string[],
  renames: NameRenames
): string {
  let rewritten = '';
  let index = 0;
  while (index < expression.length) {
    const hit = isWordCharacter(expression[index - 1])
      ? undefined
      : previousNames.find(
          name =>
            expression.slice(index, index + name.length).toLowerCase() === name.toLowerCase() &&
            !isWordCharacter(expression[index + name.length])
        );
    if (!hit) {
      rewritten += expression[index++];
      continue;
    }
    rewritten +=
      renames.byOldName.get(hit.toLowerCase()) ?? expression.slice(index, index + hit.length);
    index += hit.length;
  }
  return rewritten;
}

export function applyRenames(
  draft: Protocol,
  knownNames: ReadonlyMap<string, string>,
  renames: NameRenames
): void {
  const renamed = (text: string) => renames.byOldName.get(nameKey(text));
  for (const card of draft.blocks) {
    if (card.type !== 'plate') continue;
    for (const line of card.lines) {
      line.name = renamed(line.name) ?? line.name;
      for (const value of line.values) value.text = renamed(value.text) ?? value.text;
    }
  }
  applyReferenceRenames(draft, knownNames, renames);
}

export function applyReferenceRenames(
  draft: Protocol,
  knownNames: ReadonlyMap<string, string>,
  renames: NameRenames
): void {
  const previousNames = [...new Set(knownNames.values())].sort((a, b) => b.length - a.length);
  const renamed = (text: string) => renames.byOldName.get(nameKey(text));
  for (const card of draft.blocks) {
    if (card.type === 'formula') {
      for (const item of card.items) {
        item.expr = rewriteExpression(item.expr, previousNames, renames);
        const owner = [...renames.byItemPrefix.keys()].find(prefix =>
          item.name.toLowerCase().startsWith(prefix)
        );
        if (owner)
          item.name = `${renames.byItemPrefix.get(owner)} ${item.name.slice(owner.length)}`;
      }
    }
    if (card.type === 'plate') {
      for (const series of Object.values(card.series)) {
        if (!('start' in series)) continue;
        series.start = renamed(series.start) ?? series.start;
        series.fold = renamed(series.fold) ?? series.fold;
      }
    }
  }
  for (const page of draft.pages) {
    for (const step of page.steps) {
      step.text = step.text.replace(STEP_REFERENCE, (whole, reference: string) => {
        const next = renamed(reference);
        return next ? `{${next}}` : whole;
      });
    }
  }
}
