export type RemovableType = 'plateMap' | 'flowCytometryPanel';

const REMOVAL: Record<RemovableType, { title: string; what: string }> = {
  plateMap: {
    title: 'Remove plate map',
    what: 'with everything in it and the stains painted on it',
  },
  flowCytometryPanel: {
    title: 'Remove Flow panel',
    what: 'with its markers and stains, and its stains come off the plates',
  },
};

export const removalTitle = (type: RemovableType): string => REMOVAL[type].title;

export const removalMessage = (type: RemovableType, label: string): string =>
  `"${label}" will be permanently removed, ${REMOVAL[type].what}. Cards showing it close.`;
