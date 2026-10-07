import { useTextTruncation } from '@shared/hooks';

import { Tooltip } from './Tooltip';

const REVEAL_DELAY_MS = 400;

interface TruncatedTextProps {
  text: string;
  className?: string;
  tooltipClassName?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function TruncatedText({
  text,
  className = '',
  tooltipClassName,
  side = 'top',
}: TruncatedTextProps) {
  const { ref, isTruncated } = useTextTruncation<HTMLSpanElement>([text]);

  return (
    <Tooltip
      content={text}
      disabled={!isTruncated}
      side={side}
      delayDuration={REVEAL_DELAY_MS}
      className={tooltipClassName}
    >
      <span ref={ref} className={`truncate ${className}`}>
        {text}
      </span>
    </Tooltip>
  );
}
