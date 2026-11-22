import { Fragment } from 'react';

import { Plus } from 'lucide-react';

import { Tooltip } from '@shared/ui';

import {
  calculationAnswerText,
  type CalculationResult,
} from '../../../../utils/formulas/boardCalculation';
import { OPERATOR_SYMBOLS } from '../../../../utils/formulas/formulaParser';
import {
  workingFraction,
  type WorkingNode,
  type WorkingRef,
} from '../../../../utils/formulas/workingTree';
import { withPerLabwareKind } from '../../../../utils/terms/termLookup';

interface WorkbenchCalculationWorkingProps {
  name: string;
  result: CalculationResult | undefined;
  isCompact: boolean;
  shortName: (name: string) => string;
  onAddMissing?: (name: string) => void;
  linkFor?: (name: string) => (() => void) | undefined;
}

const TERM_SOURCE_CLASS: Record<WorkingRef['source'], string> = {
  value: 'text-foreground',
  count: 'text-info-text',
  calculation: 'text-action',
};

const SYMBOL = 'px-1 font-mono text-data-sm text-muted-foreground';
const TERM_LABEL = 'text-label-2xs text-muted-foreground';
const BLANK_LABEL = '\u00a0';

interface WorkingViewProps {
  node: WorkingNode;
  shortName: (name: string) => string;
  linkFor: WorkbenchCalculationWorkingProps['linkFor'];
}

function TermStack({ node, shortName, linkFor }: WorkingViewProps) {
  if (node.kind !== 'ref' && node.kind !== 'literal') return null;
  const isRef = node.kind === 'ref';
  const stackClass = `inline-flex flex-col items-center ${isRef && node.isSetAside ? 'line-through' : ''}`;
  const content = (
    <>
      <span className={TERM_LABEL}>{isRef ? shortName(node.name) : BLANK_LABEL}</span>
      <span
        className={`font-mono text-data-sm ${isRef ? TERM_SOURCE_CLASS[node.source] : 'text-foreground'}`}
      >
        {isRef ? withPerLabwareKind(node.text, node.name) : node.text}
      </span>
    </>
  );
  const link = isRef ? linkFor?.(node.name) : undefined;
  if (!link) return <span className={stackClass}>{content}</span>;
  return (
    <Tooltip content="Go to where this is set">
      <button
        type="button"
        className={`${stackClass} hover:underline hover:decoration-dotted`}
        onClick={link}
      >
        {content}
      </button>
    </Tooltip>
  );
}

function OperatorMark({ symbol }: { symbol: string }) {
  return (
    <span className="inline-flex flex-col items-center">
      <span className={TERM_LABEL}>{BLANK_LABEL}</span>
      <span className={SYMBOL}>{symbol}</span>
    </span>
  );
}

function WorkingFactors({
  nodes,
  ...rest
}: Omit<WorkingViewProps, 'node'> & { nodes: WorkingNode[] }) {
  return (
    <span className="inline-flex flex-wrap items-end justify-center gap-y-1">
      {nodes.map((node, index) => (
        <Fragment key={index}>
          {index > 0 && <span className={`${SYMBOL} self-end`}>×</span>}
          <WorkingView node={node} {...rest} />
        </Fragment>
      ))}
    </span>
  );
}

function WorkingView({ node, ...rest }: WorkingViewProps) {
  const fraction = workingFraction(node);
  if (fraction) {
    if (!fraction.under.length) return <WorkingFactors nodes={fraction.over} {...rest} />;
    return (
      <span className="inline-flex flex-col items-stretch">
        <WorkingFactors nodes={fraction.over.length ? fraction.over : [ONE]} {...rest} />
        <span aria-hidden className="my-0.5 h-px bg-line-strong" />
        <WorkingFactors nodes={fraction.under} {...rest} />
      </span>
    );
  }
  switch (node.kind) {
    case 'ref':
    case 'literal':
      return <TermStack node={node} {...rest} />;
    case 'group':
      return (
        <span className="inline-flex items-center">
          <span className={SYMBOL}>(</span>
          <WorkingView node={node.inner} {...rest} />
          <span className={SYMBOL}>)</span>
        </span>
      );
    case 'negate':
      return (
        <span className="inline-flex items-center">
          <OperatorMark symbol="−" />
          <WorkingView node={node.operand} {...rest} />
        </span>
      );
    case 'call':
      return (
        <span className="inline-flex flex-wrap items-center">
          <span className={SYMBOL}>{node.name}(</span>
          {node.args.map((arg, index) => (
            <Fragment key={index}>
              {index > 0 && <span className={SYMBOL}>,</span>}
              <WorkingView node={arg} {...rest} />
            </Fragment>
          ))}
          <span className={SYMBOL}>)</span>
        </span>
      );
    case 'binary':
      return (
        <span className="inline-flex flex-wrap items-center gap-y-1">
          <WorkingView node={node.left} {...rest} />
          <OperatorMark symbol={OPERATOR_SYMBOLS[node.operator]} />
          <WorkingView node={node.right} {...rest} />
        </span>
      );
  }
}

const ONE: WorkingNode = { kind: 'literal', text: '1' };

export function WorkbenchCalculationWorking({
  name,
  result,
  isCompact,
  shortName,
  onAddMissing,
  linkFor,
}: WorkbenchCalculationWorkingProps) {
  if (!result) return null;
  if (result.status === 'empty')
    return <p className="text-label-xs text-muted-foreground">{result.message}</p>;
  if (result.status === 'error') {
    return (
      <p className="text-label-xs text-danger-text">
        {result.message}
        {result.missingName && onAddMissing && (
          <button
            type="button"
            className="ml-2 text-action hover:underline"
            onClick={() => result.missingName && onAddMissing(result.missingName)}
          >
            <Plus aria-hidden className="mr-0.5 inline h-3 w-3 text-primary" />
            {`Add "${result.missingName}" as a value`}
          </button>
        )}
      </p>
    );
  }
  const outputError = 'error' in result.output ? result.output.error : undefined;
  if (isCompact && outputError)
    return <p className="text-label-xs text-danger-text">{outputError}</p>;
  const working = result.showsWorking && (
    <div className="flex">
      <WorkingView node={result.working} shortName={shortName} linkFor={linkFor} />
    </div>
  );
  if (isCompact) return working || null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {working}
      {outputError ? (
        <p className="text-label-xs text-danger-text">{outputError}</p>
      ) : (
        <span className="font-mono text-data-lg text-action">
          = {withPerLabwareKind(calculationAnswerText(result), name)}
        </span>
      )}
    </div>
  );
}
