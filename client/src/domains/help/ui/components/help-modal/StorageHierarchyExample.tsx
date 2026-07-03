/**
 * Storage Hierarchy Example
 *
 * Static, annotated mock of the Storage Navigator for the help modal — shows how
 * tanks, racks, and boxes nest and what the occupancy and ownership cues mean.
 */
import { type ReactNode } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import { ChevronRight, Icon, Rows3 } from 'lucide-react';

import { DEFAULT_GRID_CONFIG } from '@domains/storage';
import { BoxOccupancyMatrix } from '@domains/storage/ui/components/storage-navigator/BoxOccupancyMatrix';
import { Well } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';

import type { GridConfiguration, RackTube } from '@odysseus/shared-schemas';

const EXAMPLE_GRID: GridConfiguration = { ...DEFAULT_GRID_CONFIG, rows: 5, cols: 5 };
const EXAMPLE_CAPACITY = EXAMPLE_GRID.rows * EXAMPLE_GRID.cols;

// Distinct cell types so the minimap paints a realistic spread of smart colors.
const CELL_TYPES = ['HeLa', 'CHO-K1', 'HEK293', 'Jurkat', 'A549'];

function mockTubes(boxId: string, count: number): RackTube[] {
  return Array.from({ length: count }, (_, i) => ({
    boxId,
    position: i + 1,
    cellType: CELL_TYPES[i % CELL_TYPES.length],
  }));
}

function Callout({ n }: { n: number }) {
  return (
    <span className="inline-flex h-4 w-4 flex-none items-center justify-center border border-primary/40 bg-primary/10 font-mono text-data-sm text-primary">
      {n}
    </span>
  );
}

function OccupancyBar({ filled, capacity }: { filled: number; capacity: number }) {
  const ratio = capacity > 0 ? (filled / capacity) * 100 : 0;
  return (
    <span className="flex flex-none items-center gap-1.5">
      <span className="relative h-0.5 w-10 bg-foreground/[0.07]">
        <span className="absolute inset-y-0 left-0 bg-primary/80" style={{ width: `${ratio}%` }} />
      </span>
      <span className="font-mono text-data-sm tracking-data text-foreground/45">
        {filled}
        <span className="text-foreground/25">/{capacity}</span>
      </span>
    </span>
  );
}

function LevelDef({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-none text-secondary-foreground">{icon}</span>
      <p className="text-body-sm text-muted-foreground">
        <span className="font-medium text-card-foreground">{label}</span> — {children}
      </p>
    </div>
  );
}

function LegendRow({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Callout n={n} />
      <p className="text-body-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function StorageHierarchyExample() {
  return (
    <div className="space-y-4">
      <p className="text-body-sm text-muted-foreground">
        Everything in storage nests. Tanks hold racks, racks hold boxes. Here&apos;s a tank opened
        up in the Navigator:
      </p>

      <Well className="space-y-1.5 p-3">
        <div className="flex items-center gap-2">
          <ChevronRight size={11} className="rotate-90 text-muted-foreground" />
          <Icon iconNode={refrigeratorFreezer} size={18} className="text-secondary-foreground" />
          <span className="font-mono text-data-sm tracking-data text-card-foreground">Tank A</span>
          <span className="flex-1" />
          <OccupancyBar filled={31} capacity={50} />
          <Callout n={2} />
        </div>

        <div className="ml-4 flex items-center gap-2">
          <ChevronRight size={11} className="rotate-90 text-muted-foreground" />
          <Rows3 size={16} className="text-secondary-foreground" />
          <span className="font-mono text-data-sm tracking-data text-card-foreground">Rack 1</span>
          <span className="flex-1" />
          <UserBadge type="currentUser" initials="ME" size="sm" />
          <Callout n={3} />
        </div>

        <div className="ml-8 space-y-1.5">
          <div className="flex items-center gap-2.5 border border-line-faint p-1.5">
            <Callout n={1} />
            <BoxOccupancyMatrix
              gridConfig={EXAMPLE_GRID}
              tubes={mockTubes('box-a', 13)}
              size={40}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-mono text-data-sm tracking-data text-card-foreground">
                Box A
              </span>
              <OccupancyBar filled={13} capacity={EXAMPLE_CAPACITY} />
            </span>
          </div>

          <div className="flex items-center gap-2.5 border border-warning-border/60 p-1.5">
            <BoxOccupancyMatrix
              gridConfig={EXAMPLE_GRID}
              tubes={mockTubes('box-b', EXAMPLE_CAPACITY)}
              size={40}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-mono text-data-sm tracking-data text-card-foreground">
                Box B
              </span>
              <span className="flex items-center gap-1.5">
                <span className="relative h-0.5 w-10 bg-foreground/[0.07]">
                  <span
                    className="absolute inset-y-0 left-0 bg-warning-bg"
                    style={{ width: '100%' }}
                  />
                </span>
                <span className="type-label text-label-2xs tracking-meta text-warning-text">
                  FULL
                </span>
              </span>
            </span>
            <UserBadge type="otherUser" initials="JD" username="jdoe" size="sm" />
          </div>
        </div>
      </Well>

      <div className="space-y-1.5">
        <LegendRow n={1}>
          Each box shows a small grid of its positions, colored by cell type or donor. The more
          squares filled in, the fuller the box.
        </LegendRow>
        <LegendRow n={2}>The bar and count show how full something is.</LegendRow>
        <LegendRow n={3}>
          The badge shows who a rack or box belongs to. There&apos;s more on that in Ownership &amp;
          Assignment below.
        </LegendRow>
      </div>

      <div className="space-y-2 border-t border-line-faint pt-3">
        <LevelDef icon={<Icon iconNode={refrigeratorFreezer} size={16} />} label="Tank">
          a physical freezer, dewar, or similar storage device.
        </LevelDef>
        <LevelDef icon={<Rows3 size={16} />} label="Rack">
          a named slot within a tank. Can be assigned to a user to organize their storage.
        </LevelDef>
        <LevelDef icon={<BoxMatrixGlyph />} label="Box">
          a grid where tubes are stored, from 5×5 up to 10×10 positions. Can be assigned to a user
          or left as common.
        </LevelDef>
      </div>
    </div>
  );
}

/** Tiny filled-grid glyph so the Box definition reads with the same visual as the minimap. */
function BoxMatrixGlyph() {
  return (
    <span
      aria-hidden
      className="grid h-4 w-4 gap-px"
      style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="bg-secondary-foreground/50" />
      ))}
    </span>
  );
}
