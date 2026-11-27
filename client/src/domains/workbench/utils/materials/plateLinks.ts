import { findDonor, donorsIn, type KnownDonorMatch } from './materialDonors';
import { findMaterial, listedMaterials, nameWithoutNotes, shortNameOf } from './materialLookup';

import type { MaterialItem, MaterialLink, Protocol } from '@odysseus/shared-schemas';

interface LinkTarget {
  material: MaterialItem;
  donor: KnownDonorMatch['donor'] | undefined;
}

const escaped = (name: string) => name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const mentionPattern = (name: string): RegExp =>
  new RegExp(`(^|[^a-z0-9])(${escaped(name)})(?=$|[^a-z0-9])`, 'i');

export const linkTargetName = ({ material, donor }: LinkTarget): string =>
  (donor ?? material).name.trim();

export function mentionsFinder(
  protocol: Pick<Protocol, 'materials'>
): (text: string) => MaterialLink[] {
  const named = [
    ...listedMaterials(protocol).map(material => {
      const shortName = shortNameOf(material);
      return {
        link: {
          materialId: material.id,
          name: material.name.trim(),
          ...(shortName && { shortName }),
        },
        names: [material.name, nameWithoutNotes(material.name), shortName],
      };
    }),
    ...donorsIn(protocol).map(({ material, donor }) => ({
      link: { materialId: material.id, donorId: donor.id, name: donor.name.trim() },
      names: [donor.name],
    })),
  ].map(({ link, names }) => ({
    link,
    patterns: names.filter(name => name.trim()).map(name => mentionPattern(name)),
  }));
  return text =>
    named
      .filter(({ patterns }) => patterns.some(pattern => pattern.test(text)))
      .map(({ link }) => link);
}

export function linkedTo(
  protocol: Pick<Protocol, 'materials'>,
  link: MaterialLink
): LinkTarget | undefined {
  const material = listedMaterials(protocol).find(item => item.id === link.materialId);
  if (!material || !link.donorId) return material && { material, donor: undefined };
  const donor = material.donors?.rows.find(row => row.id === link.donorId);
  return donor && { material, donor };
}

export function namedTarget(
  protocol: Pick<Protocol, 'materials'>,
  holder: { links?: readonly MaterialLink[] } | undefined,
  text: string
): LinkTarget | undefined {
  const targets = (holder?.links ?? []).flatMap(link => linkedTo(protocol, link) ?? []);
  const materials = targets.filter(target => !target.donor).map(target => target.material);
  const material = findMaterial(materials, text);
  if (material) return { material, donor: undefined };
  const donors = targets.flatMap(({ material: owner, donor }) =>
    donor ? [{ material: owner, donor }] : []
  );
  return findDonor(donors, text);
}
