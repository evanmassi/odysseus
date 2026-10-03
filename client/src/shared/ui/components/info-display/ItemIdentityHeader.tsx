import { useLayoutEffect, useRef, type ReactNode } from 'react';

import { Divider } from '../../primitives/divider/Divider';

const NAME_MAX_PX = 36;
const NAME_MIN_PX = 12;

interface ItemIdentityHeaderProps {
  marker: ReactNode;
  name?: string;
  fallback?: ReactNode;
  trailing?: ReactNode;
}

export function ItemIdentityHeader({ marker, name, fallback, trailing }: ItemIdentityHeaderProps) {
  const nameBoxRef = useRef<HTMLDivElement>(null);
  const nameTextRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const box = nameBoxRef.current;
    const text = nameTextRef.current;
    if (!box || !text) return;

    const fit = () => {
      let size = NAME_MAX_PX;
      text.style.fontSize = `${size}px`;
      while (size > NAME_MIN_PX && text.scrollHeight > box.clientHeight) {
        size -= 1;
        text.style.fontSize = `${size}px`;
      }
    };

    fit();

    if (typeof ResizeObserver === 'undefined') return;
    let lastWidth = box.clientWidth;
    const observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (Math.abs(width - lastWidth) < 0.5) return;
      lastWidth = width;
      fit();
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [name]);

  return (
    <div className="relative flex items-center gap-3 pb-5">
      <div className="relative flex-shrink-0">{marker}</div>

      {name ? (
        <div ref={nameBoxRef} className="flex h-11 min-w-0 flex-1 items-center overflow-hidden">
          <div
            ref={nameTextRef}
            className="w-full break-words font-semibold leading-none text-foreground"
          >
            {name}
          </div>
        </div>
      ) : (
        fallback
      )}

      {trailing && <div className="flex-shrink-0">{trailing}</div>}

      <Divider tone="neutral" className="absolute inset-x-0 bottom-0" />
    </div>
  );
}
