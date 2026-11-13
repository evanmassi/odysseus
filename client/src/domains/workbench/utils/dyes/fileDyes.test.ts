import { blankProtocol } from '../protocolFile/blankProtocol';

import { keepDyeInFile } from './fileDyes';

describe('keepDyeInFile', () => {
  it('adds a dye once, however it is spelled', () => {
    const draft = blankProtocol();
    keepDyeInFile(draft, { name: ' Qx 512 ', lasers: [488], peak: 512 });
    keepDyeInFile(draft, { name: 'qx-512', lasers: [640], peak: 700 });
    expect(draft.dyes).toEqual([{ name: 'Qx 512', lasers: [488], peak: 512 }]);
  });
});
