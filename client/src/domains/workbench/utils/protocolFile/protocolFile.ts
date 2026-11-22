import {
  PROTOCOL_FILE_FORMAT,
  PROTOCOL_FILE_VERSION,
  protocolFileInputSchema,
  type MovedPrepValue,
  type Protocol,
  type ProtocolFile,
} from '@odysseus/shared-schemas';

import { withMovedPrepValues } from '../dilutions/movedPrepValues';
import { withSettledWords } from '../terms/termUpgrade';

export class ProtocolFileError extends Error {}

const NOT_A_PROTOCOL = "This isn't a workbench protocol file.";

const hasProtocolFormat = (data: unknown) =>
  typeof data === 'object' &&
  data !== null &&
  'format' in data &&
  data.format === PROTOCOL_FILE_FORMAT;

export function readProtocolFile(text: string): Protocol {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProtocolFileError(NOT_A_PROTOCOL);
  }
  if (!hasProtocolFormat(data)) throw new ProtocolFileError(NOT_A_PROTOCOL);
  const { protocol, movedPrepValues } = parsedFile(data);
  return withSettledWords(withMovedPrepValues(protocol, movedPrepValues));
}

function parsedFile(data: unknown): { protocol: Protocol; movedPrepValues: MovedPrepValue[] } {
  try {
    const result = protocolFileInputSchema.safeParse(data);
    if (result.success) return result.data;
    const issue = result.error.issues[0];
    throw new ProtocolFileError(
      `This protocol file is damaged at ${issue.path.join('.')}: ${issue.message}`
    );
  } catch (error) {
    if (error instanceof ProtocolFileError) throw error;
    throw new ProtocolFileError(`This protocol file is damaged: ${(error as Error).message}`);
  }
}

export function writeProtocolFile(protocol: Protocol): string {
  const file: ProtocolFile = {
    format: PROTOCOL_FILE_FORMAT,
    version: PROTOCOL_FILE_VERSION,
    savedAt: new Date().toISOString(),
    protocol,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}
