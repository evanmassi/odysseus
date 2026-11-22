import { createCard } from '../cards/createCard';
import { createId } from '../ids/createId';

import type { Protocol } from '@odysseus/shared-schemas';

export function blankProtocol(): Protocol {
  const [setup, plates, takedown] = ['Setup', 'Plates & calculations', 'Takedown'].map(name => ({
    id: createId(),
    name,
    steps: [],
  }));
  return {
    title: 'Untitled protocol',
    descriptor: '',
    purpose: '',
    runNumber: '',
    runOn: { from: '', to: '' },
    pages: [setup, plates, takedown],
    cards: [
      createCard('materials', { page: setup.id, x: 0, y: 0, w: 12, h: 8 }),
      createCard('procedure', { page: setup.id, x: 0, y: 8, w: 12, h: 10 }),
      createCard('values', { page: plates.id, x: 0, y: 0, w: 6, h: 6 }),
      createCard('calculations', { page: plates.id, x: 6, y: 0, w: 6, h: 6 }),
    ],
    lotMemory: {},
    keptBoth: [],
    ignoredSuggestions: [],
    fluors: [],
    diluent: '',
  };
}
