import { act, renderHook } from '@testing-library/react';

import { sheetOf, plateMapTabs } from '../../../../utils/plateMap/plateMapTabs';

import { useWellSelection } from './useWellSelection';

import type { PlateMapBlock } from '@odysseus/shared-schemas';

const block = {
  plates: [{ id: 'p', vessel: '96', name: '' }],
  sets: [],
  lines: [],
  cells: {},
  series: {},
  counts: {},
  amountNames: {},
  side: 'assay',
  stain: {},
  stainedIn: {},
} as unknown as PlateMapBlock;
const sheet = sheetOf(block, plateMapTabs(block)[0]);
const position = (key: string) => sheet.positions.find(candidate => candidate.key === `p:${key}`)!;
const plain = { isExtending: false, isToggling: false };
const ctrl = { isExtending: false, isToggling: true };
const shift = { isExtending: true, isToggling: false };
const shiftCtrl = { isExtending: true, isToggling: true };
const sameKeys = (keys: Iterable<string>) => new Set([...keys].map(key => `p:${key}`));
const releasePointer = () =>
  act(() => {
    window.dispatchEvent(new Event('pointerup'));
  });

function renderSelection() {
  return renderHook(() => useWellSelection(sheet, 'p', () => undefined));
}

describe('selecting wells', () => {
  afterEach(() => vi.useRealTimers());

  it('picks one well on a click and a block on a drag', () => {
    const { result } = renderSelection();
    act(() => result.current.press(position('A1'), plain));
    expect(result.current.keys).toEqual(sameKeys(['A1']));
    act(() => result.current.dragOver(position('B2')));
    expect(result.current.keys).toEqual(sameKeys(['A1', 'A2', 'B1', 'B2']));
  });

  it('adds a dragged block to the selection with Ctrl', () => {
    const { result } = renderSelection();
    act(() => result.current.press(position('A1'), plain));
    releasePointer();
    act(() => result.current.press(position('C1'), ctrl));
    act(() => result.current.dragOver(position('C2')));
    expect(result.current.keys).toEqual(sameKeys(['A1', 'C1', 'C2']));
  });

  it('keeps a selection on a click inside it until the double-click wait is over', () => {
    vi.useFakeTimers();
    const { result } = renderSelection();
    act(() => result.current.selectRow(0, plain));
    act(() => result.current.press(position('A3'), plain));
    expect(result.current.keys.size).toBe(12);
    act(() => result.current.openAt(position('A3')));
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.keys.size).toBe(12);
    releasePointer();
    act(() => result.current.press(position('A3'), plain));
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.keys).toEqual(sameKeys(['A3']));
  });

  it('extends from the anchor with Shift and adds the range with Shift and Ctrl', () => {
    const { result } = renderSelection();
    act(() => result.current.press(position('A1'), plain));
    releasePointer();
    act(() => result.current.press(position('A3'), shift));
    expect(result.current.keys).toEqual(sameKeys(['A1', 'A2', 'A3']));
    act(() => result.current.press(position('C1'), ctrl));
    releasePointer();
    act(() => result.current.press(position('C2'), shiftCtrl));
    expect(result.current.keys).toEqual(sameKeys(['A1', 'A2', 'A3', 'C1', 'C2']));
  });

  it('adds, removes and extends whole rows from the row letters', () => {
    const { result } = renderSelection();
    act(() => result.current.selectRow(0, plain));
    act(() => result.current.selectRow(2, ctrl));
    expect(result.current.keys.size).toBe(24);
    act(() => result.current.selectRow(2, ctrl));
    expect(result.current.keys.size).toBe(12);
    act(() => result.current.selectRow(1, plain));
    act(() => result.current.selectRow(3, shift));
    expect(result.current.keys.size).toBe(36);
  });
});
