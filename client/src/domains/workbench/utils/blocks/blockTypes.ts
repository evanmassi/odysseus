import { createId } from '../ids/createId';

import type { ProtocolBlock, ProtocolBlockType } from '@odysseus/shared-schemas';

type BlockContent<Type extends ProtocolBlockType> = Omit<
  Extract<ProtocolBlock, { type: Type }>,
  'id' | 'type' | 'title' | 'page' | 'x' | 'y' | 'w' | 'h' | 'isCollapsed' | 'expandedHeight'
>;

interface BlockType<Type extends ProtocolBlockType> {
  label: string;
  hint: string;
  size: readonly [number, number];
  fitsContent?: boolean;
  createContent: () => BlockContent<Type>;
}

export const BLOCK_TYPES: { readonly [Type in ProtocolBlockType]: BlockType<Type> } = {
  materials: {
    label: 'Materials',
    hint: 'Everything the experiment uses, grouped',
    size: [12, 10],
    createContent: () => ({ foldedGroups: [], customGroups: [], isDroppedOpen: false, items: [] }),
  },
  list: {
    label: 'Table',
    hint: 'Your own columns, e.g. a standard curve',
    size: [12, 6],
    createContent: () => ({
      isNamed: false,
      columns: ['Column 1', 'Column 2', 'Column 3'].map(name => ({
        id: createId(),
        name,
        kind: 'text' as const,
        unit: '',
        options: [],
        isHidden: false,
        warnsWhenPast: false,
      })),
      items: [],
    }),
  },
  values: {
    label: 'Values',
    hint: 'Named numbers you set',
    size: [4, 6],
    fitsContent: true,
    createContent: () => ({ items: [], sections: [] }),
  },
  formula: {
    label: 'Formula',
    hint: 'Math over your values, shown with its working',
    size: [4, 6],
    fitsContent: true,
    createContent: () => ({ items: [], materialSections: [] }),
  },
  plate: {
    label: 'Vessel map',
    hint: 'Plates, flasks, dishes or tubes; counts feed formulas',
    size: [6, 14],
    fitsContent: true,
    createContent: () => ({
      plates: [{ id: createId(), vessel: '96' as const, name: '' }],
      sets: [],
      activeTab: 0,
      lines: [],
      cells: {},
      series: {},
      mergesReplicates: true,
      counts: {},
      amountNames: {},
    }),
  },
  steps: {
    label: 'Steps',
    hint: 'The outline of what you do',
    size: [5, 8],
    createContent: () => ({}),
  },
  dilutions: {
    label: 'Dilutions',
    hint: 'How to make each series on your plates',
    size: [12, 10],
    fitsContent: true,
    createContent: () => ({}),
  },
  flow: {
    label: 'Flow diagram',
    hint: 'The steps drawn as boxes and arrows',
    size: [12, 6],
    createContent: () => ({}),
  },
  sketch: {
    label: 'Sketch',
    hint: 'A freehand whiteboard tile',
    size: [3, 6],
    createContent: () => ({ strokes: [] }),
  },
  text: { label: 'Text', hint: 'Free notes', size: [4, 3], createContent: () => ({ html: '' }) },
};
