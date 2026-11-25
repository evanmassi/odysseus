import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { readReference } from '../formulas/nameReferences';
import { materialNamed } from '../materials/materialLookup';

import { dilutionRuns, type DilutionRun } from './dilutionRuns';

import type { SolvedBoard } from '../formulas/boardCalculation';
import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

export interface DiluentUse {
  materialId: string;
  need: string;
}

export const ownDiluent = (run: DilutionRun): string => run.series.prep?.diluent ?? '';

export const runDiluents = (
  runs: readonly DilutionRun[],
  protocolDiluent: string
): Map<string, string> =>
  new Map(runs.map(run => [run.key, ownDiluent(run).trim() || protocolDiluent.trim()]));

export interface DiluentChoice {
  key: string;
  name: string;
  material: MaterialItem | undefined;
}

export function diluentChoice(protocol: Pick<Protocol, 'materials'>, saved: string): DiluentChoice {
  const { name, id } = readReference(saved);
  const material =
    protocol.materials.items.find(item => item.id === id) ?? materialNamed(protocol, name);
  return { key: material?.id ?? normalizeMaterialKey(name), name, material };
}

export const diluentNeedId = (choice: DiluentChoice): string => `dilutions:diluent:${choice.key}`;

function needText(board: SolvedBoard, choice: DiluentChoice): string {
  const result = board.results.get(diluentNeedId(choice));
  return result?.status === 'ok' && 'text' in result.output ? result.output.text : '';
}

export function diluentUses(
  protocol: Pick<Protocol, 'diluent' | 'materials' | 'plateMaps'>,
  board: SolvedBoard
): DiluentUse[] {
  const runs = dilutionRuns(protocol);
  const diluents = runDiluents(runs, protocol.diluent);
  const byMaterial = new Map<string, DiluentUse>();
  for (const run of runs) {
    const diluent = diluents.get(run.key);
    const choice = diluent ? diluentChoice(protocol, diluent) : undefined;
    const material = choice?.material;
    if (!choice || !material || byMaterial.has(material.id)) continue;
    byMaterial.set(material.id, { materialId: material.id, need: needText(board, choice) });
  }
  return [...byMaterial.values()];
}
