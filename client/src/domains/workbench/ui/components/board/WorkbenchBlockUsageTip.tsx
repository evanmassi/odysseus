import { Info } from 'lucide-react';

import { KeyCombo, Tooltip, TooltipPlaque } from '@shared/ui';

import { BLOCK_TYPES, type BlockUsageTip } from '../../../utils/blocks/blockTypes';

import { BLOCK_ICONS } from './blockIcons';

import type { ProtocolBlockType } from '@odysseus/shared-schemas';

interface WorkbenchBlockUsageTipProps {
  tip: BlockUsageTip;
  blockLabel: string;
}

const MARKUP = /(\[[^\]]+\]|\*[^*]+\*|<[a-z]+>)/;

const isBlockType = (text: string): text is ProtocolBlockType => text in BLOCK_TYPES;

function BlockReference({ type }: { type: ProtocolBlockType }) {
  const Icon = BLOCK_ICONS[type];
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <Icon aria-hidden className="h-3.5 w-3.5 text-primary" />
      <span className="text-tooltip-foreground">{BLOCK_TYPES[type].label}</span>
    </span>
  );
}

function TipPoint({ point }: { point: string }) {
  return (
    <>
      {point.split(MARKUP).map((part, index) => {
        if (part.startsWith('[')) return <KeyCombo key={index} keys={part.slice(1, -1)} />;
        if (part.startsWith('<')) {
          const type = part.slice(1, -1);
          return isBlockType(type) ? <BlockReference key={index} type={type} /> : part;
        }
        if (part.startsWith('*')) {
          return (
            <span key={index} className="font-semibold text-tooltip-foreground">
              {part.slice(1, -1)}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

export function WorkbenchBlockUsageTip({ tip, blockLabel }: WorkbenchBlockUsageTipProps) {
  return (
    <Tooltip
      bare
      className="group"
      content={
        <TooltipPlaque className="w-max">
          <p className="mb-2 text-body font-semibold leading-tight text-tooltip-foreground">
            {tip.heading}
          </p>
          <ul className="flex flex-col gap-1.5">
            {tip.points.map(point => (
              <li
                key={point}
                className="flex items-baseline gap-2 whitespace-nowrap text-body-sm leading-relaxed text-tooltip-muted"
              >
                <span aria-hidden className="h-1 w-1 flex-none -translate-y-0.5 bg-tooltip-muted" />
                <span>
                  <TipPoint point={point} />
                </span>
              </li>
            ))}
          </ul>
        </TooltipPlaque>
      }
    >
      <button
        type="button"
        aria-label={`About the ${blockLabel} card`}
        className="flex flex-none cursor-help text-muted-foreground hover:text-foreground"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
