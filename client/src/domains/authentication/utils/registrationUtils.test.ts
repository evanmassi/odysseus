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

  it.each([
    ['José', 'García', 'jose.garcia'],
    ['Zoë', 'Müller', 'zoe.muller'],
    ['Aoife', 'Ní Bhriain', 'aoife.nibhriain'],
    ['ÉMILE', 'ZOLA', 'emile.zola'],
  ])('keeps the letter under an accent: %s %s', (firstName, lastName, expected) => {
    expect(generateUsernamePreview(firstName, lastName)).toBe(expected);
  });

  it.each([
    ['Søren', 'Straße', 'soren.strasse'],
    ['Łukasz', 'Nuñez', 'lukasz.nunez'],
    ['Æsa', 'Œuvre', 'aesa.oeuvre'],
  ])('spells out letters that have no accent to strip: %s %s', (firstName, lastName, expected) => {
    expect(generateUsernamePreview(firstName, lastName)).toBe(expected);
  });

  it('uses the remaining name when one has no usable letters', () => {
    expect(generateUsernamePreview('李', 'Wei')).toBe('wei');
  });

  it('falls back to a plain base when neither name has usable letters', () => {
    expect(generateUsernamePreview('Иван', 'Петров')).toBe('user');
  });
});
