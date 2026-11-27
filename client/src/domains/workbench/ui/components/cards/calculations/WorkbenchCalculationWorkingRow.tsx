import { Fragment, useMemo, useState, type ReactNode } from 'react';

import { Plus } from 'lucide-react';

import {
  calculationAnswerText,
  nameKey,
  type CalculationResult,
} from '../../../../utils/formulas/boardCalculation';
import { OPERATOR_SYMBOLS, type FormulaFunction } from '../../../../utils/formulas/formulaParser';
import { workingFraction, type WorkingNode } from '../../../../utils/formulas/workingTree';
import { cancelledUnits, type UnitPart } from '../../../../utils/formulas/workingUnits';
import { withPerLabwareKind } from '../../../../utils/terms/termLookup';

import { WorkbenchCalculationWorkingQuantity } from './WorkbenchCalculationWorkingQuantity';
import { WORKING_HOT, WorkbenchCalculationWorkingTerm } from './WorkbenchCalculationWorkingTerm';

type CallNode = Extract<WorkingNode, { kind: 'call' }>;

interface WorkingView {
  shortName: (name: string) => string;
  refIndex: ReadonlyMap<WorkingNode, number>;
  hotIndex: number | undefined;
  setHotIndex: (index: number | undefined) => void;
  followed: ReadonlySet<string>;
  onFollow: (name: string) => void;
}

interface WorkingPartProps {
  node: WorkingNode;
  view: WorkingView;
}

interface WorkbenchCalculationWorkingRowProps {
  name: string;
  result: CalculationResult | undefined;
  shortName: (name: string) => string;
  followed: ReadonlySet<string>;
  onFollow: (name: string) => void;
  onAddMissing?: (name: string) => void;
}

const ROUNDED: Record<FormulaFunction, string> = {
  'round up': 'rounded up',
  'round down': 'rounded down',
  round: 'rounded',
  'at least': 'at least',
};

const Mark = ({ children }: { children: ReactNode }) => (
  <span className="px-1.5 text-muted-foreground">{children}</span>
);

const Bracketed = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center whitespace-nowrap">
    <span className="text-muted-foreground">(</span>
    {children}
    <span className="text-muted-foreground">)</span>
  </span>
);

function Fraction({ over, under }: { over: ReactNode; under: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex flex-col items-center align-middle">
      <span className="inline-flex items-center px-1">{over}</span>
      <span aria-hidden className="my-0.5 h-px self-stretch bg-line-strong" />
      <span className="inline-flex items-center px-1">{under}</span>
    </span>
  );
}

function indexRefs(node: WorkingNode, index = new Map<WorkingNode, number>()) {
  switch (node.kind) {
    case 'ref':
      index.set(node, index.size);
      break;
    case 'group':
      indexRefs(node.inner, index);
      break;
    case 'negate':
      indexRefs(node.operand, index);
      break;
    case 'call':
      node.args.forEach(arg => indexRefs(arg, index));
      break;
    case 'binary':
      indexRefs(node.left, index);
      indexRefs(node.right, index);
      break;
  }
  return index;
}

function Term({
  node,
  view,
  isBracketed,
  struckParts,
}: WorkingPartProps & { isBracketed: boolean; struckParts?: ReadonlySet<UnitPart> }) {
  if (node.kind !== 'ref') return null;
  const index = view.refIndex.get(node);
  return (
    <WorkbenchCalculationWorkingTerm
      node={node}
      isBracketed={isBracketed}
      struckParts={struckParts}
      isHot={index !== undefined && index === view.hotIndex}
      isFollowed={view.followed.has(nameKey(node.name))}
      onHover={isHovered => view.setHotIndex(isHovered ? index : undefined)}
      onFollow={view.onFollow}
    />
  );
}

function NumberFactor({
  node,
  view,
  struckParts,
}: WorkingPartProps & { struckParts: ReadonlySet<UnitPart> | undefined }) {
  if (node.kind === 'ref')
    return <Term node={node} view={view} isBracketed struckParts={struckParts} />;
  if (node.kind === 'literal') {
    return (
      <Bracketed>
        <WorkbenchCalculationWorkingQuantity
          text={node.text}
          struckParts={struckParts}
          isSetAside={false}
        />
      </Bracketed>
    );
  }
  if (node.kind === 'group') return <WorkingNumbers node={node} view={view} />;
  return (
    <Bracketed>
      <WorkingNumbers node={node} view={view} />
    </Bracketed>
  );
}

function NumberFactors({
  nodes,
  view,
  struck,
}: {
  nodes: readonly WorkingNode[];
  view: WorkingView;
  struck: ReadonlyMap<WorkingNode, Set<UnitPart>>;
}) {
  if (!nodes.length) return <>1</>;
  return (
    <>
      {nodes.map((node, index) => (
        <NumberFactor key={index} node={node} view={view} struckParts={struck.get(node)} />
      ))}
    </>
  );
}

function RoundingNumbers({
  node,
  view,
  lead,
}: {
  node: CallNode;
  view: WorkingView;
  lead: string;
}) {
  const [, step] = node.args;
  const words = `${lead}${ROUNDED[node.name]}`;
  if (!step) return <span className="text-muted-foreground">{words}</span>;
  return (
    <>
      <span className="whitespace-pre text-muted-foreground">
        {words}
        {node.name === 'at least' ? ' ' : ' to the nearest '}
      </span>
      <WorkingNumbers node={step} view={view} />
    </>
  );
}

function WorkingNumbers({ node, view }: WorkingPartProps): ReactNode {
  const fraction = workingFraction(node);
  if (fraction) {
    const struck = cancelledUnits(fraction);
    const over = <NumberFactors nodes={fraction.over} view={view} struck={struck} />;
    if (!fraction.under.length) return over;
    return (
      <Fraction
        over={over}
        under={<NumberFactors nodes={fraction.under} view={view} struck={struck} />}
      />
    );
  }
  switch (node.kind) {
    case 'ref':
      return <Term node={node} view={view} isBracketed={false} />;
    case 'literal':
      return (
        <WorkbenchCalculationWorkingQuantity
          text={node.text}
          struckParts={undefined}
          isSetAside={false}
        />
      );
    case 'group':
      return (
        <Bracketed>
          <WorkingNumbers node={node.inner} view={view} />
        </Bracketed>
      );
    case 'negate':
      return (
        <>
          <span className="text-muted-foreground">−</span>
          <WorkingNumbers node={node.operand} view={view} />
        </>
      );
    case 'call':
      return (
        <Bracketed>
          <WorkingNumbers node={node.args[0]} view={view} />
          <RoundingNumbers node={node} view={view} lead=", " />
        </Bracketed>
      );
    case 'binary':
      return (
        <>
          <WorkingNumbers node={node.left} view={view} />
          <Mark>{OPERATOR_SYMBOLS[node.operator]}</Mark>
          <WorkingNumbers node={node.right} view={view} />
        </>
      );
  }
}

function WordFactors({ nodes, view }: { nodes: readonly WorkingNode[]; view: WorkingView }) {
  if (!nodes.length) return <>1</>;
  return (
    <>
      {nodes.map((node, index) => (
        <Fragment key={index}>
          {index > 0 && <Mark>×</Mark>}
          <WorkingWords node={node} view={view} />
        </Fragment>
      ))}
    </>
  );
}

function WorkingWords({ node, view }: WorkingPartProps): ReactNode {
  const fraction = workingFraction(node);
  if (fraction) {
    const over = <WordFactors nodes={fraction.over} view={view} />;
    if (!fraction.under.length) return over;
    return <Fraction over={over} under={<WordFactors nodes={fraction.under} view={view} />} />;
  }
  switch (node.kind) {
    case 'ref': {
      const index = view.refIndex.get(node);
      return (
        <span
          className={`whitespace-nowrap ${index === view.hotIndex ? WORKING_HOT : ''}`}
          onMouseEnter={() => view.setHotIndex(index)}
          onMouseLeave={() => view.setHotIndex(undefined)}
        >
          {view.shortName(node.name)}
        </span>
      );
    }
    case 'literal':
      return <span className="whitespace-nowrap">{node.text}</span>;
    case 'group':
      return (
        <span className="inline-flex items-center">
          (<WorkingWords node={node.inner} view={view} />)
        </span>
      );
    case 'negate':
      return (
        <>
          −<WorkingWords node={node.operand} view={view} />
        </>
      );
    case 'call': {
      const [value, step] = node.args;
      return (
        <span className="inline-flex items-center">
          (<WorkingWords node={value} view={view} />, {ROUNDED[node.name]}
          {step && (
            <>
              {node.name === 'at least' ? ' ' : ' to the nearest '}
              <WorkingWords node={step} view={view} />
            </>
          )}
          )
        </span>
      );
    }
    case 'binary':
      return (
        <>
          <WorkingWords node={node.left} view={view} />
          <Mark>{OPERATOR_SYMBOLS[node.operator]}</Mark>
          <WorkingWords node={node.right} view={view} />
        </>
      );
  }
}

function RowError({
  result,
  onAddMissing,
}: {
  result: Extract<CalculationResult, { status: 'error' }>;
  onAddMissing: ((name: string) => void) | undefined;
}) {
  const { missingName } = result;
  return (
    <p className="text-label-xs text-danger-text">
      {result.message}
      {missingName && onAddMissing && (
        <button
          type="button"
          className="ml-2 text-action hover:underline"
          onClick={() => onAddMissing(missingName)}
        >
          <Plus aria-hidden className="mr-0.5 inline h-3 w-3 text-primary" />
          {`Add "${missingName}" as a value`}
        </button>
      )}
    </p>
  );
}

export function WorkbenchCalculationWorkingRow({
  name,
  result,
  shortName,
  followed,
  onFollow,
  onAddMissing,
}: WorkbenchCalculationWorkingRowProps) {
  const [hotIndex, setHotIndex] = useState<number>();
  const working = result?.status === 'ok' && result.showsWorking ? result.working : undefined;
  const refIndex = useMemo(() => (working ? indexRefs(working) : new Map()), [working]);

  if (!result) return null;
  if (result.status === 'empty')
    return <p className="text-label-xs text-muted-foreground">{result.message}</p>;
  if (result.status === 'error') return <RowError result={result} onAddMissing={onAddMissing} />;

  const view: WorkingView = { shortName, refIndex, hotIndex, setHotIndex, followed, onFollow };
  const label = shortName(name);
  const outputError = 'error' in result.output ? result.output.error : undefined;
  const answer = withPerLabwareKind(calculationAnswerText(result), name);
  const rounding = working?.kind === 'call' ? working : undefined;
  const formula = rounding ? rounding.args[0] : working;
  const isRounded = !!rounding && rounding.before !== answer;

  const ending = outputError ? (
    <span className="text-label-xs text-danger-text">{outputError}</span>
  ) : (
    <>
      <Mark>=</Mark>
      {isRounded && (
        <>
          <span className="whitespace-nowrap">{rounding.before}</span>
          <Mark>→</Mark>
        </>
      )}
      <span className="whitespace-nowrap font-semibold text-action">{answer}</span>
      {rounding && (
        <span className="ml-2 inline-flex items-center text-label-xs text-muted-foreground">
          <RoundingNumbers node={rounding} view={view} lead="" />
        </span>
      )}
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-y-1.5 text-body-sm tabular-nums">
      {label && <span className="whitespace-nowrap text-foreground">{label}</span>}
      {formula && refIndex.size > 0 && (
        <span className="inline-flex flex-wrap items-center text-muted-foreground">
          <Mark>=</Mark>
          <WorkingWords node={formula} view={view} />
        </span>
      )}
      <span className="inline-flex flex-wrap items-center">
        {formula && (
          <>
            <Mark>=</Mark>
            <WorkingNumbers node={formula} view={view} />
          </>
        )}
        {ending}
      </span>
    </div>
  );
}
