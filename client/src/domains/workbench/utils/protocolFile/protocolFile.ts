import {
  normalizePlateMap,
  PROTOCOL_FILE_FORMAT,
  PROTOCOL_FILE_VERSION,
  protocolFileSchema,
  type Protocol,
  type ProtocolFile,
} from '@odysseus/shared-schemas';

export class ProtocolFileError extends Error {}

const NOT_A_PROTOCOL = "This isn't a workbench protocol file.";
const OTHER_VERSION =
  "This protocol was saved by a different version of the workbench and can't be opened.";

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null;

export function readProtocolFile(text: string): Protocol {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProtocolFileError(NOT_A_PROTOCOL);
  }
  if (!isRecord(data) || data['format'] !== PROTOCOL_FILE_FORMAT) {
    throw new ProtocolFileError(NOT_A_PROTOCOL);
  }
  if (data['version'] !== PROTOCOL_FILE_VERSION) throw new ProtocolFileError(OTHER_VERSION);
  const result = protocolFileSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ProtocolFileError(
      `This protocol file is damaged at ${issue.path.join('.')}: ${issue.message}`
    );
  }
  const { protocol } = result.data;
  for (const plateMap of protocol.plateMaps) normalizePlateMap(plateMap);
  return protocol;
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
