import {
  calculationAnswerText,
  type SolvedBoard,
  type CalculationResult,
} from '../formulas/boardCalculation';
import { displayValue } from '../formulas/quantities';
import { VOLUME_PER_WELL } from '../terms/termList';
import { findTerm, withPerLabwareKind } from '../terms/termLookup';

import { shortfallOf } from './cellCalculations';
import { cellPartId, type CountSubject } from './cellCounts';
import { nameWithoutNotes } from './materialLookup';

export interface PrepLine {
  id: string;
  name: string;
  result: CalculationResult | undefined;
}

export interface CellPrep {
  subject: string;
  steps: string[];
  warnings: string[];
  lines: PrepLine[];
}

const PREP_PARTS = [
  'needed',
  'plating',
  'suspension',
  'stock',
  'diluent',
  'vials',
  'resuspend',
  'left-over',
];

const stockNoun = (subject: CountSubject, isCounted: boolean) =>
  !isCounted ? 'stock' : subject.material.type === 'Primary cells' ? 'cell suspension' : 'culture';

export function cellPrep(
  board: SolvedBoard,
  subject: CountSubject,
  isCounted: boolean,
  clashes: readonly string[]
): CellPrep {
  const resultOf = (part: string) => board.results.get(cellPartId(subject.subject, part));
  const answer = (part: string) => {
    const result = resultOf(part);
    return result?.status === 'ok' ? calculationAnswerText(result) : undefined;
  };
  const stock = answer('stock');
  const diluent = answer('diluent');
  const vials = answer('vials');
  const resuspend = answer('resuspend');
  const leftOver = resultOf('left-over');
  const shortfall = shortfallOf(leftOver);
  const { material } = subject;
  const volume = findTerm(board.names, VOLUME_PER_WELL, [
    subject.subject,
    material.name.trim(),
    nameWithoutNotes(material.name),
  ]);
  const plated =
    volume?.kind === 'value' && volume.value.trim()
      ? `plate ${withPerLabwareKind(displayValue(volume.value, volume.unit), volume.name)}`
      : undefined;

  const steps = [
    ...(stock && diluent
      ? [`Take ${stock} of the ${stockNoun(subject, isCounted)}`, `add ${diluent} medium`]
      : []),
    ...(vials ? [`Thaw ${vials} ${vials === '1' ? 'vial' : 'vials'}`] : []),
    ...(resuspend ? ['Spin down', `resuspend in ${resuspend}`] : []),
    ...(plated && (stock ?? resuspend) ? [plated] : []),
    ...(leftOver?.status === 'ok' && !shortfall
      ? [`${calculationAnswerText(leftOver)} left over`]
      : []),
  ];
  const problems = PREP_PARTS.flatMap(part => {
    const result = resultOf(part);
    return result?.status === 'error' ? [result.message] : [];
  });
  const groupKey = cellPartId(subject.subject, 'group');
  return {
    subject: subject.subject,
    steps,
    warnings: [...new Set([...(shortfall ? [shortfall] : []), ...problems, ...clashes])],
    lines: [...board.names.values()].flatMap(entry =>
      entry.kind === 'calculation' && entry.workedOut?.key === groupKey
        ? [{ id: entry.id, name: entry.name, result: board.results.get(entry.id) }]
        : []
    ),
  };
}
