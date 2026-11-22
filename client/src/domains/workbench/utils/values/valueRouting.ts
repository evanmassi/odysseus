import { withGreekLetters } from '@odysseus/shared-schemas';

import { nameKey } from '../formulas/boardCalculation';
import { displayValue } from '../formulas/quantities';
import { fieldLabel, fieldName, materialFields } from '../materials/materialCatalog';
import { materialText } from '../materials/materialItems';
import {
  displayNameOf,
  listedMaterials,
  nameWithoutNotes,
  shortNameOf,
} from '../materials/materialLookup';
import { isSpellingOf, settledValue } from '../terms/termLookup';

import { parseValueLine, settledLine, type ParsedValueLine } from './valueLines';
import { joinValueName, upperLead } from './valueNames';
import { valueUnitLabel } from './valueUnits';

import type {
  FieldDefinition,
  MaterialItem,
  Protocol,
  ValuesBlock,
} from '@odysseus/shared-schemas';

export type ValueDestination =
  | { kind: 'general' }
  | {
      kind: 'row';
      shownOwner: string;
      materialId: string | undefined;
      valueRowId: string | undefined;
      label: string;
    }
  | { kind: 'field'; materialId: string; field: FieldDefinition; current: string };

export interface RoutedValue {
  line: ParsedValueLine;
  destination: ValueDestination;
  fullName: string;
}

export interface ValueLineGuess {
  full: string;
  shown: string;
  place: string;
  isTaken: boolean;
}

interface ValueOwner {
  names: string[];
  title: string;
  shownTitle: string;
  material: MaterialItem | undefined;
  valueRowId: string | undefined;
}

const ROWLESS_GROUPS: ReadonlySet<string> = new Set(['equip', 'soft']);

const tidy = (text: string) => text.replace(/\s+/g, ' ').trim();

function valueOwners(protocol: Pick<Protocol, 'blocks'>, block: ValuesBlock): ValueOwner[] {
  const valueRowOf = (materialId: string) =>
    block.sections.find(valueRow => 'materialId' in valueRow && valueRow.materialId === materialId)
      ?.id;
  const materials = listedMaterials(protocol)
    .filter(material => !ROWLESS_GROUPS.has(material.group))
    .map(material => ({
      names: [material.name, nameWithoutNotes(material.name), shortNameOf(material)],
      title: material.name.trim(),
      shownTitle: displayNameOf(material),
      material,
      valueRowId: valueRowOf(material.id),
    }));
  const mixes = block.sections.flatMap(valueRow =>
    'mixName' in valueRow && valueRow.mixName.trim()
      ? [
          {
            names: [valueRow.mixName],
            title: valueRow.mixName.trim(),
            shownTitle: valueRow.mixName.trim(),
            material: undefined,
            valueRowId: valueRow.id,
          },
        ]
      : []
  );
  return [...materials, ...mixes];
}

const leadingName = (typed: string, owner: ValueOwner) =>
  owner.names
    .map(tidy)
    .filter(name => name && typed.toLowerCase().startsWith(`${name.toLowerCase()} `))
    .sort((a, b) => b.length - a.length)[0];

const isSameLabel = (a: string, b: string) => nameKey(a) === nameKey(b);

function ownField(material: MaterialItem, label: string) {
  return materialFields(material).find(
    definition =>
      definition.kind === 'number' &&
      (isSameLabel(definition.label, label) ||
        isSameLabel(fieldLabel(material, definition), label) ||
        isSpellingOf(label, definition.label))
  );
}

export function routeValueLine(
  protocol: Pick<Protocol, 'blocks'>,
  block: ValuesBlock,
  text: string
): RoutedValue | undefined {
  const line = parseValueLine(withGreekLetters(text));
  return line && routeParsedLine(protocol, block, line);
}

export function routeParsedLine(
  protocol: Pick<Protocol, 'blocks'>,
  block: ValuesBlock,
  line: ParsedValueLine
): RoutedValue {
  const typed = tidy(line.name);
  const best = valueOwners(protocol, block)
    .flatMap(owner => {
      const name = leadingName(typed, owner);
      return name ? [{ owner, name }] : [];
    })
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (!best) {
    const settled = settledLine(line);
    return { line: settled, destination: { kind: 'general' }, fullName: settled.name };
  }
  const { owner } = best;
  const rest = typed.slice(best.name.length).trim();
  const field = owner.material && ownField(owner.material, rest);
  if (owner.material && field) {
    const isShown = owner.material.shownFields.includes(field.key);
    return {
      line,
      destination: {
        kind: 'field',
        materialId: owner.material.id,
        field,
        current: isShown ? materialText(owner.material, field) : '',
      },
      fullName: fieldName(owner.material, field),
    };
  }
  const settled = settledValue(upperLead(rest), line.unit);
  const label = settled.label;
  return {
    line: { ...line, unit: settled.unit },
    destination: {
      kind: 'row',
      shownOwner: owner.shownTitle,
      materialId: owner.material?.id,
      valueRowId: owner.valueRowId,
      label,
    },
    fullName: joinValueName(owner.title, label),
  };
}

function shownAmount({ value, unit }: ParsedValueLine): string {
  const shown = value ? displayValue(value, unit) : 'to fill in';
  return unit && !value ? `${shown} (${valueUnitLabel(unit)})` : shown;
}

export function rowValueGuess(
  text: string,
  ownerName: string,
  takenNames: ReadonlySet<string>
): ValueLineGuess | undefined {
  const parsed = parseValueLine(text);
  if (!parsed) return undefined;
  const line = settledLine(parsed);
  const full = ownerName ? joinValueName(ownerName, line.name) : line.name;
  return { full, shown: shownAmount(line), place: '', isTaken: takenNames.has(nameKey(full)) };
}

export function routedValueGuess(
  { line, destination, fullName }: RoutedValue,
  takenNames: ReadonlySet<string>
): ValueLineGuess {
  const shown = shownAmount(line);
  if (destination.kind === 'field') {
    const replaces = destination.current && line.value ? `, replacing ${destination.current}` : '';
    return { full: fullName, shown, place: `in Materials${replaces}`, isTaken: false };
  }
  const place = destination.kind === 'row' ? `on the ${destination.shownOwner} row` : '';
  return { full: fullName, shown, place, isTaken: takenNames.has(nameKey(fullName)) };
}
