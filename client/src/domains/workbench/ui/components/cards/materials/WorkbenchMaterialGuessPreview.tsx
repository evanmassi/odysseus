import { Button } from '@shared/ui';

import { materialFields } from '../../../../utils/materials/materialCatalog';
import { materialText } from '../../../../utils/materials/materialItems';

import { WorkbenchMaterialTypeSelector } from './WorkbenchMaterialTypeSelector';

import type { MaterialTypeSelection } from './materialSelectOptions';
import type { MaterialPreview } from './useMaterialAdding';
import type { MaterialItem } from '@odysseus/shared-schemas';

interface WorkbenchMaterialGuessPreviewProps {
  typed: string;
  preview: MaterialPreview | undefined;
  pendingAlreadyListed: MaterialItem | undefined;
  customGroups: readonly string[];
  onChooseKind: (kind: MaterialTypeSelection) => void;
  onNewGroup: () => void;
  onResolveAlreadyListed: (isKeptBoth: boolean) => void;
}

const ALREADY_LISTED = 'font-semibold text-warning-text';
const FILLED_VALUE = 'font-normal text-foreground';

function PreviewLine({
  typed,
  preview,
  pendingAlreadyListed,
  customGroups,
  onChooseKind,
  onNewGroup,
  onResolveAlreadyListed,
}: WorkbenchMaterialGuessPreviewProps) {
  if (pendingAlreadyListed) {
    return (
      <>
        <span className={ALREADY_LISTED}>{pendingAlreadyListed.name} is already listed.</span>
        <Button variant="ghost" size="xs" onClick={() => onResolveAlreadyListed(false)}>
          Merge
        </Button>
        <Button variant="ghost" size="xs" onClick={() => onResolveAlreadyListed(true)}>
          Keep both
        </Button>
        <span className="italic">Merge fills its blank fields from what you typed.</span>
      </>
    );
  }
  if (!preview) return null;
  const { guess, item, alreadyListed } = preview;
  const filled = materialFields(item).filter(
    definition => item.shownFields.includes(definition.key) && item.values[definition.key]?.trim()
  );
  return (
    <>
      {alreadyListed && (
        <span className={ALREADY_LISTED}>
          {alreadyListed.isSetAside
            ? `${alreadyListed.name} was set aside. Enter restores it`
            : `${alreadyListed.name} is already listed`}
        </span>
      )}
      <WorkbenchMaterialTypeSelector
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
