import { blankProtocol } from '../protocolFile/blankProtocol';

import { keepFluorInFile } from './fileFluors';

describe('keepDyeInFile', () => {
  it('adds a fluor once, however it is spelled', () => {
    const draft = blankProtocol();
    keepFluorInFile(draft, { name: ' Qx 512 ', lasers: [488], peak: 512 });
    keepFluorInFile(draft, { name: 'qx-512', lasers: [640], peak: 700 });
    expect(draft.dyes).toEqual([{ name: 'Qx 512', lasers: [488], peak: 512 }]);
  });
});
