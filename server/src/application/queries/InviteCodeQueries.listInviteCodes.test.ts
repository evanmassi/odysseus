/**
 * List-Invite-Codes Query Tests
 *
 * Confirms the lab id is threaded through and entities are mapped to data.
 */

import type { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';

import { ListInviteCodesQueryHandler } from './InviteCodeQueries';

describe('ListInviteCodesQueryHandler', () => {
  it('returns the lab invite codes as data objects', async () => {
    const codes = [
      { toData: () => ({ id: 'c1', code: 'ABC' }) },
      { toData: () => ({ id: 'c2', code: 'DEF' }) },
    ];
    const findByLabId = jest.fn().mockResolvedValue(codes);
    const handler = new ListInviteCodesQueryHandler({
      findByLabId,
    } as unknown as InviteCodeRepository);

    const result = await handler.handle({ labId: 'lab_1' });

    expect(findByLabId).toHaveBeenCalledWith('lab_1');
    expect(result).toEqual([
      { id: 'c1', code: 'ABC' },
      { id: 'c2', code: 'DEF' },
    ]);
  });
});
