import { normalizeMaterialKey } from '../materials/materialKey';
import { materialNamed } from '../materials/materialLookup';

import { dilutionRuns, type DilutionRun } from './dilutionRuns';

import type { BoardCalculation } from '../formulas/boardCalculation';
import type { Protocol } from '@odysseus/shared-schemas';

export interface DiluentUse {
  materialId: string;
  need: string;
}

export function runDiluents(runs: readonly DilutionRun[]): Map<string, string> {
  const diluents = new Map<string, string>();
  let lastChosen = '';
  for (const run of runs) {
    const own = run.series.prep?.diluent?.trim();
    if (own) lastChosen = own;
    diluents.set(run.key, own ?? lastChosen);
  }
  return diluents;
}

export const diluentNeedId = (material: string): string =>
  `dilutions:diluent:${normalizeMaterialKey(material)}`;

function needText(calculation: BoardCalculation, diluent: string): string {
  const result = calculation.results.get(diluentNeedId(diluent));
  return result?.status === 'ok' && 'text' in result.output ? result.output.text : '';
}

export function diluentUses(
  protocol: Pick<Protocol, 'blocks'>,
  calculation: BoardCalculation
): DiluentUse[] {
  const runs = dilutionRuns(protocol);
  const diluents = runDiluents(runs);
  const byMaterial = new Map<string, DiluentUse>();
  for (const run of runs) {
    const diluent = diluents.get(run.key);
    const material = diluent ? materialNamed(protocol, diluent) : undefined;
    if (!diluent || !material || byMaterial.has(material.id)) continue;
    byMaterial.set(material.id, { materialId: material.id, need: needText(calculation, diluent) });
  }
  return [...byMaterial.values()];
}
