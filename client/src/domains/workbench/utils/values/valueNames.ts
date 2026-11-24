import type { Protocol, ValuesCard } from '@odysseus/shared-schemas';

export const lowerLead = (label: string): string =>
  /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;

export const upperLead = (label: string): string =>
  /^[a-z](?![A-Z])/.test(label) ? label[0].toUpperCase() + label.slice(1) : label;

export const joinValueName = (owner: string, label: string): string =>
  owner ? `${owner} ${lowerLead(label.trim())}` : label;

export const GENERAL = '';
export const ASSAY_SETUP_TITLE = 'Assay setup';

export function assaySetupTitleOf(cards: Protocol['cards']): string {
  const title = cards
    .find((card): card is ValuesCard => card.type === 'values')
    ?.assaySetupTitle?.trim();
  return title ? title : ASSAY_SETUP_TITLE;
}

export const columnKey = (label: string): string => label.trim().toLowerCase().replace(/\s+/g, ' ');
