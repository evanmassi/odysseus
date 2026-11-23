import {
  PROTOCOL_FILE_FORMAT,
  PROTOCOL_FILE_VERSION,
  protocolFileInputSchema,
  type MovedMarkerDilution,
  type MovedPrepValue,
  type Protocol,
  type ProtocolFile,
} from '@odysseus/shared-schemas';

import { withMovedPrepValues } from '../dilutions/movedPrepValues';
import { withMovedMarkerDilutions } from '../flowCytometry/movedMarkerDilutions';
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
  const { protocol, movedPrepValues, movedMarkerDilutions } = parsedFile(data);
  const moved = withMovedMarkerDilutions(
    withMovedPrepValues(protocol, movedPrepValues),
    movedMarkerDilutions
  );
  return withSettledWords(moved);
}

interface ParsedFile {
  protocol: Protocol;
  movedPrepValues: MovedPrepValue[];
  movedMarkerDilutions: MovedMarkerDilution[];
}

function parsedFile(data: unknown): ParsedFile {
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
