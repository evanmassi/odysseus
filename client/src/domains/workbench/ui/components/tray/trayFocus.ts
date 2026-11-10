export const INSERT_TRAY_ATTRIBUTE = 'data-insert-tray';

export const isInInsertTray = (node: EventTarget | null): boolean =>
  node instanceof Element && !!node.closest(`[${INSERT_TRAY_ATTRIBUTE}]`);
