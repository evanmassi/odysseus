import { Button, ScrollArea, Select, Tooltip, type SelectOption } from '@shared/ui';

import {
  HORIZONTAL_SCROLL,
  MATERIAL_ACTIONS_CELL,
  MATERIAL_CELL,
  MATERIAL_MUTED,
  MATERIAL_TABLE,
  ROW_ACTION,
  materialRowClass,
} from './materialTableStyles';
import { WorkbenchMaterialSection } from './WorkbenchMaterialSection';

import type { PlateNameOffer } from '../../../../utils/materials/plateNameOffers';

interface WorkbenchMaterialPlateNamesSectionProps {
  offers: readonly PlateNameOffer[];
  materialChoices: SelectOption[];
  donorTargets: readonly SelectOption[];
  guessType: (name: string) => string;
  onAdd: (offers: readonly PlateNameOffer[]) => void;
  onAddAsDonors: (offers: readonly PlateNameOffer[], materialId: string) => void;
  onLink: (offer: PlateNameOffer, materialId: string) => void;
  onIgnore: (offer: PlateNameOffer) => void;
}

export function WorkbenchMaterialPlateNamesSection({
  offers,
  materialChoices,
  donorTargets,
  guessType,
  onAdd,
  onAddAsDonors,
  onLink,
  onIgnore,
}: WorkbenchMaterialPlateNamesSectionProps) {
  return (
    <WorkbenchMaterialSection
      title="From your plate"
      count={offers.length}
      action={
        <span className="inline-flex items-center gap-1">
          <Button variant="ghost" size="xs" onClick={() => onAdd(offers)}>
            Add all
          </Button>
          {donorTargets.length > 0 && (
            <span className="w-44">
              <Select
                size="xs"
                isQuiet
                value=""
                placeholder="All as donors of…"
                aria-label="Add them all as donors of"
                options={[...donorTargets]}
                onChange={choice => choice && onAddAsDonors(offers, String(choice))}
              />
            </span>
          )}
        </span>
      }
    >
      <ScrollArea options={HORIZONTAL_SCROLL}>
        <table className={MATERIAL_TABLE}>
          <tbody>
            {offers.map((offer, index) => (
              <tr key={offer.key} className={`${materialRowClass(index)} italic`}>
                <td className={`${MATERIAL_CELL} text-muted-foreground`}>
                  <span className="flex items-center gap-2">
                    {offer.color && (
                      <span
                        aria-hidden
                        className="h-3 w-3 flex-none border border-line-soft"
                        style={{ backgroundColor: offer.color }}
                      />
                    )}
                    {offer.name}
                  </span>
                </td>
                <td className={`${MATERIAL_CELL} ${MATERIAL_MUTED}`}>{guessType(offer.name)}</td>
                <td className={`${MATERIAL_CELL} ${MATERIAL_MUTED}`}>
                  {offer.wellCount === 1 ? '1 well' : `${offer.wellCount} wells`}
                </td>
                <td className={`${MATERIAL_ACTIONS_CELL} not-italic`}>
                  <span className="inline-flex items-center gap-1">
                    <Button variant="ghost" size="xs" onClick={() => onAdd([offer])}>
                      Add
                    </Button>
                    {donorTargets.length > 0 && (
                      <Tooltip content="Add it as a donor of a cell material, listed under that material">
                        <span className="w-36">
                          <Select
                            size="xs"
                            isQuiet
                            value=""
                            placeholder="Donor of…"
                            aria-label={`${offer.name} is a donor of`}
                            options={[...donorTargets]}
                            onChange={choice => choice && onAddAsDonors([offer], String(choice))}
                          />
                        </span>
                      </Tooltip>
                    )}
                    {materialChoices.length > 0 && (
                      <Tooltip
                        content={`Link it to a material you already listed; that material is renamed “${offer.name} (its name)”`}
                      >
                        <span className="w-36">
                          <Select
                            size="xs"
                            isQuiet
                            value=""
                            placeholder="Same as…"
                            aria-label={`${offer.name} is the same as`}
                            options={materialChoices}
                            onChange={choice => choice && onLink(offer, String(choice))}
                          />
                        </span>
                      </Tooltip>
                    )}
                    <Button
                      variant="ghost-danger"
                      size="xs"
                      className={ROW_ACTION}
                      onClick={() => onIgnore(offer)}
                    >
                      Ignore
                    </Button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </WorkbenchMaterialSection>
  );
}
