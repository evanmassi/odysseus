/**
 * Auth Gateway Panel
 *
 * Persistent chrome around the active auth modal; child declares its config via useShellConfig.
 */

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import odysseusIcon from '@shared/assets/odysseus-logo-icon-frozen.webp';
import OdysseusLogo from '@shared/assets/odysseus-logo-thick.svg?react';
import { useFocusTrap } from '@shared/hooks';
import { ModalPortal } from '@shared/ui/components/overlays/ModalPortal';

import { ShellConfigContext, type ShellConfig } from './shellConfigContext';

// Delayed write so Strict Mode's unmount cleanup cancels it before the legitimate
// remount checks the flag.
let hasPlayedIntro = false;

// Equality bail so the per-render useShellConfig call doesn't trip a
// setState→rerender→setState loop.
function configsEqual(a: ShellConfig, b: ShellConfig): boolean {
  return (
    a.contentKey === b.contentKey &&
    a.variant === b.variant &&
    a.width === b.width &&
    a.showBranding === b.showBranding &&
    a.brandTagline === b.brandTagline &&
    a.brandGreeting === b.brandGreeting &&
    a.microheader === b.microheader &&
    a.initialFocusRef === b.initialFocusRef
  );
}

interface AuthGatewayPanelProps {
  children: ReactNode;
}

export function AuthGatewayPanel({ children }: AuthGatewayPanelProps) {
  const [config, setConfigState] = useState<ShellConfig | null>(null);

  const setConfig = useCallback((next: ShellConfig) => {
    setConfigState(prev => (prev && configsEqual(prev, next) ? prev : next));
  }, []);

  const contextValue = useMemo(() => ({ config, setConfig }), [config, setConfig]);

  const [shouldAnimateIntro] = useState(() => !hasPlayedIntro);

  useEffect(() => {
    if (!shouldAnimateIntro) return;
    const timer = setTimeout(() => {
      hasPlayedIntro = true;
    }, 800);
    return () => clearTimeout(timer);
  }, [shouldAnimateIntro]);

  const trapRef = useFocusTrap({
    isOpen: true,
    restoreFocus: true,
    initialFocusRef: config?.initialFocusRef,
  });

  // ResizeObserver tracks the inner content's natural height; we mirror it onto
  // an explicit-height wrapper that transitions. CSS can't transition height: auto
  // directly, so the wrapper holds a pixel value while the inner sizes freely.
  const measureRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const border = entry.borderBoxSize?.[0]?.blockSize;
        setContentHeight(border ?? entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const widthClass = computeWidthClass(config);
  const introClass = shouldAnimateIntro ? 'animate-auth-power-on' : 'animate-auth-chrome-in';

  const isStack = config?.variant === 'stack';

  // Brand + microheader render as siblings of children (not parents) so the
  // children stay at a stable React tree position across config changes — their
  // internal state survives content swaps. Each modal owns its own keyed wrapper
  // for content animation.
  return (
    <ShellConfigContext.Provider value={contextValue}>
      <ModalPortal>
        <div className="auth-field fixed inset-0 flex items-center justify-center overflow-y-auto py-8 z-50">
          <div
            ref={trapRef}
            className={`auth-console-chrome relative overflow-hidden my-auto ${widthClass} mx-4 ${introClass}`}
          >
            <img
              src={odysseusIcon}
              alt=""
              aria-hidden
              className="auth-watermark pointer-events-none select-none absolute -right-20 -bottom-16 w-[25.3rem] h-[25.3rem] object-contain opacity-[0.06]"
            />
            <div
              style={{
                height: contentHeight !== null ? `${contentHeight}px` : undefined,
                transition: 'height 300ms cubic-bezier(0.22, 0.61, 0.36, 1)',
                overflow: 'hidden',
              }}
            >
              <div
                ref={measureRef}
                className={`relative flex flex-col p-8 ${config ? '' : 'invisible'}`}
              >
                {config?.showBranding !== false && config && (
                  <BrandBlock config={config} isStack={isStack} />
                )}
                {config?.microheader && (
                  <div className="auth-microheader mb-5">
                    <span className="auth-microheader-bar" />
                    <span className="phosphor-text">[ {config.microheader} ]</span>
                    <span className="auth-microheader-rule" />
                  </div>
                )}
                {children}
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    </ShellConfigContext.Provider>
  );
}

function computeWidthClass(config: ShellConfig | null): string {
  if (!config) return 'w-full max-w-[420px]';
  if (config.variant === 'console') {
    return config.width === 'wide' ? 'w-full max-w-[580px]' : 'w-full max-w-[420px]';
  }
  return config.width === 'wide' ? 'w-full max-w-lg' : 'w-full max-w-md';
}

interface BrandBlockProps {
  config: ShellConfig;
  isStack: boolean;
}

function BrandBlock({ config, isStack }: BrandBlockProps) {
  if (isStack) {
    return (
      <div className="flex flex-col items-center gap-2 mb-5">
        <img src={odysseusIcon} alt="Odysseus" className="w-20 h-20 object-contain" />
        {config.showBranding === true && (
          <OdysseusLogo
            className="h-8 w-auto text-[rgb(var(--auth-text-dim))] drop-shadow-icon-bloom"
            aria-label="Odysseus"
          />
        )}
        {config.brandTagline && (
          <span className="auth-tagline phosphor-text">{config.brandTagline}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 mb-6">
      {config.showBranding === true && (
        <OdysseusLogo
          className="h-9 w-auto text-[rgb(var(--auth-text))] drop-shadow-icon-bloom"
          aria-label="Odysseus"
        />
      )}
      {config.brandGreeting && (
        <span className="text-sm text-[rgb(var(--auth-text-dim))] phosphor-text">
          {config.brandGreeting}
        </span>
      )}
    </div>
  );
}
