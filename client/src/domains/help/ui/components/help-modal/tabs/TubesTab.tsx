/**
 * Tubes Tab
 *
 * Annotated diagram showing what each element on a tube cell means,
 * plus legends for lock states and color coding.
 */
import { Lock, Notebook, ShieldCheck } from 'lucide-react';

import { TubePropertyIndicator } from '@domains/tubes/ui/components/grid/TubePropertyIndicator';
import { cellLineCategories } from '@domains/tubes/utils/tubeColorCoding';
import { Well } from '@shared/ui';
import { getOptimalTextColor } from '@shared/utils/labColorSpace';

import { HelpSection } from '../HelpSection';

import './tubes-tab.css';

const CELL_LINE_DISPLAY_NAMES: Record<string, string> = {
  jurkat: 'Jurkat',
  nalm6: 'NALM6',
  lncap: 'LNCaP',
  '22rv1': '22Rv1',
  skbr3: 'SKBR3',
  panc1: 'PANC1',
  mcf7: 'MCF7',
  a549: 'A549',
  h1299: 'H1299',
  hela: 'HeLa',
  k562: 'K562',
  u937: 'U937',
};

const CELL_LINE_SWATCHES = cellLineCategories.map(c => ({
  name: CELL_LINE_DISPLAY_NAMES[c.name] ?? c.name,
  color: c.color,
  textColor: getOptimalTextColor(c.color),
}));

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

// Shared T-cell example: the same swatch drives the diagram fill/ink and the brightness legend.
const T_CELL_EXAMPLE = { name: 'T Cells', color: '#87A494', textColor: '#000000' };

// Example swatches showing how a single donor's base color shifts by cell type
const DONOR_BRIGHTNESS_SWATCHES = [
  { name: 'PBMC', color: '#5E7A6B', textColor: '#FFFFFF' },
  { name: 'NK Cells', color: '#6E8B7B', textColor: '#FFFFFF' },
  T_CELL_EXAMPLE,
];

export function TubesTab() {
  return (
    <div className="space-y-8">
      <HelpSection id="tubes-anatomy">
        <div className="flex justify-center">
          <svg
            viewBox="80 58 470 200"
            className="w-full"
            role="img"
            aria-label="Annotated tube cell diagram showing all visual elements"
          >
            <defs>
              {/* Matches the real cell's vertical sheen: highlight on top, shade at the base. */}
              <linearGradient id="tubeSheen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.12} />
                <stop offset="46%" stopColor="#FFFFFF" stopOpacity={0} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0.14} />
              </linearGradient>
            </defs>

            {/* Tube cell replica */}
            <rect
              x={250}
              y={110}
              width={120}
              height={120}
              fill={T_CELL_EXAMPLE.color}
              stroke="rgba(0,0,0,0.22)"
              strokeWidth={1}
            />
            <rect x={250} y={110} width={120} height={120} fill="url(#tubeSheen)" />

            {/* Lot indicator square (top-left) */}
            <g transform="translate(256, 116)">
              <rect
                width={15}
                height={15}
                rx={1}
                fill="#4CAF50"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={1}
              />
              <line x1={7.5} y1={1.5} x2={7.5} y2={13.5} stroke="#FFFFFF" strokeWidth={1.5} />
            </g>

            {/* Top-right cluster: lock icon then plain position label */}
            <g transform="translate(339, 118)" opacity={0.82}>
              <rect
                x={0}
                y={5}
                width={11}
                height={8}
                rx={1.5}
                fill="none"
                stroke={T_CELL_EXAMPLE.textColor}
                strokeWidth={1.2}
              />
              <path
                d="M2.5,5 V3.6 A3,3 0 0,1 8.5,3.6 V5"
                fill="none"
                stroke={T_CELL_EXAMPLE.textColor}
                strokeWidth={1.2}
              />
            </g>
            <text
              x={364}
              y={128}
              textAnchor="end"
              fontSize={11}
              fontWeight={600}
              fill={T_CELL_EXAMPLE.textColor}
              opacity={0.82}
            >
              A1
            </text>

            {/* Bottom-left text block: cell type (bold), then donor IDs, stacked */}
            <text
              x={256}
              y={199}
              fontSize={11}
              fontWeight={700}
              fill={T_CELL_EXAMPLE.textColor}
              opacity={0.95}
            >
              T Cells
            </text>
            <text
              x={256}
              y={212}
              fontSize={9.5}
              fontWeight={500}
              fill={T_CELL_EXAMPLE.textColor}
              opacity={0.82}
            >
              DON-0042
            </text>
            <text
              x={256}
              y={223}
              fontSize={9.5}
              fontWeight={500}
              fill={T_CELL_EXAMPLE.textColor}
              opacity={0.6}
            >
              SRC-1138
            </text>

            {/* Culture condition corner triangle (bottom-right corner) */}
            <polygon
              points="368,210 368,228 350,228"
              fill="#FF9800"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={1}
              strokeLinejoin="round"
            />

            {/* Callout lines — anchors (x1,y1) sit at each visual element */}

            {/* Lot indicator — anchor at the square's outer corner */}
            <Callout
              label="Lot Number"
              x1={256}
              y1={116}
              x2={205}
              y2={86}
              labelAnchor="left"
              labelOffsetY={4}
            />

            {/* Position label — anchor on the right edge, clear of the "A1" text */}
            <Callout
              label="Position"
              x1={370}
              y1={123}
              x2={415}
              y2={82}
              labelAnchor="right"
              labelOffsetY={4}
            />

            {/* Lock icon — anchor below the padlock; route below "A1" to avoid clipping it */}
            <Callout
              label="Lock Status"
              x1={349}
              y1={131}
              x2={415}
              y2={150}
              labelAnchor="right"
              labelOffsetY={4}
            />

            {/* Cell type — anchor on the left edge at the cell-type row */}
            <Callout
              label="Cell Type"
              x1={250}
              y1={196}
              x2={205}
              y2={150}
              labelAnchor="left"
              labelOffsetY={4}
            />

            {/* Internal donor ID — anchor on the left edge at the internal-ID row */}
            <Callout
              label="Internal Donor ID"
              x1={250}
              y1={209}
              x2={205}
              y2={188}
              labelAnchor="left"
              labelOffsetY={4}
            />

            {/* Source donor ID — anchor on the left edge at the source-ID row */}
            <Callout
              label="Source Donor ID"
              x1={250}
              y1={220}
              x2={205}
              y2={226}
              labelAnchor="left"
              labelOffsetY={4}
            />

            {/* Culture condition — anchor on the right edge at the corner triangle */}
            <Callout
              label="Culture Condition"
              x1={368}
              y1={219}
              x2={415}
              y2={232}
              labelAnchor="right"
              labelOffsetY={4}
            />
          </svg>
        </div>
      </HelpSection>

      <HelpSection id="tubes-lock-states">
        <div className="grid grid-cols-3 gap-4">
          <Well className="flex flex-col items-center gap-2 p-3">
            <Lock size={20} className="text-secondary-foreground" />
            <span className="text-body-sm font-medium text-card-foreground">Your Lock</span>
            <span className="text-caption text-muted-foreground text-center">
              You locked this tube
            </span>
          </Well>

          <Well className="flex flex-col items-center gap-2 p-3">
            <ShieldCheck size={20} className="text-secondary-foreground" />
            <span className="text-body-sm font-medium text-card-foreground">Shared Access</span>
            <span className="text-caption text-muted-foreground text-center">
              Another user shared access with you
            </span>
          </Well>

          <Well className="flex flex-col items-center gap-2 p-3">
            <Lock size={20} className="text-red-500" />
            <span className="text-body-sm font-medium text-card-foreground">Locked Out</span>
            <span className="text-caption text-muted-foreground text-center">
              Locked by another user; cell appears dimmed
            </span>
          </Well>
        </div>
        <p className="text-body-sm text-muted-foreground mt-3 flex items-center gap-1.5">
          <Notebook size={14} className="flex-shrink-0 text-secondary-foreground" />
          Lock notes appear when hovering over the tube, or in the Tube Information panel.
        </p>
      </HelpSection>

      <HelpSection id="tubes-color">
        <h4 className="text-body-sm font-medium text-card-foreground mb-1">Cell Lines</h4>
        <p className="text-body-sm text-muted-foreground mb-2">
          Known and commonly used cell lines have fixed, recognizable colors.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {CELL_LINE_SWATCHES.map(s => (
            <div
              key={s.name}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-none"
              style={{ backgroundColor: s.color }}
            >
              <span className="text-body-sm font-semibold" style={{ color: s.textColor }}>
                {s.name}
              </span>
            </div>
          ))}
        </div>

        <h4 className="text-body-sm font-medium text-card-foreground mb-1">
          Donor-Based Brightness
        </h4>
        <p className="text-body-sm text-muted-foreground mb-2">
          Each donor gets a unique base color. Cell type shifts the brightness.
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {DONOR_BRIGHTNESS_SWATCHES.map(s => (
            <div
              key={s.name}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-none"
              style={{ backgroundColor: s.color }}
            >
              <span className="text-body-sm font-semibold" style={{ color: s.textColor }}>
                {s.name}
              </span>
            </div>
          ))}
        </div>

        <p className="text-body-sm text-muted-foreground mb-4">
          Text color adjusts automatically for contrast.
        </p>

        <h4 className="text-body-sm font-medium text-card-foreground mb-2">Indicators</h4>
        <div className="flex items-center gap-2">
          <TubePropertyIndicator
            shape="square"
            color="#4CAF50"
            pattern="stripe"
            size={16}
            title="Lot number indicator"
          />
          <span className="text-body-sm text-muted-foreground">
            Lot Number — top-left corner, unique color and pattern per lot
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <TubePropertyIndicator
            shape="corner-triangle"
            color="#FF9800"
            pattern="solid"
            size={16}
            title="Culture condition indicator"
          />
          <span className="text-body-sm text-muted-foreground">
            Culture Condition — bottom-right corner, unique color per condition
          </span>
        </div>
      </HelpSection>
    </div>
  );
}
