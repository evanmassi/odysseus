import type { PanelLayout } from '../../../../utils/flowCytometry/flowCytometryPanel';

interface WorkbenchFlowCytometryUsageBarProps {
  layout: PanelLayout;
  isSpectral: boolean;
}

const BLOCK = 'box-border h-3.5 w-[9px] border';

export function WorkbenchFlowCytometryUsageBar({
  layout,
  isSpectral,
}: WorkbenchFlowCytometryUsageBarProps) {
  const groups = layout.lasers.map(laser => ({
    name: laser.name,
    color: laser.color,
    isUsed: isSpectral
      ? laser.slots.flatMap(slot => slot.markers).map(() => true)
      : laser.slots.map(slot => slot.markers.length > 0),
  }));
  const marks = groups.flatMap(group => group.isUsed);
  const usedCount = marks.filter(Boolean).length;

  return (
    <span className="ml-auto flex items-center gap-2.5 text-body-sm text-muted-foreground">
      <span>
        <b className="font-mono text-data-sm text-foreground">{usedCount}</b>{' '}
        {isSpectral
          ? `${usedCount === 1 ? 'fluor' : 'fluors'} on ${groups.length} ${groups.length === 1 ? 'laser' : 'lasers'}`
          : `of ${marks.length} ${marks.length === 1 ? 'detector' : 'detectors'}`}
      </span>
      <span aria-hidden className="flex items-center gap-1.5">
        {groups.map(group => (
          <span key={group.name} className="flex gap-0.5">
            {group.isUsed.map((isUsed, index) => (
              <i
                key={index}
                className={BLOCK}
                style={
                  isUsed
                    ? {
                        borderColor: group.color,
                        backgroundColor: `color-mix(in srgb, ${group.color} 70%, transparent)`,
                        boxShadow: `0 0 6px -1px ${group.color}`,
                      }
                    : { borderColor: `color-mix(in srgb, ${group.color} 45%, transparent)` }
                }
              />
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
