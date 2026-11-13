import { createBlock } from '../blocks/createBlock';
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
    runNumber: '',
    runOn: { from: '', to: '' },
    pages: [setup, plates, takedown],
    blocks: [
      createBlock('materials', { page: setup.id, x: 0, y: 0, w: 12, h: 8 }),
      createBlock('steps', { page: setup.id, x: 0, y: 8, w: 12, h: 10 }),
      createBlock('values', { page: plates.id, x: 0, y: 0, w: 6, h: 6 }),
      createBlock('formula', { page: plates.id, x: 6, y: 0, w: 6, h: 6 }),
    ],
    lotMemory: {},
    keptBoth: [],
    ignoredReadings: [],
    dyes: [],
  };
}
