import { matchesWordStarts } from './nameMatching';

describe('matchesWordStarts', () => {
  it('matches when every typed word starts a word in the text, in any order', () => {
    expect(matchesWordStarts('Drug X stock to take', 'sto dru')).toBe(true);
    expect(matchesWordStarts('Anti-CD3 volume per well', 'cd3 vol')).toBe(true);
    expect(matchesWordStarts('Wash volume', 'ash')).toBe(false);
  });

  it('matches everything when nothing is typed', () => {
    expect(matchesWordStarts('Spin time', '  ')).toBe(true);
  });
});
