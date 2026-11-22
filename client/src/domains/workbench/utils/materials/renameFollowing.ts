import {
  normalizePlateMap,
  type Protocol,
  type PlateMapCard,
  normalizeMaterialKey,
} from '@odysseus/shared-schemas';

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

const plateMaps = (protocol: Pick<Protocol, 'blocks'>) =>
  protocol.blocks.filter((card): card is PlateMapCard => card.type === 'plate');

const isNameOnAnyWell = (protocol: Pick<Protocol, 'blocks'>, name: string): boolean =>
  plateMaps(protocol).some(plateMap => {
    const heldIds = new Set(
      Object.values(plateMap.cells).flatMap(lines =>
        Object.values(lines).map(entry => entry.valueId)
      )
    );
    return plateMap.lines.some(line =>
      line.values.some(value => heldIds.has(value.id) && isSameBareName(value.text, name))
    );
  });

const isNameListed = (protocol: Pick<Protocol, 'blocks'>, name: string): boolean =>
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

export function plateFollowsListRename(draft: Protocol, from: string, to: string): void {
  if (!isNameListed(draft, from)) renamePlateValues(draft, from, to);
}

function renamePlateValues(draft: Protocol, from: string, to: string): void {
  const toName = nameWithoutNotes(to);
  if (!bareKey(to) || isSameBareName(from, to)) return;
  for (const plateMap of plateMaps(draft)) {
    const values = plateMap.lines.flatMap(line => line.values);
    const renamed = values.filter(value => isSameBareName(value.text, from));
    for (const value of renamed) value.text = withLeadingName(value.text, toName);
    if (renamed.length) normalizePlateMap(plateMap);
  }
}

export function renamePlateValue(
  draft: Protocol,
  cardId: string,
  valueId: string,
  text: string
): void {
  const plateMap = plateMaps(draft).find(card => card.id === cardId);
  const value = plateMap?.lines.flatMap(line => line.values).find(item => item.id === valueId);
  if (!plateMap || !value) return;
  const from = value.text;
  renameValue(plateMap, valueId, text);
  normalizePlateMap(plateMap);
  materialFollowsPlateRename(draft, from, text);
}

export function followWellEdit(
  draft: Protocol,
  cardId: string,
  started: ReadonlyMap<string, HeldName>,
  keys: readonly string[]
): void {
  const plateMap = plateMaps(draft).find(card => card.id === cardId);
  if (!plateMap) return;
  const now = heldNames(plateMap, keys);
  for (const [lineId, start] of started) {
    const current = now.get(lineId);
    if (current) materialFollowsPlateRename(draft, start.text, current.text);
  }
}
