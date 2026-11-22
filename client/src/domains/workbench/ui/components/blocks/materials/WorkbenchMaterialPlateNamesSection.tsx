import { useMemo } from 'react';

import { Button, ScrollArea, Select, Tooltip } from '@shared/ui';

import { usePlateSwatches } from '../../../../hooks/usePlateSwatches';
import { useBlocksOf } from '../../../../hooks/useWorkbenchSlice';
import { useMaterialMemoryStore } from '../../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { materialGroup } from '../../../../utils/materials/materialCatalog';
import { guessMaterial } from '../../../../utils/materials/materialGuesser';
import { materialFromGuess } from '../../../../utils/materials/materialItems';
import { ensureMaterial, listedMaterials } from '../../../../utils/materials/materialLookup';
import {
  materialKnowledge,
  startingSourceFieldsOf,
} from '../../../../utils/materials/materialMemory';
import { addSourcesNamed, donorTargetsOf } from '../../../../utils/materials/materialSources';
import { linkPlateName } from '../../../../utils/materials/plateNameOffers';
import { WorkbenchIndicatorSwatch } from '../plateMap/WorkbenchIndicatorSwatch';

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
}

export function WorkbenchMaterialPlateNamesSection({
  offers,
}: WorkbenchMaterialPlateNamesSectionProps) {
  const materialBlocks = useBlocksOf('materials');
  const fileFluors = useWorkbenchStore(state => state.protocol.dyes);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const memory = useMaterialMemoryStore(state => state.memory);
  const swatchOf = usePlateSwatches();
  const known = useMemo(
    () => materialKnowledge(memory, { blocks: materialBlocks, dyes: fileFluors }),
    [memory, materialBlocks, fileFluors]
  );
  const materialsOnly = useMemo(() => ({ blocks: materialBlocks }), [materialBlocks]);
  const donorTargets = useMemo(() => donorTargetsOf(materialsOnly), [materialsOnly]);
  const materialChoices = useMemo(
    () =>
      listedMaterials(materialsOnly).map(item => ({
        value: item.id,
        label: item.name,
        group: materialGroup(item.group).label,
      })),
    [materialsOnly]
  );
  const guessType = (name: string) => guessMaterial(name, known).type;

  const onAdd = (added: readonly PlateNameOffer[]) =>
    updateProtocol(draft => {
      for (const offer of added) {
        ensureMaterial(draft, offer.name, name =>
          materialFromGuess(guessMaterial(name, known), memory)
        );
      }
    });
  const onAddAsDonors = (added: readonly PlateNameOffer[], materialId: string) =>
    updateProtocol(draft => {
      const item = listedMaterials(draft).find(candidate => candidate.id === materialId);
      if (!item) return;
      addSourcesNamed(
        item,
        added.map(offer => offer.name),
        startingSourceFieldsOf(memory, item.group),
        memory.sourceFields
      );
    });
  const onLink = (offer: PlateNameOffer, materialId: string) =>
    updateProtocol(draft => linkPlateName(draft, offer.name, materialId));
  const onIgnore = (offer: PlateNameOffer) =>
    updateProtocol(draft => {
      draft.ignoredReadings.push(offer.key);
    });

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
                placeholder="Add all to…"
                aria-label="Add them all to a donor list"
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
                    <WorkbenchIndicatorSwatch swatch={swatchOf(offer.name)} />
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
                            placeholder="Add to…"
                            aria-label={`Add ${offer.name} to a donor list`}
                            options={[...donorTargets]}
                            onChange={choice => choice && onAddAsDonors([offer], String(choice))}
                          />
                        </span>
                      </Tooltip>
                    )}
                    {materialChoices.length > 0 && (
                      <Tooltip
                        content={`Link it to a material you already listed; that material is renamed "${offer.name} (its name)"`}
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
