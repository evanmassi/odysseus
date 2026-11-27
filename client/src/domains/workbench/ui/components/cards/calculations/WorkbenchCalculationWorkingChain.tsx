import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { nameKey, type CalculationResult } from '../../../../utils/formulas/boardCalculation';
import { WorkbenchTreeRail, type TreeRailPlace } from '../../board/WorkbenchTreeRail';

import { WorkbenchCalculationWorkingRow } from './WorkbenchCalculationWorkingRow';

import type { WorkingNode } from '../../../../utils/formulas/workingTree';

interface WorkbenchCalculationWorkingChainProps {
  name: string;
  result: CalculationResult | undefined;
  shortName: (name: string) => string;
  followed: ReadonlySet<string>;
  onFollow: (name: string) => void;
  onAddMissing?: (name: string) => void;
}

interface ChainLevelProps extends WorkbenchCalculationWorkingChainProps {
  depth: number;
  rail: TreeRailPlace | undefined;
}

const LEVEL_INDENT = 18;
const RAIL_OFFSET = 4;

const railLeft = (depth: number) => (depth - 1) * LEVEL_INDENT + RAIL_OFFSET;

function workedOutNames(node: WorkingNode): string[] {
  switch (node.kind) {
    case 'ref':
      return node.source === 'calculation' ? [node.name] : [];
    case 'literal':
      return [];
    case 'group':
      return workedOutNames(node.inner);
    case 'negate':
      return workedOutNames(node.operand);
    case 'call':
      return node.args.flatMap(workedOutNames);
    case 'binary':
      return [...workedOutNames(node.left), ...workedOutNames(node.right)];
  }
}

function FollowedLevel({ name, ...rest }: Omit<ChainLevelProps, 'result'>) {
  const result = useWorkbenchStore(state => {
    const entry = state.board.names.get(nameKey(name));
    return entry && state.board.results.get(entry.id);
  });
  return <ChainLevel {...rest} name={name} result={result} />;
}

function ChainLevel({ depth, rail, ...props }: ChainLevelProps) {
  const { result, shortName, followed, onFollow, onAddMissing } = props;
  const shared = { shortName, followed, onFollow, onAddMissing };
  const working = result?.status === 'ok' && result.showsWorking ? result.working : undefined;
  const opened = working
    ? [...new Set(workedOutNames(working))].filter(name => followed.has(nameKey(name)))
    : [];
  return (
    <>
      <div className="relative py-1" style={{ paddingLeft: depth * LEVEL_INDENT }}>
        {rail && <WorkbenchTreeRail place={rail} color={undefined} left={railLeft(depth)} />}
        <WorkbenchCalculationWorkingRow {...props} />
      </div>
      {opened.length > 0 && (
        <div className="relative">
          {rail === 'middle' && (
            <WorkbenchTreeRail place="passing" color={undefined} left={railLeft(depth)} />
          )}
          {opened.map((name, index) => (
            <FollowedLevel
              key={name}
              {...shared}
              name={name}
              depth={depth + 1}
              rail={index === opened.length - 1 ? 'end' : 'middle'}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function WorkbenchCalculationWorkingChain(props: WorkbenchCalculationWorkingChainProps) {
  return <ChainLevel {...props} depth={0} rail={undefined} />;
}
