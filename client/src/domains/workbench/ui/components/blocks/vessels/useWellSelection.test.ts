import { act, renderHook } from '@testing-library/react';

import { sheetOf, vesselTabs } from '../../../../utils/vessels/vesselTabs';

import { useWellSelection } from './useWellSelection';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

const block = {
  plates: [{ id: 'p', vessel: '96', name: '' }],
  sets: [],
  lines: [],
  cells: {},
  series: {},
  counts: {},
  amountNames: {},
} as unknown as VesselMapBlock;
const sheet = sheetOf(block, vesselTabs(block)[0]);
const spot = (key: string) => sheet.spots.find(candidate => candidate.key === `p:${key}`)!;
const plain = { isExtending: false, isToggling: false };
const ctrl = { isExtending: false, isToggling: true };
const shift = { isExtending: true, isToggling: false };
const sameKeys = (keys: Iterable<string>) => new Set([...keys].map(key => `p:${key}`));

function renderSelection() {
  return renderHook(() =>
    useWellSelection(
      sheet,
      'p',
      keys => keys,
      () => undefined
    )
  );
}

describe('selecting wells', () => {
  it('adds a dragged block to the selection with Ctrl', () => {
    const { result } = renderSelection();
    act(() => result.current.press(spot('A1'), plain));
    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });
    act(() => result.current.press(spot('C1'), ctrl));
    act(() => result.current.dragOver(spot('C2')));
    expect(result.current.keys).toEqual(sameKeys(['A1', 'C1', 'C2']));
  });

  it('adds and removes whole rows with Ctrl on the row letter', () => {
    const { result } = renderSelection();
    act(() => result.current.selectRow(0, plain));
    act(() => result.current.selectRow(2, ctrl));
    expect(result.current.keys.size).toBe(24);
    act(() => result.current.selectRow(2, ctrl));
    expect(result.current.keys.size).toBe(12);
  });

  it('extends from the last row letter with Shift', () => {
    const { result } = renderSelection();
    act(() => result.current.selectRow(1, plain));
    act(() => result.current.selectRow(3, shift));
    expect(result.current.keys.size).toBe(36);
  });
});
