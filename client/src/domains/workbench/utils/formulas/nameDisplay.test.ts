import { calculateBoard } from './boardCalculation';
import { readsNamesAlike } from './nameDisplay';

const board = (topDose: string, other: string) =>
  calculateBoard([
    { kind: 'value', id: 'top', name: 'Top dose', value: topDose, unit: 'µM' },
    { kind: 'value', id: 'other', name: 'Other volume', value: other, unit: 'µL' },
  ]);

describe('names read alike', () => {
  it('ignores board changes to names that were not asked about', () => {
    expect(readsNamesAlike(['Top dose'], board('10', '50'), board('10', '80'))).toBe(true);
  });

  it('notices when a name asked about shows differently', () => {
    expect(readsNamesAlike(['Top dose'], board('10', '50'), board('20', '50'))).toBe(false);
  });
});
