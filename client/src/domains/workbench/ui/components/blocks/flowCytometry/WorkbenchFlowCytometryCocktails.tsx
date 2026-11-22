import { useMemo } from 'react';

import { SubsectionHeader } from '@shared/ui';

import { useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { panelCocktails } from '../../../../utils/flowCytometry/flowCytometryCocktails';
import { cocktailAntibodiesId } from '../../../../utils/flowCytometry/flowCytometryNames';
import { calculationAnswerText, nameKey } from '../../../../utils/formulas/boardCalculation';
import { SECTION_RULE } from '../../board/sectionRuleClass';

import { FLUOR_SQUARE } from './flowCytometryTableStyles';

import type { PanelLayout } from '../../../../utils/flowCytometry/flowCytometryPanel';
import type { FlowCytometryPanelBlock } from '@odysseus/shared-schemas';

interface WorkbenchFlowCytometryCocktailsProps {
  block: FlowCytometryPanelBlock;
  layout: PanelLayout;
  wellsPerStain: ReadonlyMap<string, number>;
  materialNames: ReadonlyMap<string, string>;
}

interface CocktailShare {
  share: string | undefined;
  isNameTaken: boolean;
}

export function WorkbenchFlowCytometryCocktails({
  block,
  layout,
  wellsPerStain,
  materialNames,
}: WorkbenchFlowCytometryCocktailsProps) {
  const { stainings, rowsWithoutStaining } = useMemo(() => panelCocktails(block), [block]);
  const cocktails = useMemo(() => stainings.flatMap(staining => staining.cocktails), [stainings]);
  const shares = useWorkbenchData(state =>
    cocktails.map((cocktail): CocktailShare => {
      const id = cocktailAntibodiesId(block.id, cocktail.key);
      const result = state.board.results.get(id);
      const owner = state.board.names.get(nameKey(`${cocktail.name} antibodies`));
      return {
        share: result?.status === 'ok' ? calculationAnswerText(result) : undefined,
        isNameTaken: !!cocktail.rows.length && !!owner && owner.id !== id,
      };
    })
  );
  const markers = useMemo(
    () =>
      new Map(
        layout.lasers.flatMap(laser =>
          laser.slots.flatMap(slot =>
            slot.markers.map(marker => [
              marker.row.id,
              {
                color: marker.fluorColor ?? slot.color,
                label: [marker.markerName, marker.fluor].filter(Boolean).join(' '),
              },
            ])
          )
        )
      ),
    [layout]
  );
  if (!stainings.length) return null;
  const shareOf = (key: string) => shares[cocktails.findIndex(cocktail => cocktail.key === key)];

  return (
    <section aria-label="Cocktails" className="mt-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <SubsectionHeader title="Cocktails" meta={cocktails.length} />
        <span aria-hidden className={SECTION_RULE} />
      </div>
      {rowsWithoutStaining.length > 0 && (
        <p className="text-body-sm text-warning-text">
          No cocktail picked yet:{' '}
          {rowsWithoutStaining
            .map(row => markers.get(row.id)?.label ?? materialNames.get(row.materialId) ?? '')
            .filter(Boolean)
            .join(', ')}
        </p>
      )}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))]">
        {stainings.map(({ staining, cocktails: stainingCocktails, stainsWithout }) => (
          <div key={staining} className="flex flex-col gap-1.5">
            <span className="text-body-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{staining}</span> ·{' '}
              {stainingCocktails.length} {stainingCocktails.length === 1 ? 'cocktail' : 'cocktails'}
              {stainsWithout.length > 0 &&
                ` · none for ${stainsWithout.map(stain => stain.name).join(', ')}`}
            </span>
            {stainingCocktails.map(cocktail => {
              const wells = cocktail.stains.reduce(
                (sum, stain) => sum + (wellsPerStain.get(stain.id) ?? 0),
                0
              );
              const { share, isNameTaken } = shareOf(cocktail.key) ?? {};
              return (
                <div
                  key={cocktail.key}
                  className="flex flex-col gap-1 border border-line-faint px-3 py-2"
                >
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold">{cocktail.name}</span>
                    <span className="flex-1 text-label-xs text-muted-foreground">
                      for {cocktail.stains.map(stain => stain.name).join(', ')}
                    </span>
                    <span className="text-body-sm tabular-nums">
                      {wells} {wells === 1 ? 'well' : 'wells'}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-body-sm">
                    {cocktail.rows.map(row => {
                      const marker = markers.get(row.id);
                      return (
                        <span key={row.id} className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className={FLUOR_SQUARE}
                            style={{ backgroundColor: marker?.color }}
                          />
                          {marker?.label ?? materialNames.get(row.materialId)}
                          {row.dilution && (
                            <span className="text-muted-foreground">1:{row.dilution}</span>
                          )}
                        </span>
                      );
                    })}
                    {cocktail.plus.map(plus => (
                      <span key={plus.id} className="italic text-muted-foreground">
                        {materialNames.get(plus.materialId)}
                      </span>
                    ))}
                  </span>
                  {share && (
                    <span className="text-label-xs text-muted-foreground">
                      Antibodies take {share} of the volume
                    </span>
                  )}
                  {isNameTaken && (
                    <span className="text-label-xs text-warning-text">
                      {`"${cocktail.name} antibodies" is already one of your names; rename yours to get this one in Calculations.`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
