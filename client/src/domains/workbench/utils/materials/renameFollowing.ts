import { normalizePlateMap, type Protocol, normalizeMaterialKey } from '@odysseus/shared-schemas';

import { heldNames, renameValue, type HeldName } from '../plateMap/wellEdits';

import { findDonor, donorsIn } from './materialDonors';
import { findMaterial, findNamed, listedMaterials, nameWithoutNotes } from './materialLookup';

const NOTES_START = '(';

const bareKey = (name: string) => normalizeMaterialKey(nameWithoutNotes(name));

export const isSameBareName = (a: string, b: string): boolean => bareKey(a) === bareKey(b);

export function withLeadingName(text: string, name: string): string {
  const notesAt = text.indexOf(NOTES_START);
  return notesAt < 0 ? name : `${name} ${text.slice(notesAt)}`;
}

const isNameOnAnyWell = (protocol: Pick<Protocol, 'plateMaps'>, name: string): boolean =>
  protocol.plateMaps.some(plateMap => {
    const heldIds = new Set(
      Object.values(plateMap.samples).flatMap(lines =>
        Object.values(lines).map(entry => entry.valueId)
      )
    );
    return plateMap.lines.some(line =>
      line.values.some(value => heldIds.has(value.id) && isSameBareName(value.text, name))
    );
  });

const isNameListed = (protocol: Pick<Protocol, 'materials'>, name: string): boolean =>
  findMaterial(listedMaterials(protocol), name) !== undefined ||
  findDonor(donorsIn(protocol), name) !== undefined;

export function materialFollowsPlateRename(draft: Protocol, from: string, to: string): void {
  const toName = nameWithoutNotes(to);
  if (!bareKey(to) || isSameBareName(from, to) || isNameOnAnyWell(draft, from)) return;
  if (isNameListed(draft, toName)) return;
  const material = findNamed(listedMaterials(draft), from, candidate => candidate.name);
  if (material) material.name = withLeadingName(material.name, toName);
  const match = findDonor(donorsIn(draft), from);
  if (match) match.donor.name = withLeadingName(match.donor.name, toName);
}

const isWholeNameListed = (protocol: Pick<Protocol, 'materials'>, name: string): boolean => {
  const key = normalizeMaterialKey(name);
  return (
    listedMaterials(protocol).some(item => normalizeMaterialKey(item.name) === key) ||
    donorsIn(protocol).some(({ donor }) => normalizeMaterialKey(donor.name) === key)
  );
};

export function plateFollowsListRename(draft: Protocol, from: string, to: string): void {
  if (!bareKey(to) || normalizeMaterialKey(from) === normalizeMaterialKey(to)) return;
  const followsWhole = !isWholeNameListed(draft, from);
  const followsBare = !isSameBareName(from, to) && !isNameListed(draft, from);
  const followed = (text: string) => {
    if (followsWhole && normalizeMaterialKey(text) === normalizeMaterialKey(from)) return to.trim();
    if (followsBare && isSameBareName(text, from))
      return withLeadingName(text, nameWithoutNotes(to));
    return undefined;
  };
  for (const plateMap of draft.plateMaps) {
    let isRenamed = false;
    for (const line of plateMap.lines) {
      line.name = followed(line.name) ?? line.name;
      for (const value of line.values) {
        const text = followed(value.text);
        if (text === undefined) continue;
        value.text = text;
        isRenamed = true;
      }
    }
    if (isRenamed) normalizePlateMap(plateMap);
  }
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
  const from = value.text;
  renameValue(plateMap, valueId, text);
  normalizePlateMap(plateMap);
  materialFollowsPlateRename(draft, from, text);
}

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
    if (current) materialFollowsPlateRename(draft, start.text, current.text);
  }
}
