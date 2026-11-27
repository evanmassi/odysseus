import { fireEvent, render, screen } from '@testing-library/react';
import { produce } from 'immer';

import { RestingTooltipProvider } from '@shared/ui';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { blankProtocol } from '../../../../utils/protocolFile/blankProtocol';

import { WorkbenchCalculationWorkingTerm } from './WorkbenchCalculationWorkingTerm';

import type { WorkingRef } from '../../../../utils/formulas/workingTree';

const ref = (name: string, text: string, source: WorkingRef['source']): WorkingRef => ({
  kind: 'ref',
  name,
  text,
  source,
  isSetAside: false,
});

const renderTerm = (node: WorkingRef) =>
  render(
    <RestingTooltipProvider>
      <WorkbenchCalculationWorkingTerm node={node} label={node.name} />
    </RestingTooltipProvider>
  );

const savedValue = () => {
  const [item] = useWorkbenchStore.getState().protocol.values.items;
  return 'name' in item ? item.value : undefined;
};

beforeEach(() => {
  useWorkbenchStore.getState().openProtocol(
    produce(blankProtocol(), draft => {
      draft.values.items.push({ id: 'total', name: 'Total well vol.', value: '80', unit: 'µL' });
      draft.calculations.items.push({
        id: 'half',
        name: 'Half well',
        formula: 'Total well vol. / 2',
        unit: 'µL',
      });
    }),
    'test.json'
  );
});

describe('a number in a working', () => {
  it('opens a typed number for editing in place and saves it to its one home', () => {
    renderTerm(ref('Total well vol.', '80 µL', 'value'));
    fireEvent.click(screen.getByRole('button'));
    const field = screen.getByDisplayValue('80');
    fireEvent.change(field, { target: { value: '90' } });
    expect(savedValue()).toBe('90');
  });

  it('leaves a worked-out number as a jump to where it is worked out', () => {
    renderTerm(ref('Half well', '40 µL', 'calculation'));
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByDisplayValue('40')).toBeNull();
    expect(savedValue()).toBe('80');
  });
});
