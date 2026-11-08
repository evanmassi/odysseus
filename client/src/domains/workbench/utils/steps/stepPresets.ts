import { describeName } from '../formulas/nameDisplay';

import type { BoardCalculation } from '../formulas/boardCalculation';

interface StepPreset {
  label: string;
  text: string;
}

export interface BlankOption {
  text: string;
  name?: string;
}

interface BlankChoices {
  units?: readonly string[];
  common?: readonly string[];
}

const MAX_BLANK_OPTIONS = 8;

export const STEP_PRESETS: readonly StepPreset[] = [
  { label: 'Wash', text: 'Wash ‹times› with ‹volume› of ‹buffer› per well.' },
  { label: 'Spin', text: 'Centrifuge at ‹speed› for ‹time› at ‹temperature›.' },
  { label: 'Incubate', text: 'Incubate for ‹time› at ‹temperature›.' },
  { label: 'Add', text: 'Add ‹volume› of ‹reagent› per well.' },
  { label: 'Mix', text: 'Mix by pipetting up and down ‹times›.' },
  { label: 'Resuspend', text: 'Resuspend the pellet in ‹volume› of ‹buffer›.' },
  { label: 'Transfer', text: 'Transfer ‹volume› to ‹destination›.' },
  { label: 'Seed', text: 'Seed ‹volume› of ‹cells› per well.' },
  { label: 'Count', text: 'Count ‹cells›; record count and viability.' },
  { label: 'Read', text: 'Read ‹readout› on the ‹instrument›.' },
];

const BLANK_CHOICES: Readonly<Record<string, BlankChoices>> = {
  speed: { units: ['× g', 'rpm'], common: ['300 × g', '400 × g', '500 × g', '1,500 rpm'] },
  time: { units: ['min', 'h', 's'], common: ['5 min', '10 min', '30 min', '1 h', 'overnight'] },
  temperature: { units: ['°C'], common: ['4 °C', 'room temperature', '37 °C', 'on ice'] },
  volume: { units: ['µL', 'mL'], common: ['50 µL', '100 µL', '200 µL', '1 mL'] },
  times: { units: ['times'], common: ['once', 'twice', '3 times'] },
  readout: { common: ['absorbance at 450 nm', 'luminescence', 'fluorescence'] },
};

export function blankOptions(
  calculation: BoardCalculation,
  label: string,
  typed: string
): BlankOption[] {
  const choices = BLANK_CHOICES[label];
  const query = typed.trim() === label ? '' : typed.trim().toLowerCase();
  const number = /^\d[\d,.]*$/.exec(query)?.[0];
  const units = choices?.units ?? [];
  const fromBoard = [...calculation.names.values()]
    .filter(entry =>
      choices
        ? entry.kind !== 'item' &&
          units.some(unit => describeName(calculation, entry.name).text.endsWith(` ${unit}`))
        : entry.kind === 'item'
    )
    .filter(entry => entry.name.toLowerCase().includes(query))
    .map(entry => ({ text: entry.name, name: entry.name }));
  const typedWithUnits = number ? units.map(unit => ({ text: `${number} ${unit}` })) : [];
  const common = number
    ? []
    : (choices?.common ?? []).filter(text => text.includes(query)).map(text => ({ text }));
  return [...typedWithUnits, ...common, ...fromBoard].slice(0, MAX_BLANK_OPTIONS);
}
