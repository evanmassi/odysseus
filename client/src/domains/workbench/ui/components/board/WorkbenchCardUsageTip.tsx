import { Info } from 'lucide-react';

import { KeyCombo, Tooltip, TooltipPlaque } from '@shared/ui';

import { CARD_TYPES, type CardUsageTip } from '../../../utils/cards/cardTypes';

import { CARD_ICONS } from './cardIcons';

import type { ProtocolCardType } from '@odysseus/shared-schemas';

interface WorkbenchCardUsageTipProps {
  tip: CardUsageTip;
  cardLabel: string;
}

const MARKUP = /(\[[^\]]+\]|\*[^*]+\*|<[a-z]+>)/;

const isCardType = (text: string): text is ProtocolCardType => text in CARD_TYPES;

function CardReference({ type }: { type: ProtocolCardType }) {
  const Icon = CARD_ICONS[type];
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <Icon aria-hidden className="h-3.5 w-3.5 text-primary" />
      <span className="text-tooltip-foreground">{CARD_TYPES[type].label}</span>
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
          return isCardType(type) ? <CardReference key={index} type={type} /> : part;
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

export function WorkbenchCardUsageTip({ tip, cardLabel }: WorkbenchCardUsageTipProps) {
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
        aria-label={`About the ${cardLabel} card`}
        className="flex flex-none cursor-help text-muted-foreground hover:text-foreground"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
