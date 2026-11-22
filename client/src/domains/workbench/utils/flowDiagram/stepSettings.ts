import { amountLabel, findAmounts } from '../units/textAmounts';

import type { UnitKind } from '@odysseus/shared-schemas';

export interface StepSetting {
  label: string;
  kind: UnitKind;
}

const SETTING_ORDER: readonly UnitKind[] = ['g-force', 'rotor-speed', 'time', 'temperature'];
const SETTING_LEAD = /[\s,]*(?:\b(?:at|for)\s+)?$/;

function tidied(text: string): string {
  const cleaned = text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;])/g, '$1')
    .replace(/([,;])(?=[.;,])/g, '')
    .trim();
  return /^[\s.,;]*$/.test(cleaned) ? '' : cleaned;
}

export function splitStepSettings(text: string): { text: string; settings: StepSetting[] } {
  const found = findAmounts(text).flatMap(amount =>
    amount.kind && SETTING_ORDER.includes(amount.kind) ? [{ ...amount, kind: amount.kind }] : []
  );
  const kinds = found.map(amount => amount.kind);
  const isAmbiguous = new Set(kinds).size < kinds.length;
  if (!found.length || isAmbiguous) return { text, settings: [] };
  let remaining = text;
  for (const amount of [...found].reverse()) {
    const before = remaining.slice(0, amount.start);
    const lead = SETTING_LEAD.exec(before);
    const cutFrom = lead ? before.length - lead[0].length : amount.start;
    remaining = `${remaining.slice(0, cutFrom)}${remaining.slice(amount.end)}`;
  }
  const settings = [...found]
    .sort((a, b) => SETTING_ORDER.indexOf(a.kind) - SETTING_ORDER.indexOf(b.kind))
    .map(amount => ({ label: amountLabel(amount), kind: amount.kind }));
  return { text: tidied(remaining), settings };
}
