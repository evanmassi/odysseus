export const BOARD_COLUMNS = 12;
export const BOARD_ROW_HEIGHT = 44;
export const BOARD_MARGIN = 10;

export const rowsForHeight = (pixels: number): number =>
  Math.ceil((pixels + BOARD_MARGIN) / (BOARD_ROW_HEIGHT + BOARD_MARGIN));
