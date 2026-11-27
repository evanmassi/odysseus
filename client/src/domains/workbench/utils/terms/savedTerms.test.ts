import { produce } from 'immer';

import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { blankProtocol } from '../protocolFile/blankProtocol';

import { keepRecognizedTerms } from './savedTerms';
import { TOTAL_WELL_VOLUME } from './termList';
import { findTerm } from './termLookup';

import type { Protocol } from '@odysseus/shared-schemas';

const withWellVolume = (name: string) =>
  produce(blankProtocol(), draft => {
    draft.values.items.push({ id: 'total', name, value: '80', unit: 'µL' });
    keepRecognizedTerms(draft);
  });

const renamed = (protocol: Protocol, name: string) =>
  produce(protocol, draft => {
    const [item] = draft.values.items;
    if ('name' in item) item.name = name;
    keepRecognizedTerms(draft);
  });

const termOf = (protocol: Protocol) => {
  const [item] = protocol.values.items;
  return 'name' in item ? item.term : undefined;
};

describe('keepRecognizedTerms', () => {
  it('lets a name the word list knows say what kind of number it is', () => {
    expect(termOf(withWellVolume('Total well vol.'))).toEqual({
      key: 'total-well-volume',
      noun: 'well',
    });
  });

  it('keeps the kind through a rename to a name the word list does not know', () => {
    const protocol = renamed(withWellVolume('Total well vol.'), 'Final vol.');
    expect(termOf(protocol)).toEqual({ key: 'total-well-volume', noun: 'well' });
    const board = calculateBoard(collectBoardNames(protocol));
    expect(findTerm(board.kinds, TOTAL_WELL_VOLUME, [''])?.name).toBe('Final vol.');
  });

  it('takes the new kind when the new name is another word the list knows', () => {
    expect(termOf(renamed(withWellVolume('Total well vol.'), 'Vol./well'))).toEqual({
      key: 'volume-per-well',
      noun: 'well',
    });
  });
});
