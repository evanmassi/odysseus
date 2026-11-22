import { unitScale } from '@odysseus/shared-schemas';

import {
  FormulaError,
  parseFormula,
  type FormulaFunction,
  type FormulaNode,
  type Operator,
} from './formulaParser';
import {
  autoFormat,
  combineDimensions,
  describeDimension,
  dimensionKey,
  formatNumber,
  formatQuantityIn,
  isSameDimension,
  quantityOf,
  workingValue,
  type FormattedQuantity,
  type Quantity,
} from './quantities';
import { type WorkingNode } from './workingTree';

export interface WorkedOutGroup {
  key: string;
  subject: string;
  title: string;
  settingsBlockId: string | undefined;
}

interface NameSource {
  sourceBlockId?: string;
  workedOut?: WorkedOutGroup;
}

export type BoardName = NameSource &
  (
    | { kind: 'value'; id: string; name: string; value: string; unit: string; isDropped?: boolean }
    | { kind: 'count'; id: string; name: string; count: number }
    | {
        kind: 'item';
        id: string;
        name: string;
        shownName?: string;
        groupTitle: string;
        hint: string;
        label: string;
        isDropped?: boolean;
      }
    | {
        kind: 'formula';
        id: string;
        name: string;
        expr: string;
        unit: string;
        problem?: string;
        need?: string;
        isIntermediate?: boolean;
        formerName?: string;
      }
  );

type FormulaName = Extract<BoardName, { kind: 'formula' }>;

export interface FormulaGap {
  problem: string;
  need?: string;
}

export type FormulaResult =
  | { status: 'empty'; message: string }
  | {
      status: 'error';
      message: string;
      missingName?: string;
      blankId?: string;
      isCycle?: boolean;
    }
  | {
      status: 'ok';
      quantity: Quantity;
      working: WorkingNode;
      showsWorking: boolean;
      output: FormattedQuantity;
    };

export interface SolvedBoard {
  names: ReadonlyMap<string, BoardName>;
  takenNameIds: ReadonlySet<string>;
  results: ReadonlyMap<string, FormulaResult>;
}

interface Evaluated {
  quantity: Quantity;
  working: WorkingNode;
}

const FLOAT_TOLERANCE = 1e-9;

// PITFALL: 35 µL ÷ 5 µL can come out as 7.0000000001 in floating point, which a plain ceil turns into 8.
const ROUNDING: Record<Exclude<FormulaFunction, 'at least'>, (value: number) => number> = {
  'round up': value => Math.ceil(value - FLOAT_TOLERANCE),
  'round down': value => Math.floor(value + FLOAT_TOLERANCE),
  round: Math.round,
};

const ROUNDABLE_WITHOUT_STEP = new Set(['', 'count:1']);

export const nameKey = (name: string): string => name.trim().toLowerCase();

export const formulaAnswerText = (result: Extract<FormulaResult, { status: 'ok' }>): string =>
  'text' in result.output ? result.output.text : autoFormat(result.quantity);

export function calculateBoard(entries: readonly BoardName[]): SolvedBoard {
  const names = new Map<string, BoardName>();
  const takenNameIds = new Set<string>();
  for (const entry of entries) {
    const key = nameKey(entry.name);
    if (!key) continue;
    if (names.has(key)) takenNameIds.add(entry.id);
    else names.set(key, { ...entry, name: entry.name.trim() });
  }
  const formulas = entries.filter((entry): entry is FormulaName => entry.kind === 'formula');
  const knownNames = [...names.values()].map(entry => entry.name);
  const results = new Map<string, FormulaResult>();
  const inProgress: string[] = [];

  const resolve = (name: string): Evaluated => {
    const entry = names.get(nameKey(name));
    if (!entry)
      throw new FormulaError(`'${name}' isn't a value or calculation on this board`, {
        missingName: name,
      });
    if (entry.kind === 'value') {
      const quantity = quantityOf(entry.value, entry.unit);
      if (!quantity) {
        throw new FormulaError(`${entry.name} has no number yet`, { blankId: entry.id });
      }
      const text = workingValue(entry.value, entry.unit);
      return {
        quantity,
        working: {
          kind: 'ref',
          name: entry.name,
          text,
          source: 'value',
          isDropped: !!entry.isDropped,
        },
      };
    }
    if (entry.kind === 'count') {
      return {
        quantity: { magnitude: entry.count, dimension: {} },
        working: {
          kind: 'ref',
          name: entry.name,
          text: String(entry.count),
          source: 'count',
          isDropped: false,
        },
      };
    }
    if (entry.kind === 'item') {
      const hint = entry.hint ? ` Use one of its numbers, like ${entry.hint}.` : '';
      throw new FormulaError(`${entry.name} is in ${entry.groupTitle}, not a number.${hint}`);
    }
    const result = evaluate(entry);
    if (result.status !== 'ok') {
      const isCycle = result.status === 'error' && result.isCycle;
      throw new FormulaError(
        isCycle ? result.message : `Needs ${entry.name}, which can't be worked out yet`,
        { isCycle }
      );
    }
    return {
      quantity: result.quantity,
      working: {
        kind: 'ref',
        name: entry.name,
        text: formulaAnswerText(result),
        source: 'formula',
        isDropped: false,
      },
    };
  };

  const run = (node: FormulaNode): Evaluated => {
    switch (node.kind) {
      case 'number': {
        const scale = unitScale(node.unit) ?? { factor: 1, dimension: {} };
        const text = formatNumber(node.value) + (node.unit ? ` ${node.unit}` : '');
        return {
          quantity: { magnitude: node.value * scale.factor, dimension: scale.dimension },
          working: { kind: 'literal', text },
        };
      }
      case 'ref':
        return resolve(node.name);
      case 'group': {
        const inner = run(node.inner);
        return { quantity: inner.quantity, working: { kind: 'group', inner: inner.working } };
      }
      case 'negate': {
        const operand = run(node.operand);
        return {
          quantity: {
            magnitude: -operand.quantity.magnitude,
            dimension: operand.quantity.dimension,
          },
          working: { kind: 'negate', operand: operand.working },
        };
      }
      case 'call':
        return runCall(node.name, node.args.map(run));
      case 'binary':
        return runBinary(node.operator, run(node.left), run(node.right));
    }
  };

  const runCall = (name: FormulaFunction, [value, step]: Evaluated[]): Evaluated => {
    const working: WorkingNode = {
      kind: 'call',
      name,
      args: step ? [value.working, step.working] : [value.working],
    };
    const { dimension } = value.quantity;
    if (step && !isSameDimension(dimension, step.quantity.dimension)) {
      throw new FormulaError(
        name === 'at least'
          ? `at least needs two of the same kind, not a ${describeDimension(dimension)} and a ${describeDimension(step.quantity.dimension)}`
          : `What to round to has to be a ${describeDimension(dimension)} too, not a ${describeDimension(step.quantity.dimension)}`
      );
    }
    if (name === 'at least') {
      return {
        quantity: {
          magnitude: Math.max(value.quantity.magnitude, step.quantity.magnitude),
          dimension,
        },
        working,
      };
    }
    if (!step && !ROUNDABLE_WITHOUT_STEP.has(dimensionKey(dimension))) {
      throw new FormulaError(
        `To ${name} a ${describeDimension(dimension)}, give what to round to: ${name}(…, 5 mL)`
      );
    }
    if (step && step.quantity.magnitude <= 0) {
      throw new FormulaError(`What ${name} rounds to has to be more than zero`);
    }
    const round = ROUNDING[name];
    const magnitude = step
      ? round(value.quantity.magnitude / step.quantity.magnitude) * step.quantity.magnitude
      : round(value.quantity.magnitude);
    return { quantity: { magnitude, dimension }, working };
  };

  const runBinary = (operator: Operator, left: Evaluated, right: Evaluated): Evaluated => {
    const working: WorkingNode = {
      kind: 'binary',
      operator,
      left: left.working,
      right: right.working,
    };
    const a = left.quantity;
    const b = right.quantity;
    if (operator === '+' || operator === '-') {
      if (!isSameDimension(a.dimension, b.dimension)) {
        throw new FormulaError(
          operator === '+'
            ? `Can't add a ${describeDimension(b.dimension)} to a ${describeDimension(a.dimension)}`
            : `Can't subtract a ${describeDimension(b.dimension)} from a ${describeDimension(a.dimension)}`
        );
      }
      const magnitude = operator === '+' ? a.magnitude + b.magnitude : a.magnitude - b.magnitude;
      return { quantity: { magnitude, dimension: a.dimension }, working };
    }
    if (operator === '/' && b.magnitude === 0) throw new FormulaError('Divides by zero');
    return {
      quantity: {
        magnitude: operator === '*' ? a.magnitude * b.magnitude : a.magnitude / b.magnitude,
        dimension: combineDimensions(a.dimension, b.dimension, operator === '*' ? 1 : -1),
      },
      working,
    };
  };

  const evaluate = (formula: FormulaName): FormulaResult => {
    const known = results.get(formula.id);
    if (known) return known;
    if (inProgress.includes(formula.id)) {
      const path = inProgress
        .slice(inProgress.indexOf(formula.id))
        .map(id => formulas.find(other => other.id === id)?.name.trim() ?? '');
      throw new FormulaError(`Goes in a circle: ${[...path, formula.name.trim()].join(' → ')}`, {
        isCycle: true,
      });
    }
    inProgress.push(formula.id);
    let result: FormulaResult;
    try {
      if (takenNameIds.has(formula.id)) {
        throw new FormulaError(`${formula.name.trim()} is already used`);
      }
      if (formula.problem) {
        throw new FormulaError(formula.problem, formula.need ? { missingName: formula.need } : {});
      }
      if (!formula.expr.trim()) {
        result = { status: 'empty', message: 'Type a formula using the names on this board' };
      } else {
        const tree = parseFormula(formula.expr, knownNames);
        const { quantity, working } = run(tree);
        result = {
          status: 'ok',
          quantity,
          working,
          showsWorking: tree.kind !== 'number' && tree.kind !== 'ref',
          output: formatQuantityIn(quantity, formula.unit),
        };
      }
    } catch (error) {
      if (!(error instanceof FormulaError)) throw error;
      result = { status: 'error', message: error.message, ...error.detail };
    }
    inProgress.pop();
    results.set(formula.id, result);
    return result;
  };

  formulas.forEach(evaluate);
  return { names, takenNameIds, results };
}
