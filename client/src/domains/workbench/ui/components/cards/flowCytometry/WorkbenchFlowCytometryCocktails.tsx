import { useMemo } from 'react';

import { SubsectionHeader } from '@shared/ui';

import { useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { panelCocktails } from '../../../../utils/flowCytometry/flowCytometryCocktails';
import {
  cocktailAntibodiesId,
  cocktailAntibodiesName,
  stainSampleNouns,
} from '../../../../utils/flowCytometry/flowCytometryNames';
import {
  secondaryRowId,
  type PanelLayout,
} from '../../../../utils/flowCytometry/flowCytometryPanel';
import { calculationAnswerText, nameKey } from '../../../../utils/formulas/boardCalculation';
import { perLabwareKind, WELLS, type SampleNoun } from '../../../../utils/terms/termList';
import { lowerLead } from '../../../../utils/values/valueNames';
import { SECTION_RULE } from '../../board/sectionRuleClass';

import { FLUOR_SQUARE } from './flowCytometryTableStyles';

import type { FlowCytometryPanel } from '@odysseus/shared-schemas';

interface WorkbenchFlowCytometryCocktailsProps {
  panel: FlowCytometryPanel;
  layout: PanelLayout;
  samples: ReadonlyMap<string, ReadonlyMap<SampleNoun, number>>;
  materialNames: ReadonlyMap<string, string>;
}

interface CocktailShare {
  noun: SampleNoun;
  share: string | undefined;
  isNameTaken: boolean;
}

const pluralOf = (noun: SampleNoun) => lowerLead(perLabwareKind(WELLS, noun).word);

function shareText(shares: readonly CocktailShare[]): string | undefined {
  if (!shares.every(({ share }) => share)) return undefined;
  const isOneShare = new Set(shares.map(({ share }) => share)).size === 1;
  if (isOneShare) return `Antibodies take ${shares[0].share} of the volume`;
  const [first, ...rest] = shares;
  return [
    `Antibodies take ${first.share} of the volume in the ${pluralOf(first.noun)}`,
    ...rest.map(({ share, noun }) => `${share} in the ${pluralOf(noun)}`),
  ].join(', ');
}

export function WorkbenchFlowCytometryCocktails({
  panel,
  layout,
  samples,
  materialNames,
}: WorkbenchFlowCytometryCocktailsProps) {
  const { stainings, rowsWithoutStaining } = useMemo(() => panelCocktails(panel), [panel]);
  const cocktails = useMemo(() => stainings.flatMap(staining => staining.cocktails), [stainings]);
  const nounsByCocktail = useMemo(
    () =>
      new Map(
        stainings.flatMap(({ cocktails: stainingCocktails }) => {
          const nouns = stainSampleNouns(
            stainingCocktails.flatMap(cocktail => cocktail.stains),
            samples
          );
          return stainingCocktails.map(cocktail => [cocktail.key, nouns] as const);
        })
      ),
    [stainings, samples]
  );
  const shares = useWorkbenchData(state =>
    cocktails.map(cocktail => {
      const nouns = nounsByCocktail.get(cocktail.key) ?? ['well'];
      return nouns.map((noun): CocktailShare => {
        const id = cocktailAntibodiesId(panel.id, cocktail.key, noun);
        const result = state.board.results.get(id);
        const owner = state.board.names.get(
          nameKey(cocktailAntibodiesName(cocktail.name, noun, nouns.length > 1))
        );
        return {
          noun,
          share: result?.status === 'ok' ? calculationAnswerText(result) : undefined,
          isNameTaken: !!cocktail.rows.length && !!owner && owner.id !== id,
        };
      });
    })
  );
  const markers = useMemo(
    () =>
      new Map(
        layout.lasers.flatMap(laser =>
          laser.slots.flatMap(slot =>
            slot.markers.flatMap(marker => [
              [
                marker.row.id,
                {
                  color: marker.fluorColor ?? slot.color,
                  label: [marker.markerName, marker.fluor].filter(Boolean).join(' '),
                  amountText: marker.amount?.text ?? '',
                },
              ] as const,
              ...(marker.secondary
                ? [
                    [
                      secondaryRowId(marker.row.id),
                      {
                        color: marker.fluorColor ?? slot.color,
                        label: marker.secondary.material?.name.trim() ?? '',
                        amountText: marker.secondary.amount?.text ?? '',
                      },
                    ] as const,
                  ]
                : []),
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
              const cocktailShares = shareOf(cocktail.key) ?? [];
              const counted = cocktailShares.map(({ noun }) => ({
                noun,
                count: cocktail.stains.reduce(
                  (sum, stain) => sum + (samples.get(stain.id)?.get(noun) ?? 0),
                  0
                ),
              }));
              const stainedIn = counted.filter(({ count }) => count > 0);
              const counts = (stainedIn.length ? stainedIn : counted.slice(0, 1))
                .map(({ noun, count }) => `${count} ${count === 1 ? noun : pluralOf(noun)}`)
                .join(' · ');
              const share = shareText(cocktailShares);
              const isNameTaken = cocktailShares.some(candidate => candidate.isNameTaken);
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
                    <span className="text-body-sm tabular-nums">{counts}</span>
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
                          {marker?.amountText && (
                            <span className="text-muted-foreground">{marker.amountText}</span>
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
                  {share && <span className="text-label-xs text-muted-foreground">{share}</span>}
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
