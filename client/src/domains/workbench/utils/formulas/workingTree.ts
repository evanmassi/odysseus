import { OPERATOR_SYMBOLS, type FormulaFunction, type Operator } from './formulaParser';

export interface WorkingRef {
  kind: 'ref';
  name: string;
  text: string;
  source: 'value' | 'count' | 'calculation';
  isSetAside: boolean;
}

export type WorkingNode =
  | WorkingRef
  | { kind: 'literal'; text: string }
  | { kind: 'group'; inner: WorkingNode }
  | { kind: 'negate'; operand: WorkingNode }
  | { kind: 'call'; name: FormulaFunction; args: WorkingNode[] }
  | { kind: 'binary'; operator: Operator; left: WorkingNode; right: WorkingNode };

export interface WorkingFraction {
  over: WorkingNode[];
  under: WorkingNode[];
}

const isProduct = (node: WorkingNode) =>
  node.kind === 'binary' && (node.operator === '*' || node.operator === '/');

export function workingFraction(node: WorkingNode): WorkingFraction | undefined {
  if (!isProduct(node)) return undefined;
  const fraction: WorkingFraction = { over: [], under: [] };
  const collect = (part: WorkingNode, isUnder: boolean) => {
    if (part.kind === 'binary' && isProduct(part)) {
      collect(part.left, isUnder);
      collect(part.right, part.operator === '/' ? !isUnder : isUnder);
    } else if (part.kind === 'group' && isProduct(part.inner)) {
      collect(part.inner, isUnder);
    } else {
      (isUnder ? fraction.under : fraction.over).push(part);
    }
  };
  collect(node, false);
  return fraction;
}

export function workingRefs(node: WorkingNode): WorkingRef[] {
  switch (node.kind) {
    case 'ref':
      return [node];
    case 'literal':
      return [];
    case 'group':
      return workingRefs(node.inner);
    case 'negate':
      return workingRefs(node.operand);
    case 'call':
      return node.args.flatMap(workingRefs);
    case 'binary':
      return [...workingRefs(node.left), ...workingRefs(node.right)];
  }
}

function workingTokens(node: WorkingNode): string[] {
  switch (node.kind) {
    case 'ref':
    case 'literal':
      return [node.text];
    case 'group':
      return ['(', ...workingTokens(node.inner), ')'];
    case 'negate':
      return ['−', ...workingTokens(node.operand)];
    case 'call':
      return [
        `${node.name}(`,
        ...node.args.flatMap((arg, index) => [...(index ? [','] : []), ...workingTokens(arg)]),
        ')',
      ];
    case 'binary':
      return [
        ...workingTokens(node.left),
        OPERATOR_SYMBOLS[node.operator],
        ...workingTokens(node.right),
      ];
  }
}

export const workingText = (node: WorkingNode): string => workingTokens(node).join(' ');
