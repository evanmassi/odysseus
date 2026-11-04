const FALLBACK_USERNAME_BASE = 'user';
const ACCENT_MARKS = /\p{M}/gu;
const DISALLOWED_USERNAME_CHARACTERS = /[^a-z0-9]/g;

const LETTERS_WITHOUT_ACCENT_FORM: Record<string, string> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ı: 'i',
};
const LETTERS_WITHOUT_ACCENT_FORM_PATTERN = new RegExp(
  `[${Object.keys(LETTERS_WITHOUT_ACCENT_FORM).join('')}]`,
  'g'
);

function usernamePart(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(ACCENT_MARKS, '')
    .replace(LETTERS_WITHOUT_ACCENT_FORM_PATTERN, letter => LETTERS_WITHOUT_ACCENT_FORM[letter])
    .replace(DISALLOWED_USERNAME_CHARACTERS, '');
}

export function usernameBase(firstName: string, lastName: string): string {
  const parts = [usernamePart(firstName), usernamePart(lastName)].filter(part => part.length > 0);
  return parts.length > 0 ? parts.join('.') : FALLBACK_USERNAME_BASE;
}
