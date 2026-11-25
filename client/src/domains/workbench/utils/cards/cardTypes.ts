import { createId } from '../ids/createId';

import type { ProtocolCard, ProtocolCardType } from '@odysseus/shared-schemas';

type CardContent<Type extends ProtocolCardType> = Omit<
  Extract<ProtocolCard, { type: Type }>,
  'id' | 'type' | 'title' | 'page' | 'x' | 'y' | 'w' | 'h' | 'isCollapsed' | 'expandedHeight'
>;

export interface CardUsageTip {
  heading: string;
  points: readonly string[];
}

interface CardType<Type extends ProtocolCardType> {
  label: string;
  hint: string;
  usageTip?: CardUsageTip;
  size: readonly [number, number];
  fitsContent?: boolean;
  createContent: () => CardContent<Type>;
}

export const CARD_TYPES: { readonly [Type in ProtocolCardType]: CardType<Type> } = {
  materials: {
    label: 'Materials',
    hint: 'Everything the experiment uses, grouped',
    usageTip: {
      heading: 'Add each material your experiment uses',
      points: [
        'Type a name and press [Enter], or paste a list',
        '*Add* source, lot # and other details as you go',
      ],
    },
    size: [12, 10],
    fitsContent: true,
    createContent: () => ({ foldedGroups: [], isSetAsideOpen: false }),
  },
  values: {
    label: 'Values',
    hint: 'Named numbers you set',
    usageTip: {
      heading: 'Name the numbers your experiment uses',
      points: [
        'Type a name and amount and press [Enter], or paste a list',
        'Start with a material or mix to put it on that row, e.g. Raji Cells/well 10000',
        'A field the material has, e.g. Raji Viability, fills it in <materials>',
        'Numbers from the <plateMap> and <materials> show up on their own',
        'Use them by name in <calculations> and <procedure>',
      ],
    },
    size: [4, 6],
    fitsContent: true,
    createContent: () => ({}),
  },
  calculations: {
    label: 'Calculations',
    hint: 'Math over your values, shown with its working',
    usageTip: {
      heading: 'Work out numbers from your values',
      points: [
        'Type a name and press [Enter], or type Name = formula',
        'Start with a material, e.g. Raji Total needed, to put it under that material',
        'Names from <values>, <materials> and the <plateMap> are offered as you type, [Tab] picks one',
        '*Click* a calculation to edit it and see its working',
      ],
    },
    size: [4, 6],
    fitsContent: true,
    createContent: () => ({}),
  },
  plateMap: {
    label: 'Plate map',
    hint: 'Plates, flasks, dishes or tubes; counts feed calculations',
    size: [6, 14],
    fitsContent: true,
    createContent: () => ({
      plates: [{ id: createId(), labware: '96' as const, name: '' }],
      otherLabware: [],
      activeTab: 0,
      lines: [],
      samples: {},
      series: {},
      showsReplicatesAsOne: true,
      counts: {},
      amountNames: {},
      side: 'assay' as const,
      stain: {},
      stainedIn: {},
    }),
  },
  linkedPlateMap: {
    label: 'Plate map',
    hint: 'Labware shown from another page',
    size: [6, 14],
    fitsContent: true,
    createContent: () => ({
      shows: '',
      side: 'assay' as const,
      activeTab: 0,
      showsReplicatesAsOne: true,
    }),
  },
  flowCytometryPanel: {
    label: 'Flow panel',
    hint: 'Markers by laser and detector on your cytometer',
    usageTip: {
      heading: 'Lay out your markers on the cytometer',
      points: [
        'Pick the cytometer, and each detector becomes a row under its laser',
        '*Add a marker* on a detector picks one from <materials> or makes a new one',
        'A marker lights amber when another detector would read its fluor better',
        '*Full stain*, *Single stain* and *FMO* make the stains for your controls',
        'Type a stain name on wells in the <plateMap> to count its wells',
        'Amounts per well and cocktails are names you can use in <calculations>',
      ],
    },
    size: [12, 10],
    fitsContent: true,
    createContent: () => ({ markers: [], stains: [] }),
  },
  procedure: {
    label: 'Procedure',
    hint: 'The outline of what you do',
    usageTip: {
      heading: 'Write out what you do, step by step',
      points: [
        '[Shift+Enter] starts the next step',
        '[Tab] moves in, [Shift+Tab] moves out',
        'Type [{] to insert a <values> or <materials> name',
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
    usageTip: {
      heading: 'See how to make each dilution series',
      points: [
        'Pick wells on the <plateMap>, type an amount and click *Dilution*',
        'Set the *Diluent* once at the top, or per series',
        '*Extra* covers dead volume, *Round to* matches your pipette',
        'A missing stock or molecular weight is asked for here and saved in <materials>',
        'The volumes are names you can use in <calculations> and <procedure>',
      ],
    },
    size: [12, 10],
    fitsContent: true,
    createContent: () => ({}),
  },
  flowDiagram: {
    label: 'Flow diagram',
    hint: 'The steps drawn as pictures and arrows',
    usageTip: {
      heading: 'Follow the procedure at the bench',
      points: [
        '*Click* a step to mark your place',
        '[←] or [→] moves your place, [Esc] clears it',
        '*Double-click* a step to edit it in <procedure>',
      ],
    },
    size: [12, 6],
    fitsContent: true,
    createContent: () => ({}),
  },
};

export const defaultCardTitle = (type: ProtocolCardType): string => CARD_TYPES[type].label;
