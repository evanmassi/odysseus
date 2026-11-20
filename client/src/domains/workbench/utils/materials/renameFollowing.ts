import {
  normalizeVesselMap,
  type Protocol,
  type VesselMapBlock,
  normalizeMaterialKey,
} from '@odysseus/shared-schemas';

import { heldNames, renameValue, type HeldName } from '../vessels/wellEdits';

import { findMaterial, findNamed, listedMaterials, nameWithoutNotes } from './materialLookup';
import { findSource, sourcesIn } from './materialSources';

const NOTES_START = '(';

const bareKey = (name: string) => normalizeMaterialKey(nameWithoutNotes(name));

export const isSameBareName = (a: string, b: string): boolean => bareKey(a) === bareKey(b);

export function withLeadingName(text: string, name: string): string {
  const notesAt = text.indexOf(NOTES_START);
  return notesAt < 0 ? name : `${name} ${text.slice(notesAt)}`;
}

const vesselMaps = (protocol: Pick<Protocol, 'blocks'>) =>
  protocol.blocks.filter((block): block is VesselMapBlock => block.type === 'plate');

const isNameOnAnyWell = (protocol: Pick<Protocol, 'blocks'>, name: string): boolean =>
  vesselMaps(protocol).some(plate => {
    const heldIds = new Set(
      Object.values(plate.cells).flatMap(lines => Object.values(lines).map(cell => cell.valueId))
    );
    return plate.lines.some(line =>
      line.values.some(value => heldIds.has(value.id) && isSameBareName(value.text, name))
    );
  });

const isNameListed = (protocol: Pick<Protocol, 'blocks'>, name: string): boolean =>
  findMaterial(listedMaterials(protocol), name) !== undefined ||
  findSource(sourcesIn(protocol), name) !== undefined;

export function materialFollowsPlateRename(draft: Protocol, from: string, to: string): void {
  const toName = nameWithoutNotes(to);
  if (!bareKey(to) || isSameBareName(from, to) || isNameOnAnyWell(draft, from)) return;
  if (isNameListed(draft, toName)) return;
  const material = findNamed(listedMaterials(draft), from, candidate => candidate.name);
  if (material) material.name = withLeadingName(material.name, toName);
  const match = findSource(sourcesIn(draft), from);
  if (match) match.source.name = withLeadingName(match.source.name, toName);
}

export function plateFollowsListRename(draft: Protocol, from: string, to: string): void {
  if (!isNameListed(draft, from)) renamePlateValues(draft, from, to);
}

function renamePlateValues(draft: Protocol, from: string, to: string): void {
  const toName = nameWithoutNotes(to);
  if (!bareKey(to) || isSameBareName(from, to)) return;
  for (const plate of vesselMaps(draft)) {
    const values = plate.lines.flatMap(line => line.values);
    const renamed = values.filter(value => isSameBareName(value.text, from));
    for (const value of renamed) value.text = withLeadingName(value.text, toName);
    if (renamed.length) normalizeVesselMap(plate);
  }
}

export function renamePlateValue(
  draft: Protocol,
  blockId: string,
  valueId: string,
  text: string
): void {
  const plate = vesselMaps(draft).find(block => block.id === blockId);
  const value = plate?.lines.flatMap(line => line.values).find(item => item.id === valueId);
  if (!plate || !value) return;
  const from = value.text;
  renameValue(plate, valueId, text);
  normalizeVesselMap(plate);
  materialFollowsPlateRename(draft, from, text);
}

export function followWellEdit(
  draft: Protocol,
  blockId: string,
  started: ReadonlyMap<string, HeldName>,
  keys: readonly string[]
): void {
  const plate = vesselMaps(draft).find(block => block.id === blockId);
  if (!plate) return;
  const now = heldNames(plate, keys);
  for (const [lineId, start] of started) {
    const current = now.get(lineId);
    if (current) materialFollowsPlateRename(draft, start.text, current.text);
  }
}
