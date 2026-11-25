import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { materialNamed } from '../materials/materialLookup';

import { dilutionRuns, type DilutionRun } from './dilutionRuns';

import type { SolvedBoard } from '../formulas/boardCalculation';
import type { Protocol } from '@odysseus/shared-schemas';

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

export const diluentNeedId = (material: string): string =>
  `dilutions:diluent:${normalizeMaterialKey(material)}`;

function needText(board: SolvedBoard, diluent: string): string {
  const result = board.results.get(diluentNeedId(diluent));
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
    const material = diluent ? materialNamed(protocol, diluent) : undefined;
    if (!diluent || !material || byMaterial.has(material.id)) continue;
    byMaterial.set(material.id, { materialId: material.id, need: needText(board, diluent) });
  }
  return [...byMaterial.values()];
}
