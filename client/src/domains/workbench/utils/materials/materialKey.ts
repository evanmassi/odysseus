import { withGreekLetters } from './greekLetters';

const LATIN_FOR_GREEK: readonly (readonly [RegExp, string])[] = [
  [/α/g, 'a'],
  [/β/g, 'b'],
  [/γ/g, 'g'],
  [/δ/g, 'd'],
  [/κ/g, 'k'],
  [/λ/g, 'l'],
  [/ε/g, 'e'],
  [/[µμ]/g, 'u'],
];
const NON_KEY_CHARACTERS = /[^a-z0-9]/g;

export const normalizeMaterialKey = (text: string): string =>
  LATIN_FOR_GREEK.reduce(
    (key, [letter, latin]) => key.replace(letter, latin),
    withGreekLetters(text).toLowerCase()
  ).replace(NON_KEY_CHARACTERS, '');
