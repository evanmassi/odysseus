import {
  normalizeMaterialKey,
  normalizePlateMap,
  plateValueKey,
  type MaterialLink,
  type PlateMap,
  type Protocol,
} from '@odysseus/shared-schemas';

import { heldNames, renameValue, type HeldName } from '../plateMap/wellEdits';

import { SHORT_NAME_FIELD } from './materialCatalog';
import { displayNameOf, nameWithoutNotes, shortNameOf } from './materialLookup';
import {
  linkedTo,
  linkTargetName,
  mentionPattern,
  mentionsFinder,
  namedTarget,
} from './plateLinks';

const NOTES_START = '(';

const bareKey = (name: string) => normalizeMaterialKey(nameWithoutNotes(name));

const isSameBareName = (a: string, b: string): boolean => bareKey(a) === bareKey(b);

export function withLeadingName(text: string, name: string): string {
  const notesAt = text.indexOf(NOTES_START);
  return notesAt < 0 ? name : `${name} ${text.slice(notesAt)}`;
}

function withMentionReplaced(text: string, from: string, to: string): string | undefined {
  const pattern = mentionPattern(from);
  return pattern.test(text)
    ? text.replace(pattern, (_, lead: string) => `${lead}${to}`)
    : undefined;
}

function followedText(text: string, from: string, to: string): string {
  if (normalizeMaterialKey(text) === normalizeMaterialKey(from)) return to;
  const whole = withMentionReplaced(text, from, to);
  if (whole !== undefined) return whole;
  if (isSameBareName(from, to)) return text;
  return withMentionReplaced(text, nameWithoutNotes(from), nameWithoutNotes(to)) ?? text;
}

const isSameLinks = (a: readonly MaterialLink[], b: readonly MaterialLink[]) =>
  a.length === b.length &&
  a.every(
    (link, index) =>
      link.materialId === b[index].materialId &&
      link.donorId === b[index].donorId &&
      link.name === b[index].name &&
      link.shortName === b[index].shortName
  );

type Linked = { links?: MaterialLink[] };

function keptLinked(
  draft: Protocol,
  mentionsOf: (text: string) => MaterialLink[],
  holder: Linked,
  text: string
): string {
  let shown = text;
  for (const link of holder.links ?? []) {
    const target = linkedTo(draft, link);
    if (!target) continue;
    const name = linkTargetName(target);
    if (link.name !== name) shown = followedText(shown, link.name, name);
    const shortName = target.donor ? '' : shortNameOf(target.material);
    if (link.shortName && link.shortName !== shortName)
      shown = followedText(shown, link.shortName, shortName || displayNameOf(target.material));
  }
  const links = mentionsOf(shown);
  if (isSameLinks(holder.links ?? [], links)) return shown;
  if (links.length) holder.links = links;
  else delete holder.links;
  return shown;
}

export function linkPlateNames(draft: Protocol): void {
  const mentionsOf = mentionsFinder(draft);
  for (const plateMap of draft.plateMaps) {
    let isRenamed = false;
    for (const line of plateMap.lines) {
      line.name = keptLinked(draft, mentionsOf, line, line.name);
      for (const value of line.values) {
        const text = keptLinked(draft, mentionsOf, value, value.text);
        if (text === value.text) continue;
        value.text = text;
        isRenamed = true;
      }
    }
    if (isRenamed) normalizePlateMap(plateMap);
  }
}

type NameChange = 'whole' | 'short' | 'leading';

function isNoteAdded(from: string, to: string): boolean {
  const [was, now] = [from.trim(), to.trim()];
  return (
    now.toLowerCase().startsWith(was.toLowerCase()) &&
    now.slice(was.length).trim().startsWith(NOTES_START)
  );
}

export function nameChangeOf(
  held: { text: string; links?: readonly MaterialLink[] },
  to: string
): NameChange | undefined {
  const [from, wanted] = [normalizeMaterialKey(held.text), normalizeMaterialKey(to)];
  if (!bareKey(to) || from === wanted) return undefined;
  const links = held.links ?? [];
  if (links.some(link => normalizeMaterialKey(link.name) === from))
    return isNoteAdded(held.text, to) ? undefined : 'whole';
  const isShortName = links.some(
    link => link.shortName && normalizeMaterialKey(link.shortName) === from
  );
  if (isSameBareName(held.text, to)) return undefined;
  return isShortName ? 'short' : 'leading';
}

function renameNamed(draft: Protocol, started: Linked & { text: string }, to: string) {
  const change = nameChangeOf(started, to);
  const target = change && namedTarget(draft, started, started.text);
  if (!change || !target) return;
  const named = namedTarget(draft, { links: mentionsFinder(draft)(to) }, to);
  if (named && (named.material !== target.material || named.donor !== target.donor)) return;
  const renamed = target.donor ?? target.material;
  if (change === 'whole') renamed.name = to.trim();
  else if (change === 'short') target.material.values[SHORT_NAME_FIELD] = nameWithoutNotes(to);
  else renamed.name = withLeadingName(renamed.name, nameWithoutNotes(to));
}

export function renamePlateValue(
  draft: Protocol,
  plateMapId: string,
  valueId: string,
  text: string
): void {
  const plateMap = draft.plateMaps.find(candidate => candidate.id === plateMapId);
  const value = plateMap?.lines.flatMap(line => line.values).find(item => item.id === valueId);
  if (!plateMap || !value) return;
  const { links, text: from } = value;
  renameValue(plateMap, valueId, text);
  normalizePlateMap(plateMap);
  renameNamed(draft, { links, text: from }, text);
}

const isStillPainted = (plateMap: PlateMap, lineId: string, start: HeldName) =>
  plateMap.lines
    .find(line => line.id === lineId)
    ?.values.some(
      value =>
        value.id === start.valueId &&
        plateValueKey(value.text) === plateValueKey(start.text) &&
        Object.values(plateMap.samples).some(lines => lines[lineId]?.valueId === value.id)
    ) ?? false;

export function followWellEdit(
  draft: Protocol,
  plateMapId: string,
  started: ReadonlyMap<string, HeldName>,
  keys: readonly string[]
): void {
  const plateMap = draft.plateMaps.find(candidate => candidate.id === plateMapId);
  if (!plateMap) return;
  const now = heldNames(plateMap, keys);
  for (const [lineId, start] of started) {
    const current = now.get(lineId);
    if (current && !isStillPainted(plateMap, lineId, start))
      renameNamed(draft, start, current.text);
  }
}
