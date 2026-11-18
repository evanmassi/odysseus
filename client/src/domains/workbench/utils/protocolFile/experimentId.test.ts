import { blankProtocol } from './blankProtocol';
import { experimentId } from './experimentId';

import type { Protocol } from '@odysseus/shared-schemas';

const protocolWith = (fields: Partial<Protocol>): Protocol => ({ ...blankProtocol(), ...fields });

describe('experimentId', () => {
  it('reads date, title, description and run', () => {
    const protocol = protocolWith({
      title: 'cell killing',
      descriptor: 'donor 3',
      runNumber: '2',
      runOn: { from: '2026-11-17', to: '' },
    });
    expect(experimentId(protocol)).toBe('20261117_CellKilling_Donor3_R2');
  });

  it('leaves the date out until the assay has one, so an undated plan keeps its id', () => {
    const protocol = protocolWith({ title: 'ELISA', runNumber: 'R1' });
    expect(experimentId(protocol)).toBe('ELISA_R1');
  });
});
