import { createId } from '../ids/createId';

import type { ProtocolBlock, ProtocolBlockType } from '@odysseus/shared-schemas';

type BlockContent<Type extends ProtocolBlockType> = Omit<
  Extract<ProtocolBlock, { type: Type }>,
  'id' | 'type' | 'title' | 'page' | 'x' | 'y' | 'w' | 'h' | 'isCollapsed' | 'expandedHeight'
>;

export interface BlockUsageTip {
  heading: string;
  points: readonly string[];
}

interface BlockType<Type extends ProtocolBlockType> {
  label: string;
  hint: string;
  usageTip?: BlockUsageTip;
  size: readonly [number, number];
  fitsContent?: boolean;
  createContent: () => BlockContent<Type>;
}

export const BLOCK_TYPES: { readonly [Type in ProtocolBlockType]: BlockType<Type> } = {
  materials: {
    label: 'Materials',
    hint: 'Everything the experiment uses, grouped',
    usageTip: {
      heading: 'Add each material your experiment uses',
      points: [
        'Type a name and press [Enter], or paste a list',
        '*Add* vendor, lot # and other details as you go',
      ],
    },
    size: [12, 10],
    fitsContent: true,
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
    usageTip: {
      heading: 'Name the numbers your experiment uses',
      points: [
        'Type a name and amount and press [Enter], or paste a list',
        'Start with a material or mix to put it on that row, e.g. Raji per well 10000 cells',
        'A field the material has, e.g. Raji count, fills it in <materials>',
        'Numbers from the <plate> and <materials> show up on their own',
        'Use them by name in <formula> and <steps>',
      ],
    },
    size: [4, 6],
    fitsContent: true,
    createContent: () => ({ items: [], sections: [] }),
  },
  formula: {
    label: 'Calculations',
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
  cytometer: {
    label: 'Flow panel',
    hint: 'Stains by laser and detector on your cytometer',
    size: [12, 10],
    fitsContent: true,
    createContent: () => ({ rows: [], mixes: [] }),
  },
  steps: {
    label: 'Procedure',
    hint: 'The outline of what you do',
    usageTip: {
      heading: 'Write out what you do, step by step',
      points: [
        '[Shift+Enter] starts the next step',
        '[Tab] indents, [Shift+Tab] outdents',
        'Type [{] to drop in a <values> or <materials> name',
        '*Drag* to reorder',
      ],
    },
    size: [5, 8],
    fitsContent: true,
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
    hint: 'The steps drawn as pictures and arrows',
    usageTip: {
      heading: 'Follow the procedure at the bench',
      points: [
        '*Click* a step to mark your place',
        '[←] or [→] moves your place, [Esc] clears it',
        '*Double-click* a step to edit it in <steps>',
      ],
    },
    size: [12, 6],
    fitsContent: true,
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

export const defaultBlockTitle = (type: ProtocolBlockType): string =>
  BLOCK_TYPES[type].label.toUpperCase();
