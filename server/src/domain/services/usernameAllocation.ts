import { nanoid } from 'nanoid';

const HIGHEST_NUMBERED_SUFFIX = 99;
const NUMBERED_SUFFIX = /\.\d+$/;

export function usernameBaseOf(username: string): string {
  return username.replace(NUMBERED_SUFFIX, '');
}

export async function allocateUsername(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  if (!(await isTaken(base))) {
    return base;
  }

  for (let suffix = 2; suffix <= HIGHEST_NUMBERED_SUFFIX; suffix++) {
    const candidate = `${base}.${suffix}`;
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  return `${base}.${nanoid(6)}`;
}
