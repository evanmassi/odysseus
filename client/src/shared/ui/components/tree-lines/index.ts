/**
 * Tree Lines
 *
 * Shared SVG tree-line overlay: calculation, render, and the observer hook that
 * keeps lines in sync with layout and expand/collapse.
 */

export { calculateTreeLines, type TreeLineCalcConfig } from './calculateTreeLines';
export { TreeLinesDisplay } from './TreeLinesDisplay';
export { useTreeLines, type TreeLine } from './useTreeLines';
