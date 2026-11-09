import { blankProtocol } from '../protocolFile/blankProtocol';

import { materialFromGuess } from './materialItems';
import { EMPTY_LAB_MEMORY } from './materialMemory';
import { fieldSuggestions } from './materialSuggestions';

const material = (name: string, vendor: string) => {
  const item = materialFromGuess(
    { group: 'chem', type: 'Chemical', name, values: {}, why: '', source: 'list' },
    EMPTY_LAB_MEMORY
  );
  item.values['vendor'] = vendor;
  return item;
};

describe('fieldSuggestions', () => {
  it('offers values used elsewhere first, then the built-in vendor list', () => {
    const protocol = blankProtocol();
    for (const block of protocol.blocks) {
      if (block.type === 'materials')
        block.items = [material('A', 'Acme Bio'), material('B', 'Acme Bio')];
    }
    const suggestions = fieldSuggestions(protocol, 'vendor', 'ac', 'other');
    expect(suggestions[0]).toBe('Acme Bio');
    expect(suggestions.length).toBeLessThanOrEqual(8);
    expect(fieldSuggestions(protocol, 'vendor', 'acme bio', 'other')).not.toContain('Acme Bio');
  });
});
