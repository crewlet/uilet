import './CanvasBoard.css';

export {
  BOARD_TITLE_MIN_WIDTH,
  CanvasBoard,
  CANVAS_BOARD_MIN_ZOOM,
  CANVAS_NOTE_COLORS,
  TITLE_GLYPH_EM,
  boardRoom,
  titleSize,
} from './CanvasBoard.js';
export type {
  CanvasBoardItem,
  CanvasBoardLabels,
  CanvasBoardNote,
  CanvasBoardProps,
  CanvasBoardRect,
  CanvasBoardSelection,
  CanvasBoardTool,
  CanvasNoteColor,
} from './CanvasBoard.js';
export { CANVAS_BOARD_MAX_LIVE, CANVAS_BOARD_MIN_LIVE_WIDTH, liveBoards } from './budget.js';
export type { BoardFrame } from './budget.js';
