import type { Protocol } from '@odysseus/shared-schemas';

export const localToday = (): string => new Date().toLocaleDateString('en-CA');

const idPart = (text: string) =>
  text
    .trim()
    .replace(/[\\/:*?"<>|_.]+/g, '-')
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

export function experimentId(protocol: Protocol): string {
  const run = idPart(protocol.runNumber).replace(/^R/i, '');
  return [
    (protocol.runOn.from || localToday()).replace(/-/g, ''),
    idPart(protocol.title) || 'Untitled',
    idPart(protocol.descriptor),
    run && `R${run}`,
  ]
    .filter(Boolean)
    .join('_');
}
