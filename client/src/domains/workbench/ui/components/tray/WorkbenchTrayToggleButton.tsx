import { useInsertTrayStore, type TrayMode } from './insertTrayStore';

interface WorkbenchTrayToggleButtonProps {
  mode: TrayMode;
}

const CLOSED_LABELS: Record<TrayMode, string> = {
  step: '+ Insert a value or a common step',
  formula: '+ Insert a name or operator',
};

export function WorkbenchTrayToggleButton({ mode }: WorkbenchTrayToggleButtonProps) {
  const isOpen = useInsertTrayStore(state => state.isOpen);
  const toggleOpen = useInsertTrayStore(state => state.toggleOpen);
  return (
    <button
      type="button"
      tabIndex={-1}
      className="ml-auto py-0.5 font-mono text-label-2xs text-muted-foreground transition-colors hover:text-foreground"
      onMouseDown={event => {
        event.preventDefault();
        toggleOpen();
      }}
    >
      {isOpen ? '− Hide the insert list' : CLOSED_LABELS[mode]}
    </button>
  );
}
