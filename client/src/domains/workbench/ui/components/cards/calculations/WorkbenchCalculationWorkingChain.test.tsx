import { fireEvent, render, screen } from '@testing-library/react';
import { produce } from 'immer';

import { RestingTooltipProvider } from '@shared/ui';

import { useFollowedNames } from '../../../../hooks/useFollowedNames';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { nameKey } from '../../../../utils/formulas/boardCalculation';
import { blankProtocol } from '../../../../utils/protocolFile/blankProtocol';

import { WorkbenchCalculationWorkingChain } from './WorkbenchCalculationWorkingChain';

function Working({ name }: { name: string }) {
  const { followed, toggleFollowed } = useFollowedNames();
  const result = useWorkbenchStore(state => {
    const entry = state.board.names.get(nameKey(name));
    return entry && state.board.results.get(entry.id);
  });
  return (
    <WorkbenchCalculationWorkingChain
      name={name}
      result={result}
      shortName={full => full}
      followed={followed}
      onFollow={toggleFollowed}
    />
  );
}

const renderWorking = (name: string) =>
  render(
    <RestingTooltipProvider>
      <Working name={name} />
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
      draft.calculations.items.push(
        { id: 'half', name: 'Half well', formula: 'Total well vol. / 2', unit: 'µL' },
        { id: 'quarter', name: 'Quarter well', formula: 'Half well / 2', unit: 'µL' },
        {
          id: 'third',
          name: 'Third well',
          formula: 'round up(Total well vol. / 3, 5 µL)',
          unit: 'µL',
        }
      );
    }),
    'test.json'
  );
});

describe('a working', () => {
  it('reads name = formula in words = numbers = answer', () => {
    renderWorking('Half well');
    expect(screen.getByText('Total well vol.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '80 µL' })).toBeInTheDocument();
    expect(screen.getByText('40 µL')).toBeInTheDocument();
  });

  it('opens a typed number for editing in place and saves it to its one home', () => {
    renderWorking('Half well');
    fireEvent.click(screen.getByRole('button', { name: '80 µL' }));
    const field = screen.getByDisplayValue('80');
    fireEvent.change(field, { target: { value: '90' } });
    expect(savedValue()).toBe('90');
  });

  it('follows a worked-out number to its own working underneath, and closes it again', () => {
    renderWorking('Quarter well');
    const halfWell = screen.getByRole('button', { name: '40 µL' });
    expect(screen.queryByRole('button', { name: '80 µL' })).toBeNull();
    fireEvent.click(halfWell);
    expect(halfWell).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: '80 µL' })).toBeInTheDocument();
    fireEvent.click(halfWell);
    expect(screen.queryByRole('button', { name: '80 µL' })).toBeNull();
    expect(savedValue()).toBe('80');
  });

  it('reads a rounding as the number before it, then what it rounds to', () => {
    renderWorking('Third well');
    expect(screen.getByText('26.7 µL')).toBeInTheDocument();
    expect(screen.getByText('30 µL')).toBeInTheDocument();
    expect(screen.getByText(/rounded up to the nearest/)).toBeInTheDocument();
  });
});
