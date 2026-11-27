import { produce } from 'immer';

import { calculateBoard, type BoardName } from '../formulas/boardCalculation';
import { collectBoardNames } from '../formulas/boardNames';
import everyCardSample from '../protocolFile/fixtures/everyCard.json';
import { readProtocolFile } from '../protocolFile/protocolFile';

import { valueSourceOf, writeValueSource, type ValueSource } from './valueSources';

import type { Protocol } from '@odysseus/shared-schemas';

const protocol = readProtocolFile(JSON.stringify(everyCardSample));
const boardOf = (from: Protocol) => calculateBoard(collectBoardNames(from));

const reading = (entry: BoardName | undefined) =>
  entry?.kind === 'value' ? entry.value : entry?.kind === 'count' ? String(entry.count) : undefined;

type SavedReading = Extract<BoardName['kind'], 'value' | 'count'>;

const numberSavedIn = (kind: ValueSource['kind'], reads: SavedReading) =>
  [...boardOf(protocol).ids.values()].find(
    entry => entry.kind === reads && valueSourceOf(protocol, entry.id)?.kind === kind
  );

describe('one address book for every saved number', () => {
  it.each<[ValueSource['kind'], SavedReading]>([
    ['item', 'value'],
    ['material', 'value'],
    ['donor', 'value'],
    ['plate', 'count'],
    ['plate', 'value'],
    ['recipe', 'value'],
    ['roundTo', 'value'],
  ])('finds a %s %s by its id and writes it where it is saved', (kind, reads) => {
    const entry = numberSavedIn(kind, reads);
    const source = entry && valueSourceOf(protocol, entry.id);
    expect(source?.kind).toBe(kind);
    const written = produce(protocol, draft => {
      if (source) writeValueSource(draft, source, '7');
    });
    expect(reading(boardOf(written).ids.get(entry?.id ?? ''))).toBe('7');
  });

  it('has no address for a worked-out number', () => {
    const worked = [...boardOf(protocol).ids.values()].find(entry => entry.kind === 'calculation');
    expect(worked && valueSourceOf(protocol, worked.id)).toBeUndefined();
  });
});
