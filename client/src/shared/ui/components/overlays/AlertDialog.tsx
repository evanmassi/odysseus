import { useId, type ComponentType, type ReactNode, type Ref } from 'react';

import { X } from 'lucide-react';

import { Divider, ScrimHalo } from '../../primitives';

import { ModalPortal } from './ModalPortal';

const CORNER_PINS = [
  'left-2 top-2',
  'right-2 top-2',
  'bottom-2 left-2',
  'bottom-2 right-2',
] as const;

interface AlertDialogProps {
  isClosing: boolean;
  trapRef: Ref<HTMLDivElement>;
  Mark: ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  pin: string;
  title: string;
  message: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  children: ReactNode;
}

export function AlertDialog({
  isClosing,
  trapRef,
  Mark,
  iconColor,
  pin,
  title,
  message,
  onClose,
  closeDisabled = false,
  children,
}: AlertDialogProps) {
  const titleId = useId();
  const messageId = useId();

  const backdropAnimationClass = isClosing
    ? 'animate-modal-backdrop-out'
    : 'animate-modal-backdrop-in';
  const modalAnimationClass = isClosing ? 'animate-modal-blowup-out' : 'animate-modal-blowup-in';
  const closingPointerEvents = isClosing ? 'pointer-events-none' : '';

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 bg-[hsl(var(--overlay-emphasis))] flex items-center justify-center z-50 ${backdropAnimationClass} ${closingPointerEvents}`}
      >
        <div
          ref={trapRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
          data-theme="dark"
          className={`relative isolate mx-4 w-full max-w-md px-7 py-6 ${modalAnimationClass} ${closingPointerEvents}`}
        >
          <ScrimHalo />
          {CORNER_PINS.map(pos => (
            <span
              key={pos}
              aria-hidden
              className={`pointer-events-none absolute h-0.5 w-2 ${pin} ${pos}`}
            />
          ))}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Mark size={22} className={iconColor} />
              <h2
                id={titleId}
                className="phosphor-text type-label text-label-lg font-semibold text-tooltip-foreground"
              >
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={closeDisabled}
              className="text-tooltip-muted transition-colors hover:text-tooltip-foreground disabled:opacity-50"
              aria-label="Close dialog"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <Divider tone="neutral" className="relative my-4" />

          <p id={messageId} className="mb-7 text-body leading-relaxed text-tooltip-foreground/80">
            {message}
          </p>

          <div className="flex justify-end gap-3">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}
