import { createCard } from '../cards/createCard';
import { createId } from '../ids/createId';

import type { Protocol } from '@odysseus/shared-schemas';

export function blankProtocol(): Protocol {
  const page = { id: createId(), name: 'Page 1', steps: [] };
  return {
    title: 'Untitled protocol',
    descriptor: '',
    purpose: '',
    runNumber: '',
    runOn: { from: '', to: '' },
    pages: [page],
    materials: { items: [], customGroups: [] },
    values: { items: [], rows: [] },
    calculations: { items: [], materialSections: [] },
    plateMaps: [],
    cards: [
      createCard('materials', { page: page.id, x: 0, y: 0, w: 12, h: 8 }),
      createCard('procedure', { page: page.id, x: 0, y: 8, w: 12, h: 10 }),
      createCard('values', { page: page.id, x: 0, y: 18, w: 6, h: 6 }),
      createCard('calculations', { page: page.id, x: 6, y: 18, w: 6, h: 6 }),
    ],
    lotMemory: {},
    keptBoth: [],
    ignoredSuggestions: [],
    fluors: [],
    diluent: '',
  };
}
