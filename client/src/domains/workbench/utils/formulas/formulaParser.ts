import { FORMULA_LITERAL_UNITS } from './quantities';

export const FORMULA_FUNCTIONS = ['round up', 'round down', 'round', 'at least'] as const;

export type FormulaFunction = (typeof FORMULA_FUNCTIONS)[number];

export type Operator = '+' | '-' | '*' | '/';

export type FormulaNode =
  | { kind: 'number'; value: number; unit: string }
  | { kind: 'ref'; name: string }
  | { kind: 'group'; inner: FormulaNode }
  | { kind: 'negate'; operand: FormulaNode }
  | { kind: 'call'; name: FormulaFunction; args: FormulaNode[] }
  | { kind: 'binary'; operator: Operator; left: FormulaNode; right: FormulaNode };

type Token =
  | { kind: 'op'; text: string }
  | { kind: 'number'; value: number; unit: string }
  | { kind: 'function'; name: FormulaFunction }
  | { kind: 'name'; name: string }
  | { kind: 'unknown'; text: string };

export class FormulaError extends Error {
  constructor(
    message: string,
    readonly detail: { missingName?: string; isCycle?: boolean } = {}
  ) {
    super(message);
  }
}

export const OPERATOR_SYMBOLS: Record<Operator, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

const FUNCTION_PATTERN = new RegExp(
  `^(${[...FORMULA_FUNCTIONS].sort((a, b) => b.length - a.length).join('|')})\\s*(?=\\()`,
  'i'
);
const NUMBER_PATTERN = /^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/;
const OPERATOR_CHARACTERS = '+-*/(),';

const isWordCharacter = (character: string | undefined) => /[A-Za-z0-9_µ°]/.test(character ?? '');

const normalizeSource = (source: string) =>
  source
    .replace(/−/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/(\d\s*)u(L|g|M)\b/g, '$1µ$2');

function tokenize(source: string, names: readonly string[]): Token[] {
  const text = normalizeSource(source);
  const longestFirst = [...names].sort((a, b) => b.length - a.length);
  const tokens: Token[] = [];
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (/\s/.test(character)) {
      index++;
      continue;
    }
    if (OPERATOR_CHARACTERS.includes(character)) {
      tokens.push({ kind: 'op', text: character });
      index++;
      continue;
    }
    const rest = text.slice(index);
    const number = NUMBER_PATTERN.exec(rest);
    if (number) {
      index += number[0].length;
      let unitStart = index;
      while (text[unitStart] === ' ') unitStart++;
      const unit =
        FORMULA_LITERAL_UNITS.find(
          id => text.startsWith(id, unitStart) && !isWordCharacter(text[unitStart + id.length])
        ) ?? '';
      if (unit) index = unitStart + unit.length;
      tokens.push({ kind: 'number', value: parseFloat(number[0]), unit });
      continue;
    }
    const call = FUNCTION_PATTERN.exec(rest);
    if (call) {
      tokens.push({
        kind: 'function',
        name: call[1].toLowerCase().replace(/\s+/g, ' ') as FormulaFunction,
      });
      index += call[0].length;
      continue;
    }
    const name = longestFirst.find(
      candidate =>
        rest.slice(0, candidate.length).toLowerCase() === candidate.toLowerCase() &&
        !isWordCharacter(rest[candidate.length])
    );
    if (name) {
      tokens.push({ kind: 'name', name });
      index += name.length;
      continue;
    }
    const unknown = /^[^+\-*/(),]+/.exec(rest)?.[0] ?? character;
    tokens.push({ kind: 'unknown', text: unknown.trim() });
    index += unknown.length;
  }
  return tokens;
}

function tokenText(token: Token): string {
  if (token.kind === 'op') return OPERATOR_SYMBOLS[token.text as Operator] ?? token.text;
  if (token.kind === 'number') return String(token.value);
  if (token.kind === 'unknown') return token.text;
  return token.name;
}

function parseTokens(tokens: Token[]): FormulaNode {
  let index = 0;
  const isOperator = (text: string) => {
    const token = tokens[index];
    return token?.kind === 'op' && token.text === text;
  };
  const expect = (text: string) => {
    if (!isOperator(text)) throw new FormulaError(`Missing ‘${text}’`);
    index++;
  };

  const expression = (): FormulaNode => {
    let node = term();
    while (isOperator('+') || isOperator('-')) {
      const operator = (tokens[index++] as { text: Operator }).text;
      node = { kind: 'binary', operator, left: node, right: term() };
    }
    return node;
  };
  const term = (): FormulaNode => {
    let node = factor();
    while (isOperator('*') || isOperator('/')) {
      const operator = (tokens[index++] as { text: Operator }).text;
      node = { kind: 'binary', operator, left: node, right: factor() };
    }
    return node;
  };
  const factor = (): FormulaNode => {
    if (isOperator('-')) {
      index++;
      return { kind: 'negate', operand: factor() };
    }
    return primary();
  };
  const primary = (): FormulaNode => {
    const token = tokens[index++];
    if (!token) throw new FormulaError('The formula stops too early');
    if (token.kind === 'number') return { kind: 'number', value: token.value, unit: token.unit };
    if (token.kind === 'name') return { kind: 'ref', name: token.name };
    if (token.kind === 'unknown') {
      throw new FormulaError(`‘${token.text}’ isn't a value or formula on this board`, {
        missingName: token.text,
      });
    }
    if (token.kind === 'function') {
      expect('(');
      const args = [expression()];
      while (isOperator(',')) {
        index++;
        args.push(expression());
      }
      expect(')');
      const isAtLeast = token.name === 'at least';
      if (isAtLeast ? args.length !== 2 : args.length > 2) {
        throw new FormulaError(
          isAtLeast
            ? 'at least needs two things: at least(Needed, 100 µL)'
            : `${token.name} takes a number, or a number and a step: ${token.name}(Mix, 5 mL)`
        );
      }
      return { kind: 'call', name: token.name, args };
    }
    if (token.text === '(') {
      const inner = expression();
      expect(')');
      return { kind: 'group', inner };
    }
    throw new FormulaError(`Unexpected ‘${tokenText(token)}’`);
  };

  if (!tokens.length) throw new FormulaError('Empty formula');
  const tree = expression();
  if (index < tokens.length) throw new FormulaError(`Unexpected ‘${tokenText(tokens[index])}’`);
  return tree;
}

export const parseFormula = (source: string, names: readonly string[]): FormulaNode =>
  parseTokens(tokenize(source, names));

export const formulaNameReferences = (source: string, names: readonly string[]): string[] =>
  tokenize(source, names).flatMap(token => (token.kind === 'name' ? [token.name] : []));
