import type { PlateMap, PlateMapCard } from '@odysseus/shared-schemas';

export type PlateMapDisplay = Pick<PlateMapCard, 'side' | 'activeTab' | 'showsReplicatesAsOne'>;

export type ShownPlateMap = PlateMap & PlateMapDisplay;

export const shownPlateMap = (plateMap: PlateMap, card: PlateMapCard): ShownPlateMap => ({
  ...plateMap,
  side: card.side,
  activeTab: card.activeTab,
  showsReplicatesAsOne: card.showsReplicatesAsOne,
});
