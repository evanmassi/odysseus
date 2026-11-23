import { readProtocolFile } from '../protocolFile';

import type { Protocol } from '@odysseus/shared-schemas';

type RawItem = Record<string, unknown>;

export interface RawCard {
  id: string;
  items?: RawItem[];
  rows?: RawItem[];
  series?: Record<string, { prep?: Record<string, string> }>;
  markers?: RawItem[];
}

export type CardOf = (id: string) => RawCard;

export function openedWith(sample: unknown, change: (cardOf: CardOf) => void): Protocol {
  const file = structuredClone(sample) as { protocol: { cards: RawCard[] } };
  change(id => {
    const card = file.protocol.cards.find(candidate => candidate.id === id);
    if (!card) throw new Error(`no card ${id}`);
    return card;
  });
  return readProtocolFile(JSON.stringify(file));
}
