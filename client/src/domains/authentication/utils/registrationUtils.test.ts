import { describe, expect, it } from 'vitest';

import { generateUsernamePreview } from './registrationUtils';

describe('generateUsernamePreview', () => {
  it('stays empty until both names are typed', () => {
    expect(generateUsernamePreview('Evan', '')).toBe('');
    expect(generateUsernamePreview('  ', 'Massi')).toBe('');
  });

  it('lowercases and joins the names with a dot', () => {
    expect(generateUsernamePreview('Evan', 'Massi')).toBe('evan.massi');
  });

  it('drops characters the server drops and keeps digits it keeps', () => {
    expect(generateUsernamePreview('Mary-Jane', "O'Brien 2")).toBe('maryjane.obrien2');
  });
});
