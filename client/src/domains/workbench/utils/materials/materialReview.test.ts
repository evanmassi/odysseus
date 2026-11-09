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

import type { MaterialItem, MaterialsBlock, Protocol } from '@odysseus/shared-schemas';

const material = (name: string): MaterialItem =>
  materialFromGuess(
    { group: 'chem', type: 'Chemical', name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );

function setup(items: MaterialItem[]): { protocol: Protocol; block: MaterialsBlock } {
  const protocol = blankProtocol();
  const block = protocol.blocks.find(
    (candidate): candidate is MaterialsBlock => candidate.type === 'materials'
  );
  if (!block) throw new Error('blank protocol has no materials block');
  block.items = items;
  return { protocol, block };
}

describe('pastedReviewRows', () => {
  it('guesses each pasted line and notes which ones are already listed', () => {
    const existing = material('DMSO');
    const rows = pastedReviewRows(
      'DMSO\nHeLa\n\n- 96-well plate',
      [existing],
      [],
      new Map(),
      EMPTY_LAB_MEMORY
    );
    expect(rows.map(row => row.item.name)).toEqual(['DMSO', 'HeLa', '96-well plate']);
    expect(rows.map(row => row.duplicateId)).toEqual([existing.id, undefined, undefined]);
    expect(rows[1].item.type).toBe('Cell line');
  });

  it('only treats text with more than one line as a list', () => {
    expect(hasMultipleLines('HeLa\n')).toBe(false);
    expect(hasMultipleLines('HeLa\nDMSO')).toBe(true);
  });
});

describe('reviewActionLabel', () => {
  const row = (isDuplicate: boolean, isKeptBoth = false): MaterialReviewRow => ({
    item: material('x'),
    why: '',
    duplicateId: isDuplicate ? 'dupe' : undefined,
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
  it('merges into the duplicate, adds the rest and unfolds their group', () => {
    const existing = material('DMSO');
    const { protocol, block } = setup([existing]);
    block.foldedGroups = ['chem'];
    const typed = material('dmso');
    typed.values['vendor'] = 'Sigma';
    const fresh = material('Ethanol');
    const ids = commitReviewRows(protocol, block.id, [
      reviewRow(block.items, protocol.keptBoth, typed, ''),
      reviewRow(block.items, protocol.keptBoth, fresh, ''),
    ]);
    expect(ids).toEqual([existing.id, fresh.id]);
    expect(block.items.map(item => item.name)).toEqual(['DMSO', 'Ethanol']);
    expect(block.items[0].values['vendor']).toBe('Sigma');
    expect(block.foldedGroups).toEqual([]);
  });

  it('keeps both on request and remembers the name so it is not flagged again', () => {
    const { protocol, block } = setup([material('DMSO')]);
    const typed = material('DMSO');
    commitReviewRows(protocol, block.id, [
      { ...reviewRow(block.items, protocol.keptBoth, typed, ''), isKeptBoth: true },
    ]);
    expect(block.items).toHaveLength(2);
    expect(protocol.keptBoth).toEqual(['dmso']);
    expect(
      reviewRow(block.items, protocol.keptBoth, material('DMSO'), '').duplicateId
    ).toBeUndefined();
  });

  it('adds a row whose duplicate was removed in the meantime', () => {
    const existing = material('DMSO');
    const { protocol, block } = setup([existing]);
    const row = reviewRow(block.items, protocol.keptBoth, material('DMSO'), '');
    block.items = [];
    commitReviewRows(protocol, block.id, [row]);
    expect(block.items).toHaveLength(1);
  });
});
