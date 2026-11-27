import { produce } from 'immer';

import { calculateBoard } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import { blankProtocol } from '../protocolFile/blankProtocol';

import {
  isTermUnsaid,
  keepRecognizedTerms,
  looseKindChoices,
  setLooseTerm,
  termWord,
} from './savedTerms';
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

const WELL_VOLUME = { key: 'total-well-volume', noun: 'well' };

const twoLoose = (first: string, second: string) =>
  produce(blankProtocol(), draft => {
    draft.values.items.push(
      { id: 'first', name: first, value: '80', unit: 'µL' },
      { id: 'second', name: second, value: '90', unit: 'µL' }
    );
    keepRecognizedTerms(draft);
  });

const itemNamed = (protocol: Protocol, id: string) => {
  const item = protocol.values.items.find(candidate => candidate.id === id);
  if (!item || !('name' in item)) throw new Error(`no value ${id}`);
  return item;
};

describe('choosing what a value is', () => {
  it('shows the kind only when the name does not say it', () => {
    const protocol = renamed(withWellVolume('Total well vol.'), 'Final vol.');
    expect(isTermUnsaid(itemNamed(protocol, 'total'))).toBe(true);
    expect(termWord(WELL_VOLUME)).toBe('Total well vol.');
    expect(isTermUnsaid(itemNamed(withWellVolume('Total well vol.'), 'total'))).toBe(false);
  });

  it('moves a kind off a value whose name does not say it, telling where it was', () => {
    const tagged = produce(twoLoose('Final vol.', 'Fill vol.'), draft =>
      setLooseTerm(draft, 'first', WELL_VOLUME)
    );
    const choice = looseKindChoices(tagged, 'second').find(
      each => each.term.key === WELL_VOLUME.key && each.term.noun === 'well'
    );
    expect(choice?.heldBy).toBe('Final vol.');
    const moved = produce(tagged, draft => setLooseTerm(draft, 'second', WELL_VOLUME));
    expect(itemNamed(moved, 'first').term).toBeUndefined();
    expect(itemNamed(moved, 'second').term).toEqual(WELL_VOLUME);
  });

  it('flags two values of one kind and lets the math wait until one changes', () => {
    const protocol = produce(twoLoose('Total well vol.', 'Fill vol.'), draft =>
      setLooseTerm(draft, 'second', WELL_VOLUME)
    );
    expect(itemNamed(protocol, 'first').term).toEqual(WELL_VOLUME);
    const board = calculateBoard(collectBoardNames(protocol));
    expect([...board.takenKindIds].sort()).toEqual(['first', 'second']);
    expect(findTerm(board.kinds, TOTAL_WELL_VOLUME, [''])).toBeUndefined();
  });
});
