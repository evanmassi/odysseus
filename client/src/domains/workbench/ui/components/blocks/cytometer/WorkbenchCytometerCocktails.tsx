import { useMemo } from 'react';

import { useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { panelCocktails } from '../../../../utils/cytometer/cytometerCocktails';
import { cocktailAntibodiesId } from '../../../../utils/cytometer/cytometerNames';
import { formulaAnswerText, nameKey } from '../../../../utils/formulas/boardCalculation';

import { FLUOROCHROME_SQUARE } from './cytometerTableStyles';

import type { PanelLayout } from '../../../../utils/cytometer/cytometerPanel';
import type { CytometerBlock } from '@odysseus/shared-schemas';

interface WorkbenchCytometerCocktailsProps {
  block: CytometerBlock;
  layout: PanelLayout;
  mixWells: ReadonlyMap<string, number>;
  materialNames: ReadonlyMap<string, string>;
}

interface CocktailShare {
  share: string | undefined;
  isNameTaken: boolean;
}

export function WorkbenchCytometerCocktails({
  block,
  layout,
  mixWells,
  materialNames,
}: WorkbenchCytometerCocktailsProps) {
  const { steps, rowsWithoutStep } = useMemo(() => panelCocktails(block), [block]);
  const cocktails = useMemo(() => steps.flatMap(step => step.cocktails), [steps]);
  const shares = useWorkbenchData(state =>
    cocktails.map((cocktail): CocktailShare => {
      const id = cocktailAntibodiesId(block.id, cocktail.key);
      const result = state.calculation.results.get(id);
      const owner = state.calculation.names.get(nameKey(`${cocktail.name} antibodies`));
      return {
        share: result?.status === 'ok' ? formulaAnswerText(result) : undefined,
        isNameTaken: !!cocktail.rows.length && !!owner && owner.id !== id,
      };
    })
  );
  const stains = useMemo(
    () =>
      new Map(
        layout.lasers.flatMap(laser =>
          laser.slots.flatMap(slot =>
            slot.stains.map(stain => [
              stain.row.id,
              {
                color: slot.color,
                label: [stain.marker, stain.fluorochrome].filter(Boolean).join(' '),
              },
            ])
          )
        )
      ),
    [layout]
  );
  if (!steps.length) return null;
  const shareOf = (key: string) => shares[cocktails.findIndex(cocktail => cocktail.key === key)];

  return (
    <section aria-label="Cocktails to make" className="flex flex-col gap-2">
      <h4 className="type-label text-label-xs font-semibold text-muted-foreground">
        Cocktails to make
      </h4>
      {rowsWithoutStep.length > 0 && (
        <p className="text-body-sm text-warning-text">
          No stain step yet, so in no cocktail:{' '}
          {rowsWithoutStep
            .map(row => stains.get(row.id)?.label ?? materialNames.get(row.materialId) ?? '')
            .filter(Boolean)
            .join(', ')}
        </p>
      )}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))]">
        {steps.map(({ step, cocktails: stepCocktails, mixesWithout }) => (
          <div key={step} className="flex flex-col gap-1.5">
            <span className="text-body-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{step}</span> · {stepCocktails.length}{' '}
              {stepCocktails.length === 1 ? 'cocktail' : 'cocktails'}
              {mixesWithout.length > 0 &&
                ` · none for ${mixesWithout.map(mix => mix.name).join(', ')}`}
            </span>
            {stepCocktails.map(cocktail => {
              const wells = cocktail.mixes.reduce(
                (sum, mix) => sum + (mixWells.get(mix.name) ?? 0),
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
                      for {cocktail.mixes.map(mix => mix.name).join(', ')}
                    </span>
                    <span className="text-body-sm tabular-nums">
                      {wells} {wells === 1 ? 'well' : 'wells'}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-body-sm">
                    {cocktail.rows.map(row => {
                      const stain = stains.get(row.id);
                      return (
                        <span key={row.id} className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className={FLUOROCHROME_SQUARE}
                            style={{ backgroundColor: stain?.color }}
                          />
                          {stain?.label ?? materialNames.get(row.materialId)}
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
                      “{cocktail.name} antibodies” is already one of your names; rename yours to get
                      this one in Calculations.
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
