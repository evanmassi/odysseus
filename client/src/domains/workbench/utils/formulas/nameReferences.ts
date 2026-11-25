export interface NameReference {
  name: string;
  id?: string;
}

export type ReferencePart =
  | { kind: 'text'; text: string }
  | ({ kind: 'reference' } & NameReference);

export const REFERENCE_TOKEN = /\{[^{}]+\}/g;
const WHOLE_REFERENCE = /^\{([^{}]+)\}$/;
const ID_BREAK = '|';
const ID_ESCAPES: Readonly<Record<string, string>> = {
  '%': '%25',
  '|': '%7C',
  '{': '%7B',
  '}': '%7D',
};

const escapeId = (id: string) => id.replace(/[%|{}]/g, character => ID_ESCAPES[character]);

export function readReferenceBody(body: string): NameReference {
  const at = body.lastIndexOf(ID_BREAK);
  if (at < 0) return { name: body.trim() };
  return { name: body.slice(0, at).trim(), id: decodeURIComponent(body.slice(at + 1)) };
}

export const referenceBody = ({ name, id }: NameReference): string =>
  id === undefined ? name : `${name}${ID_BREAK}${escapeId(id)}`;

export const referenceText = (reference: NameReference): string => `{${referenceBody(reference)}}`;

export function readReference(text: string): NameReference {
  const whole = WHOLE_REFERENCE.exec(text.trim());
  return whole ? readReferenceBody(whole[1]) : { name: text.trim() };
}

export function referenceParts(text: string): ReferencePart[] {
  const parts: ReferencePart[] = [];
  let consumed = 0;
  for (const match of text.matchAll(REFERENCE_TOKEN)) {
    const start = match.index ?? 0;
    if (start > consumed) parts.push({ kind: 'text', text: text.slice(consumed, start) });
    parts.push({ kind: 'reference', ...readReferenceBody(match[0].slice(1, -1)) });
    consumed = start + match[0].length;
  }
  if (consumed < text.length) parts.push({ kind: 'text', text: text.slice(consumed) });
  return parts;
}

export const shownReferences = (text: string): string =>
  referenceParts(text)
    .map(part => (part.kind === 'text' ? part.text : part.name))
    .join('');
