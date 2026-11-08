import { unitScale } from '@odysseus/shared-schemas';

import {
  FormulaError,
  OPERATOR_SYMBOLS,
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
  displayValue,
  formatNumber,
  formatQuantityIn,
  isSameDimension,
  quantityOf,
  type FormattedQuantity,
  type Quantity,
} from './quantities';

export type BoardName =
  | { kind: 'value'; id: string; name: string; value: string; unit: string; isDropped?: boolean }
  | { kind: 'count'; id: string; name: string; count: number }
  | {
      kind: 'item';
      id: string;
      name: string;
      groupTitle: string;
      hint: string;
      label: string;
      isDropped?: boolean;
    }
  | { kind: 'formula'; id: string; name: string; expr: string; unit: string };

type FormulaName = Extract<BoardName, { kind: 'formula' }>;

export type WorkingTerm =
  | { kind: 'symbol'; text: string }
  | { kind: 'operator'; text: string }
  | { kind: 'literal'; text: string }
  | {
      kind: 'ref';
      name: string;
      text: string;
      source: 'value' | 'count' | 'formula';
      isDropped: boolean;
    };

export type FormulaResult =
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string; missingName?: string; isCycle?: boolean }
  | {
      status: 'ok';
      quantity: Quantity;
      terms: WorkingTerm[];
      showsWorking: boolean;
      output: FormattedQuantity;
    };

export interface BoardCalculation {
  names: ReadonlyMap<string, BoardName>;
  duplicateIds: ReadonlySet<string>;
  results: ReadonlyMap<string, FormulaResult>;
}

interface Evaluated {
  quantity: Quantity;
  terms: WorkingTerm[];
}

const ROUNDING: Record<Exclude<FormulaFunction, 'at least'>, (value: number) => number> = {
  'round up': Math.ceil,
  'round down': Math.floor,
  round: Math.round,
};

const ROUNDABLE_WITHOUT_STEP = new Set(['', 'count:1']);

export const nameKey = (name: string): string => name.trim().toLowerCase();

const symbol = (text: string): WorkingTerm => ({ kind: 'symbol', text });

export const formulaAnswerText = (result: Extract<FormulaResult, { status: 'ok' }>): string =>
  'text' in result.output ? result.output.text : autoFormat(result.quantity);

export function calculateBoard(entries: readonly BoardName[]): BoardCalculation {
  const names = new Map<string, BoardName>();
  const duplicateIds = new Set<string>();
  for (const entry of entries) {
    const key = nameKey(entry.name);
    if (!key) continue;
    if (names.has(key)) duplicateIds.add(entry.id);
    else names.set(key, { ...entry, name: entry.name.trim() });
  }
  const formulas = entries.filter((entry): entry is FormulaName => entry.kind === 'formula');
  const knownNames = [...names.values()].map(entry => entry.name);
  const results = new Map<string, FormulaResult>();
  const inProgress: string[] = [];

  const resolve = (name: string): Evaluated => {
    const entry = names.get(nameKey(name));
    if (!entry)
      throw new FormulaError(`‘${name}’ isn't a value or formula on this board`, {
        missingName: name,
      });
    if (entry.kind === 'value') {
      const quantity = quantityOf(entry.value, entry.unit);
      if (!quantity) throw new FormulaError(`${entry.name} has no number yet`);
      const text = displayValue(entry.value, entry.unit);
      return {
        quantity,
        terms: [
          { kind: 'ref', name: entry.name, text, source: 'value', isDropped: !!entry.isDropped },
        ],
      };
    }
    if (entry.kind === 'count') {
      return {
        quantity: { magnitude: entry.count, dimension: {} },
        terms: [
          {
            kind: 'ref',
            name: entry.name,
            text: String(entry.count),
            source: 'count',
            isDropped: false,
          },
        ],
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
      terms: [
        {
          kind: 'ref',
          name: entry.name,
          text: formulaAnswerText(result),
          source: 'formula',
          isDropped: false,
        },
      ],
    };
  };

  const run = (node: FormulaNode): Evaluated => {
    switch (node.kind) {
      case 'number': {
        const scale = unitScale(node.unit) ?? { factor: 1, dimension: {} };
        const text = formatNumber(node.value) + (node.unit ? ` ${node.unit}` : '');
        return {
          quantity: { magnitude: node.value * scale.factor, dimension: scale.dimension },
          terms: [{ kind: 'literal', text }],
        };
      }
      case 'ref':
        return resolve(node.name);
      case 'group': {
        const inner = run(node.inner);
        return { quantity: inner.quantity, terms: [symbol('('), ...inner.terms, symbol(')')] };
      }
      case 'negate': {
        const operand = run(node.operand);
        return {
          quantity: {
            magnitude: -operand.quantity.magnitude,
            dimension: operand.quantity.dimension,
          },
          terms: [symbol('−'), ...operand.terms],
        };
      }
      case 'call':
        return runCall(node.name, node.args.map(run));
      case 'binary':
        return runBinary(node.operator, run(node.left), run(node.right));
    }
  };

  const runCall = (name: FormulaFunction, [value, step]: Evaluated[]): Evaluated => {
    const terms = [
      symbol(`${name}(`),
      ...value.terms,
      ...(step ? [symbol(','), ...step.terms] : []),
      symbol(')'),
    ];
    const { dimension } = value.quantity;
    if (step && !isSameDimension(dimension, step.quantity.dimension)) {
      throw new FormulaError(
        name === 'at least'
          ? `at least needs two of the same kind, not a ${describeDimension(dimension)} and a ${describeDimension(step.quantity.dimension)}`
          : `The step has to be a ${describeDimension(dimension)} too, not a ${describeDimension(step.quantity.dimension)}`
      );
    }
    if (name === 'at least') {
      return {
        quantity: {
          magnitude: Math.max(value.quantity.magnitude, step.quantity.magnitude),
          dimension,
        },
        terms,
      };
    }
    if (!step && !ROUNDABLE_WITHOUT_STEP.has(dimensionKey(dimension))) {
      throw new FormulaError(
        `To ${name} a ${describeDimension(dimension)}, give a step: ${name}(…, 5 mL)`
      );
    }
    if (step && step.quantity.magnitude <= 0) {
      throw new FormulaError(`The step for ${name} has to be more than zero`);
    }
    const round = ROUNDING[name];
    const magnitude = step
      ? round(value.quantity.magnitude / step.quantity.magnitude) * step.quantity.magnitude
      : round(value.quantity.magnitude);
    return { quantity: { magnitude, dimension }, terms };
  };

  const runBinary = (operator: Operator, left: Evaluated, right: Evaluated): Evaluated => {
    const terms: WorkingTerm[] = [
      ...left.terms,
      { kind: 'operator', text: OPERATOR_SYMBOLS[operator] },
      ...right.terms,
    ];
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
      return { quantity: { magnitude, dimension: a.dimension }, terms };
    }
    if (operator === '/' && b.magnitude === 0) throw new FormulaError('Divides by zero');
    return {
      quantity: {
        magnitude: operator === '*' ? a.magnitude * b.magnitude : a.magnitude / b.magnitude,
        dimension: combineDimensions(a.dimension, b.dimension, operator === '*' ? 1 : -1),
      },
      terms,
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
      if (duplicateIds.has(formula.id)) {
        throw new FormulaError('Another value or formula already has this name');
      }
      if (!formula.expr.trim()) {
        result = { status: 'empty', message: 'Type a formula using the names on this board' };
      } else {
        const tree = parseFormula(formula.expr, knownNames);
        const { quantity, terms } = run(tree);
        result = {
          status: 'ok',
          quantity,
          terms,
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
  return { names, duplicateIds, results };
}
