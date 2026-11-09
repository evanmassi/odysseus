const GREEK_LETTERS: Readonly<Record<string, string>> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  kappa: 'κ',
  lambda: 'λ',
};

const NAMES = Object.keys(GREEK_LETTERS).join('|');
const ATTACHED = new RegExp(`(?<=[A-Za-z0-9-])(${NAMES})(?![A-Za-z])`, 'gi');
const LEADING = new RegExp(`(?<![A-Za-z0-9])(${NAMES})(?=-)`, 'g');

export const withGreekLetters = (text: string): string =>
  text
    .replace(ATTACHED, word => GREEK_LETTERS[word.toLowerCase()] ?? word)
    .replace(LEADING, word => GREEK_LETTERS[word] ?? word);
