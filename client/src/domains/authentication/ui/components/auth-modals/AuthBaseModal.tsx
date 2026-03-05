/**
 * Authentication Modal Base Layout
 *
 * Shared wrapper providing sketch-draw animation sequence:
 * border draws → background fills → content fades.
 */

import { type ReactNode, type RefObject, useRef, useState, useEffect } from 'react';

import odysseusIcon from '@shared/assets/odysseus-logo-icon-frozen.webp';
import OdysseusLogo from '@shared/assets/odysseus-logo-thick-altered.svg?react';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ModalPortal } from '@shared/ui/components/ModalPortal';
import { SketchBorder } from '@shared/ui/components/SketchBorder';

export interface AuthBaseModalProps {
  children: ReactNode;
  size?: 'default' | 'large';
  showBranding?: boolean | 'icon';
  subtitle?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  /** z-index override for nested modals */
  zIndex?: 50 | 60;
  className?: string;
}

export function AuthBaseModal({
  children,
  size = 'default',
  showBranding = true,
  subtitle,
  initialFocusRef,
  zIndex = 50,
  className = '',
}: AuthBaseModalProps) {
  const trapRef = useFocusTrap({
    isOpen: true,
    restoreFocus: true,
    initialFocusRef,
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = modalRef.current;
    if (!element) return;

    const frameId = requestAnimationFrame(() => {
      setDimensions({ width: element.offsetWidth, height: element.offsetHeight });
    });

    // Watch for size changes (async content loading, etc.)
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Add padding back since contentRect excludes it
        const computedStyle = getComputedStyle(entry.target);
        const paddingX =
          parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
        const paddingY =
          parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
        setDimensions({ width: width + paddingX, height: height + paddingY });
      }
    });
    resizeObserver.observe(element);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, []);

  const sizeClasses = size === 'large' ? 'max-w-lg p-6' : 'max-w-md p-8';
  const zIndexClass = zIndex === 60 ? 'z-[60]' : 'z-50';

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 bg-[hsl(var(--overlay))] flex items-center justify-center ${zIndexClass} animate-modal-backdrop-in`}
      >
        <div
          ref={el => {
            (trapRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            (modalRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }}
          className={`relative bg-transparent rounded-2xl w-full ${sizeClasses} mx-4 ${className}`}
        >
          {dimensions.width > 0 && (
            <SketchBorder
              width={dimensions.width}
              height={dimensions.height}
              borderRadius={16}
              strokeWidth={2}
              strokeColor="hsl(var(--auth-sketch-border))"
              className="z-10"
            />
          )}

          {/* Background fill - animates in after border */}
          <div className="absolute inset-0 bg-card rounded-2xl shadow-2xl shadow-black/10 animate-sketch-fill-in" />

          {/* Content - animates in last */}
          <div className="relative z-20 animate-sketch-content-in">
            {showBranding && (
              <div className="text-center mb-4">
                <div className="w-24 h-24 mx-auto mb-1 flex items-center justify-center">
                  <img src={odysseusIcon} alt="Odysseus" className="w-full h-full object-contain" />
                </div>
                {showBranding === true && (
                  <div className="mx-auto mb-4 flex items-center justify-center">
                    <OdysseusLogo
                      className="h-10 w-auto text-secondary-foreground [[data-theme=dark]_&]:text-muted-foreground"
                      aria-label="Odysseus"
                    />
                  </div>
                )}
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            )}

            {children}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
