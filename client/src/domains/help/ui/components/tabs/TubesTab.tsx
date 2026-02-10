/**
 * Tubes Tab
 *
 * Annotated diagram showing what each element on a tube cell means,
 * plus legends for lock states and color coding.
 */
import { Lock, LockKeyhole, Notebook, Palette, ScanEye, ShieldCheck } from 'lucide-react';

import { IndicatorSVG } from '@domains/tubes/ui/components/grid/IndicatorSVG';

import './TubesTab.css';

// --- Callout group helper ---

interface CalloutProps {
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelAnchor: 'left' | 'right';
  labelOffsetY?: number;
}

function Callout({ label, x1, y1, x2, y2, labelAnchor, labelOffsetY = -8 }: CalloutProps) {
  const labelX = labelAnchor === 'right' ? x2 + 6 : x2 - 6;
  const textAnchor = labelAnchor === 'right' ? 'start' : 'end';

  return (
    <g className="callout-group">
      <line className="callout-line" x1={x1} y1={y1} x2={x2} y2={y2} />
      <circle className="callout-dot" cx={x1} cy={y1} r={2.5} />
      <circle className="callout-dot" cx={x2} cy={y2} r={2} />
      <text
        className="callout-label fill-current text-muted-foreground"
        x={labelX}
        y={y2 + labelOffsetY}
        textAnchor={textAnchor}
        fontSize={12.5}
        dominantBaseline="auto"
      >
        {label}
      </text>
    </g>
  );
}

// --- Swatch data ---

const CELL_LINE_SWATCHES = [
  { name: 'Jurkat', color: '#A85A4A', textColor: '#FFFFFF' },
  { name: 'NALM6', color: '#4A9A8F', textColor: '#FFFFFF' },
  { name: 'LNCaP', color: '#7B7FC4', textColor: '#FFFFFF' },
  { name: '22Rv1', color: '#C9B86A', textColor: '#000000' },
  { name: 'SKBR3', color: '#9A7AA8', textColor: '#FFFFFF' },
  { name: 'PANC1', color: '#C9986A', textColor: '#000000' },
  { name: 'MCF7', color: '#3D5A73', textColor: '#FFFFFF' },
  { name: 'A549', color: '#C47A65', textColor: '#FFFFFF' },
  { name: 'H1299', color: '#4A6A6A', textColor: '#FFFFFF' },
  { name: 'HeLa', color: '#8B6B4A', textColor: '#FFFFFF' },
  { name: 'K562', color: '#B84A5A', textColor: '#FFFFFF' },
  { name: 'U937', color: '#5A8AAA', textColor: '#FFFFFF' },
];

// Donor-based brightness example: same donor base color (#5E7A6B) with cell type offsets
// PBMC = 0, NK Cells = +10, Human T Cells = +25
const DONOR_BRIGHTNESS_SWATCHES = [
  { name: 'PBMC', color: '#5E7A6B', textColor: '#FFFFFF' },
  { name: 'NK Cells', color: '#6E8B7B', textColor: '#FFFFFF' },
  { name: 'Human T Cells', color: '#87A494', textColor: '#000000' },
];

// --- Main component ---

export function TubesTab() {
  return (
    <div className="space-y-8">
      {/* Section A: Annotated Tube Diagram */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ScanEye size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Tube Cell Anatomy</h3>
        </div>

        <div className="flex justify-center">
          <svg
            viewBox="0 50 620 255"
            className="w-full"
            role="img"
            aria-label="Annotated tube cell diagram showing all visual elements"
          >
            {/* Tube cell replica - centered at x=310, size 120x120 */}
            <rect
              x={250}
              y={110}
              width={120}
              height={120}
              rx={8}
              fill="#A85A4A"
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />

            {/* Position label (top-right) */}
            <rect x={337} y={115} width={28} height={16} rx={3} fill="rgba(0,0,0,0.35)" />
            <text x={351} y={127} textAnchor="middle" fontSize={10} fontWeight={600} fill="#FFFFFF">
              A1
            </text>

            {/* Lot indicator square (top-left) */}
            <g transform="translate(255, 115)">
              <rect width={14} height={14} rx={1} fill="#4CAF50" stroke="#FFFFFF" strokeWidth={1} />
              <line x1={7} y1={1} x2={7} y2={13} stroke="#FFFFFF" strokeWidth={1.5} />
            </g>

            {/* Cell type text (center) */}
            <text x={310} y={162} textAnchor="middle" fontSize={12} fontWeight={700} fill="#FFFFFF">
              Human T Cells
            </text>

            {/* Donor Internal ID */}
            <text
              x={310}
              y={178}
              textAnchor="middle"
              fontSize={10}
              fontWeight={500}
              fill="#FFFFFF"
              opacity={0.9}
            >
              DON-0042
            </text>

            {/* Donor Source ID */}
            <text
              x={310}
              y={191}
              textAnchor="middle"
              fontSize={10}
              fontWeight={500}
              fill="#FFFFFF"
              opacity={0.9}
            >
              SRC-1138
            </text>

            {/* Lock icon (bottom-left) */}
            <g transform="translate(255, 213)">
              <rect
                x={0}
                y={5}
                width={12}
                height={9}
                rx={1.5}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={1.2}
              />
              <path
                d="M3,5 V3.5 A3,3 0 0,1 9,3.5 V5"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={1.2}
              />
            </g>

            {/* Culture condition triangle (bottom-right) */}
            <g transform="translate(351, 212)">
              <polygon
                points="7,1 13,13 1,13"
                fill="#FF9800"
                stroke="#FFFFFF"
                strokeWidth={1}
                strokeLinejoin="round"
              />
            </g>

            {/* --- Callout lines --- */}
            {/* Anchors (x1,y1) sit AT each visual element, not at tube border */}

            {/* Lot indicator — anchor at the square */}
            <Callout
              label="Lot Number"
              x1={258}
              y1={120}
              x2={155}
              y2={68}
              labelAnchor="left"
              labelOffsetY={4}
            />

            {/* Position badge — anchor at right side of badge */}
            <Callout
              label="Position"
              x1={362}
              y1={120}
              x2={460}
              y2={68}
              labelAnchor="right"
              labelOffsetY={4}
            />

            {/* Cell type — anchor at left edge of "Human T Cells" text */}
            <Callout
              label="Cell Type"
              x1={265}
              y1={158}
              x2={150}
              y2={148}
              labelAnchor="left"
              labelOffsetY={4}
            />

            {/* Internal donor ID — anchor at left edge of "DON-0042" */}
            <Callout
              label="Internal Donor ID"
              x1={275}
              y1={174}
              x2={140}
              y2={208}
              labelAnchor="left"
              labelOffsetY={4}
            />

            {/* Source donor ID — anchor at right edge of "SRC-1138" */}
            <Callout
              label="Source Donor ID"
              x1={345}
              y1={187}
              x2={470}
              y2={195}
              labelAnchor="right"
              labelOffsetY={4}
            />

            {/* Lock icon — anchor at the icon */}
            <Callout
              label="Lock Status"
              x1={261}
              y1={222}
              x2={140}
              y2={280}
              labelAnchor="left"
              labelOffsetY={4}
            />

            {/* Culture condition — anchor at the triangle */}
            <Callout
              label="Culture Condition"
              x1={358}
              y1={222}
              x2={478}
              y2={290}
              labelAnchor="right"
              labelOffsetY={4}
            />
          </svg>
        </div>
      </section>

      {/* Section B: Lock States Legend */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <LockKeyhole size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Lock States</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Lock size={20} className="text-secondary-foreground" />
            <span className="text-xs font-medium text-card-foreground">Your Lock</span>
            <span className="text-[11px] text-muted-foreground text-center">
              You locked this tube
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
            <ShieldCheck size={20} className="text-secondary-foreground" />
            <span className="text-xs font-medium text-card-foreground">Shared Access</span>
            <span className="text-[11px] text-muted-foreground text-center">
              Another user shared access with you
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Lock size={20} className="text-red-500" />
            <span className="text-xs font-medium text-card-foreground">Locked Out</span>
            <span className="text-[11px] text-muted-foreground text-center">
              Locked by another user; cell appears dimmed
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <Notebook size={14} className="flex-shrink-0 text-secondary-foreground" />
          Lock notes appear when hovering over the lock icon, or in the tube information panel.
        </p>
      </section>

      {/* Section C: Color Coding */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Color Coding</h3>
        </div>
        {/* Cell line swatches */}
        <h4 className="text-xs font-medium text-card-foreground mb-1">Cell Lines</h4>
        <p className="text-xs text-muted-foreground mb-2">
          Known and commonly used cell lines have fixed, recognizable colors.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {CELL_LINE_SWATCHES.map(s => (
            <div
              key={s.name}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
              style={{ backgroundColor: s.color }}
            >
              <span className="text-xs font-semibold" style={{ color: s.textColor }}>
                {s.name}
              </span>
            </div>
          ))}
        </div>

        {/* Donor brightness example */}
        <h4 className="text-xs font-medium text-card-foreground mb-1">Donor-Based Brightness</h4>
        <p className="text-xs text-muted-foreground mb-2">
          Each donor gets a unique base color. Cell type shifts the brightness.
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {DONOR_BRIGHTNESS_SWATCHES.map(s => (
            <div
              key={s.name}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
              style={{ backgroundColor: s.color }}
            >
              <span className="text-xs font-semibold" style={{ color: s.textColor }}>
                {s.name}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Text color adjusts automatically for contrast.
        </p>

        {/* Indicator examples */}
        <h4 className="text-xs font-medium text-card-foreground mb-2">Indicators</h4>
        <div className="flex items-center gap-2">
          <IndicatorSVG
            shape="square"
            color="#4CAF50"
            pattern="stripe"
            size={16}
            title="Lot number indicator"
          />
          <span className="text-xs text-muted-foreground">
            Lot Number — top-left corner, unique color and pattern per lot
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <IndicatorSVG
            shape="triangle"
            color="#FF9800"
            pattern="solid"
            size={16}
            title="Culture condition indicator"
          />
          <span className="text-xs text-muted-foreground">
            Culture Condition — bottom-right corner, unique color per condition
          </span>
        </div>
      </section>
    </div>
  );
}
