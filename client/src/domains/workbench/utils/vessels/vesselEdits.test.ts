import {
  applyVessels,
  copyPlateIntoCard,
  duplicateOfTab,
  hasAnyVessel,
  vesselCountOf,
  wellsLostTo,
  withoutPlate,
  withVesselCount,
} from './vesselEdits';
import { vesselTabs } from './vesselTabs';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

const vesselMap = (): VesselMapBlock =>
  ({
    id: 'map',
    x: 0,
    y: 0,
    w: 6,
    h: 10,
    plates: [{ id: 'p', vessel: '96', name: 'Day 1' }],
    sets: [{ id: 's', vessel: 'T75', count: 3 }],
    activeTab: 1,
    lines: [{ id: 'l', name: '', role: 'auto', values: [{ id: 'v', text: 'Drug' }] }],
    cells: {
      'p:H12': { l: { valueId: 'v' } },
      'p:A1': { l: { valueId: 'v' } },
      's#2:1': { l: { valueId: 'v' } },
    },
    series: {},
    counts: { v: '9' },
    amountNames: {},
  }) as unknown as VesselMapBlock;

describe('vessel edits', () => {
  it('add and remove plates and loose vessels by count', () => {
    const block = vesselMap();
    const more = withVesselCount(block, '96', 2);
    expect(vesselCountOf(more, '96')).toBe(2);
    expect(withVesselCount(block, 'T75', 1).sets).toEqual([{ id: 's', vessel: 'T75', count: 1 }]);
    expect(withVesselCount(block, 'T75', 0).sets).toEqual([]);
    expect(withVesselCount(block, 'facs', 2).sets).toHaveLength(2);
    expect(hasAnyVessel(withoutPlate(withVesselCount(block, 'T75', 0), 'p'))).toBe(false);
  });

  it('count the filled wells a change would drop', () => {
    const block = vesselMap();
    expect(wellsLostTo(block, withVesselCount(block, 'T75', 2))).toBe(1);
    expect(wellsLostTo(block, withoutPlate(block, 'p'))).toBe(2);
  });

  it('drop wells that no longer fit and size the card to a new only plate', () => {
    const block = vesselMap();
    const next = withVesselCount(withVesselCount(block, '96', 0), '6', 1);
    applyVessels(block, next);
    expect(Object.keys(block.cells)).toEqual(['s#2:1']);
    expect(block.w).toBe(4);
    expect(block.activeTab).toBe(1);
  });

  it('copy a plate tab into a new card beside this one with fresh well keys', () => {
    const block = vesselMap();
    const copy = duplicateOfTab(block, vesselTabs(block)[0]);
    const [plate] = copy.plates;
    expect(plate).toMatchObject({ vessel: '96', name: 'Day 1 copy' });
    expect(plate.id).not.toBe('p');
    expect(copy.sets).toEqual([]);
    expect(Object.keys(copy.cells).sort()).toEqual([`${plate.id}:A1`, `${plate.id}:H12`]);
    expect(copy.counts).toEqual({});
    expect(copy).toMatchObject({ x: 6, y: 0, activeTab: 0 });
  });

  it('copy a plate into a new tab of the same card with series of its own', () => {
    const block = vesselMap();
    block.cells['p:B1'] = { l: { valueId: 'v', seriesId: 'ser', seriesStep: 0 } };
    block.series = { ser: { start: '10', unit: 'µM', fold: '3', direction: 'right' } };
    copyPlateIntoCard(block, block.plates[0]);
    const [original, copy] = block.plates;
    expect(original.id).toBe('p');
    expect(copy).toMatchObject({ vessel: '96', name: 'Day 1 copy' });
    expect(block.activeTab).toBe(1);
    expect(block.cells[`${copy.id}:A1`]).toEqual({ l: { valueId: 'v' } });
    const copiedSeriesId = block.cells[`${copy.id}:B1`]['l'].seriesId;
    expect(copiedSeriesId).not.toBe('ser');
    expect(block.series[copiedSeriesId ?? '']).toEqual(block.series['ser']);
    expect(block.cells['s#2:1']).toEqual({ l: { valueId: 'v' } });
  });
});
