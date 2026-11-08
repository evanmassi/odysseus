import { Button } from '@shared/ui';

import { materialFields } from '../../../../utils/materials/materialCatalog';
import { materialText } from '../../../../utils/materials/materialItems';

import { WorkbenchMaterialKindSelector } from './WorkbenchMaterialKindSelector';

import type { MaterialKind } from './materialSelectOptions';
import type { MaterialPreview } from './useMaterialAdding';
import type { MaterialItem } from '@odysseus/shared-schemas';

interface WorkbenchMaterialGuessPreviewProps {
  typed: string;
  preview: MaterialPreview | undefined;
  pendingDuplicate: MaterialItem | undefined;
  customGroups: readonly string[];
  onChooseKind: (kind: MaterialKind) => void;
  onNewGroup: () => void;
  onResolveDuplicate: (isKeptBoth: boolean) => void;
}

const DUPLICATE = 'font-semibold text-warning-text';
const FILLED_VALUE = 'font-normal text-foreground';

function PreviewLine({
  typed,
  preview,
  pendingDuplicate,
  customGroups,
  onChooseKind,
  onNewGroup,
  onResolveDuplicate,
}: WorkbenchMaterialGuessPreviewProps) {
  if (pendingDuplicate) {
    return (
      <>
        <span className={DUPLICATE}>{pendingDuplicate.name} is already listed.</span>
        <Button variant="ghost" size="xs" onClick={() => onResolveDuplicate(false)}>
          Merge
        </Button>
        <Button variant="ghost" size="xs" onClick={() => onResolveDuplicate(true)}>
          Keep both
        </Button>
        <span className="italic">Merge fills its blank fields from what you typed.</span>
      </>
    );
  }
  if (!preview) {
    return (
      <span className="italic">
        Anything works: CD4 BV421, HeLa, DMEM + 10% FBS, 96-well plate, FlowJo 10.9. Paste a list to
        add many.
      </span>
    );
  }
  const { guess, item, duplicate } = preview;
  const filled = materialFields(item).filter(
    definition => item.shownFields.includes(definition.key) && item.values[definition.key]?.trim()
  );
  return (
    <>
      {duplicate && (
        <span className={DUPLICATE}>
          {duplicate.isDropped
            ? `${duplicate.name} was dropped. Enter brings it back`
            : `${duplicate.name} is already listed`}
        </span>
      )}
      <WorkbenchMaterialKindSelector
        kind={guess}
        customGroups={customGroups}
        className="font-semibold"
        onChoose={onChooseKind}
        onNewGroup={onNewGroup}
      />
      {guess.name !== typed.trim() && (
        <span className="whitespace-nowrap">
          name <b className={FILLED_VALUE}>{guess.name}</b>
        </span>
      )}
      {filled.map(definition => (
        <span key={definition.key} className="whitespace-nowrap">
          {definition.label.toLowerCase()}{' '}
          <b className={FILLED_VALUE}>{materialText(item, definition)}</b>
        </span>
      ))}
      <span className="italic">{guess.why}</span>
      <span className="ml-auto font-mono text-label-2xs uppercase tracking-label-wide text-foreground/40">
        Enter to add
      </span>
    </>
  );
}

export function WorkbenchMaterialGuessPreview(props: WorkbenchMaterialGuessPreviewProps) {
  return (
    <div className="mt-2 flex min-h-5 max-w-3xl flex-wrap items-center gap-x-3.5 gap-y-1 text-body-sm text-muted-foreground">
      <PreviewLine {...props} />
    </div>
  );
}
