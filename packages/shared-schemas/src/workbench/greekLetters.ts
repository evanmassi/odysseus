const GREEK_LETTERS: Readonly<Record<string, string>> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  zeta: 'ζ',
  theta: 'θ',
  kappa: 'κ',
  lambda: 'λ',
  omega: 'ω',
};

const LOWER_NAMES = Object.keys(GREEK_LETTERS);
const ANY_NAME = LOWER_NAMES.flatMap(name => [
  name,
  name.charAt(0).toUpperCase() + name.slice(1),
]).join('|');
const LETTERS = Object.values(GREEK_LETTERS).join('');
const WORD_ENDING = `$|[^A-Za-z]|[A-Z]|${ANY_NAME}|[a-z](?![A-Za-z])`;
const ATTACHED = new RegExp(`(?<=[A-Za-z0-9-])(${ANY_NAME})(?=${WORD_ENDING})`, 'g');
const LEADING = new RegExp(
  `(?<![A-Za-z0-9])(?:(${ANY_NAME})(?=\\d|${ANY_NAME}|[${LETTERS}])|(${LOWER_NAMES.join('|')})(?=-))`,
  'g'
);

const letterFor = (name: string) => GREEK_LETTERS[name.toLowerCase()] ?? name;

export const withGreekLetters = (text: string): string =>
  text.replace(ATTACHED, letterFor).replace(LEADING, letterFor);
