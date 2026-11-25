import { blankProtocol } from '../protocolFile/blankProtocol';

import { materialFromGuess } from './materialItems';
import { EMPTY_LAB_MEMORY } from './materialMemory';
import {
  commitReviewRows,
  hasMultipleLines,
  pastedReviewRows,
  reviewActionLabel,
  reviewRow,
  type MaterialReviewRow,
} from './materialReview';

import type { MaterialItem, MaterialsCard, Protocol } from '@odysseus/shared-schemas';

const material = (name: string): MaterialItem =>
  materialFromGuess(
    { group: 'chem', type: 'Chemical', name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );

function setup(items: MaterialItem[]): { protocol: Protocol; card: MaterialsCard } {
  const protocol = blankProtocol();
  const card = protocol.cards.find(
    (candidate): candidate is MaterialsCard => candidate.type === 'materials'
  );
  if (!card) throw new Error('blank protocol has no materials block');
  protocol.materials.items = items;
  return { protocol, card };
}

describe('pastedReviewRows', () => {
  it('guesses each pasted line and notes which ones are already listed', () => {
    const existing = material('DMSO');
    const rows = pastedReviewRows(
      'DMSO\nHeLa\n\n- 96-well plate',
      [existing],
      [],
      { knownTypes: new Map(), fluors: [] },
      EMPTY_LAB_MEMORY
    );
    expect(rows.map(row => row.item.name)).toEqual(['DMSO', 'HeLa', '96-well plate']);
    expect(rows.map(row => row.alreadyListedId)).toEqual([existing.id, undefined, undefined]);
    expect(rows[1].item.type).toBe('Cell line');
  });

  it('only treats text with more than one line as a list', () => {
    expect(hasMultipleLines('HeLa\n')).toBe(false);
    expect(hasMultipleLines('HeLa\nDMSO')).toBe(true);
  });
});

describe('reviewActionLabel', () => {
  const row = (isAlreadyListed: boolean, isKeptBoth = false): MaterialReviewRow => ({
    item: material('x'),
    why: '',
    alreadyListedId: isAlreadyListed ? 'dupe' : undefined,
    isKeptBoth,
    isCorrected: false,
  });

  it('counts additions and merges', () => {
    expect(reviewActionLabel([row(false)])).toBe('Add 1 material');
    expect(reviewActionLabel([row(false), row(true), row(true, true)])).toBe(
      'Add 2 materials, merge 1'
    );
    expect(reviewActionLabel([row(true)])).toBe('Merge 1');
  });
});

describe('commitReviewRows', () => {
  it('merges into the material already listed, adds the rest and unfolds their group', () => {
    const existing = material('DMSO');
    const { protocol, card } = setup([existing]);
    card.foldedGroups = ['chem'];
    const typed = material('dmso');
    typed.values['source'] = 'Sigma';
    const fresh = material('Ethanol');
    const ids = commitReviewRows(protocol, [
      reviewRow(protocol.materials.items, protocol.keptBoth, typed, ''),
      reviewRow(protocol.materials.items, protocol.keptBoth, fresh, ''),
    ]);
    expect(ids).toEqual([existing.id, fresh.id]);
    expect(protocol.materials.items.map(item => item.name)).toEqual(['DMSO', 'Ethanol']);
    expect(protocol.materials.items[0].values['source']).toBe('Sigma');
    expect(card.foldedGroups).toEqual([]);
  });

  it('keeps both on request and remembers the name so it is not flagged again', () => {
    const { protocol } = setup([material('DMSO')]);
    const typed = material('DMSO');
    commitReviewRows(protocol, [
      { ...reviewRow(protocol.materials.items, protocol.keptBoth, typed, ''), isKeptBoth: true },
    ]);
    expect(protocol.materials.items).toHaveLength(2);
    expect(protocol.keptBoth).toEqual(['dmso']);
    expect(
      reviewRow(protocol.materials.items, protocol.keptBoth, material('DMSO'), '').alreadyListedId
    ).toBeUndefined();
  });

  it('adds a row whose already listed match was removed in the meantime', () => {
    const existing = material('DMSO');
    const { protocol } = setup([existing]);
    const row = reviewRow(protocol.materials.items, protocol.keptBoth, material('DMSO'), '');
    protocol.materials.items = [];
    commitReviewRows(protocol, [row]);
    expect(protocol.materials.items).toHaveLength(1);
  });
});
