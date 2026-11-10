const TYPED_WORD_BREAK = /\s+/;
const TEXT_WORD_BREAK = /[\s-]+/;

export function matchesWordStarts(text: string, typed: string): boolean {
  const words = typed.toLowerCase().split(TYPED_WORD_BREAK).filter(Boolean);
  const parts = text.toLowerCase().split(TEXT_WORD_BREAK);
  return words.every(word => parts.some(part => part.startsWith(word)));
}
