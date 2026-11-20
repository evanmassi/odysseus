import { Tooltip } from '@shared/ui';
import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { NEEDED_TEXT } from './valueTableStyles';

interface WorkbenchValueNeededRowProps {
  name: string;
  neededNote: string;
  onAdd: () => void;
}

const CELL = 'px-2 py-1.5 align-middle';

export function WorkbenchValueNeededRow({ name, neededNote, onAdd }: WorkbenchValueNeededRowProps) {
  return (
    <Tooltip content={`${neededNote}. Click to add it.`}>
      <tr className={`group ${ROW_HOVER_GLOW.primary}`}>
        <td className={`${CELL} text-body-sm text-muted-foreground`}>{name}</td>
        <td className={`${CELL} text-right`}>
          <button
            type="button"
            data-align="end"
            aria-label={`Add ${name}`}
            className={`inline-edit ${NEEDED_TEXT}`}
            onClick={onAdd}
          >
            needed
          </button>
        </td>
        <td className="w-px px-1" />
      </tr>
    </Tooltip>
  );
}
