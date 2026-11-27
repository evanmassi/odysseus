import { quantityText, unitParts, type UnitPart } from '../../../../utils/formulas/workingUnits';

interface WorkbenchCalculationWorkingQuantityProps {
  text: string;
  struckParts: ReadonlySet<UnitPart> | undefined;
  isSetAside: boolean;
}

const STRUCK =
  "relative after:pointer-events-none after:absolute after:-inset-x-0.5 after:top-1/2 after:-rotate-[18deg] after:border-t after:border-danger-text/70 after:content-['']";

export function WorkbenchCalculationWorkingQuantity({
  text,
  struckParts,
  isSetAside,
}: WorkbenchCalculationWorkingQuantityProps) {
  const { amount, unit } = quantityText(text);
  const parts = unitParts(unit);
  const piece = (part: UnitPart) =>
    struckParts?.has(part) ? <span className={STRUCK}>{parts[part]}</span> : parts[part];
  return (
    <>
      <span className={isSetAside ? 'line-through' : undefined}>{amount}</span>
      {unit && (
        <>
          {' '}
          <span>
            {piece('top')}
            {parts.bottom && <>/{piece('bottom')}</>}
          </span>
        </>
      )}
    </>
  );
}
