/**
 * Vite Ambient Type Declarations
 *
 * SVG module augmentation and environment variable types for the Vite build.
 */

/// <reference types="vite/client" />

/** Usage: `import Logo from './logo.svg?react'` */
declare module '*.svg?react' {
  import type { FC, SVGProps } from 'react';
  const content: FC<SVGProps<SVGSVGElement>>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
