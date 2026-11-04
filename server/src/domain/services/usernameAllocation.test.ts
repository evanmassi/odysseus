import { allocateUsername, usernameBaseOf } from './usernameAllocation';

const takenAmong =
  (taken: string[]) =>
  async (candidate: string): Promise<boolean> =>
    taken.includes(candidate);

describe('allocateUsername', () => {
  it('returns the base when nobody holds it', async () => {
    expect(await allocateUsername('evan.massi', takenAmong([]))).toBe('evan.massi');
  });

  it('numbers from 2 when the base is taken', async () => {
    expect(await allocateUsername('evan.massi', takenAmong(['evan.massi']))).toBe('evan.massi.2');
  });

  it('skips numbered candidates that are also taken', async () => {
    const taken = ['evan.massi', 'evan.massi.2', 'evan.massi.3'];
    expect(await allocateUsername('evan.massi', takenAmong(taken))).toBe('evan.massi.4');
  });

  it('falls back to a random suffix once every numbered candidate is taken', async () => {
    const taken = ['evan.massi', ...Array.from({ length: 98 }, (_, i) => `evan.massi.${i + 2}`)];
    const allocated = await allocateUsername('evan.massi', takenAmong(taken));

    expect(allocated).toMatch(/^evan\.massi\.[A-Za-z0-9_-]{6}$/);
    expect(taken).not.toContain(allocated);
  });
});

describe('usernameBaseOf', () => {
  it('drops a numbered suffix', () => {
    expect(usernameBaseOf('evan.massi.2')).toBe('evan.massi');
  });

  it('leaves an unnumbered username alone', () => {
    expect(usernameBaseOf('evan.massi')).toBe('evan.massi');
  });

  it('keeps digits that belong to the name itself', () => {
    expect(usernameBaseOf('evan.massi2')).toBe('evan.massi2');
  });
});
