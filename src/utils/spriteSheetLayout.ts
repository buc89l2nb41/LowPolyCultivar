import { CAPTURE_ANGLES } from "./modelCapture";

/**
 * Vision API 비교용 스프라이트 레이아웃.
 *
 * 기준:
 * - 셀 256px: 실루엣·텍스처 디테일을 vision 모델이 읽기 충분한 크기
 * - 16px 거터: 인접 모델이 한 덩어리로 인식되지 않도록 분리
 * - 2px 테두리: 행/열 경계를 모델이 명확히 구분
 * - 시트 최대 3072px: 주요 vision API 해상도 한도 내 (자동 분할)
 */
export const AI_SPRITE_LAYOUT = {
  cellSize: 256,
  gutter: 16,
  cellBorder: 2,
  outerPadding: 20,
  labelWidth: 200,
  labelGutter: 16,
  headerHeight: 44,
  headerGutter: 12,
  maxSheetWidth: 3072,
  maxSheetHeight: 3072,
  colors: {
    background: "#0b0f14",
    gutter: "#1a2430",
    cellBg: "#0f1520",
    cellBorder: "#3d4f66",
    headerBg: "#1a2430",
    labelBg: "#121820",
    labelOriginalBg: "#14532d",
    labelText: "#cbd5e1",
    labelOriginalText: "#86efac",
    mutedText: "#64748b",
  },
} as const;

export type AiSpriteLayout = typeof AI_SPRITE_LAYOUT & {
  angleCount: number;
  maxRowsPerSheet: number;
  sheetWidth: number;
  rowStride: number;
};

function rowBlockHeight(rowCount: number, layout = AI_SPRITE_LAYOUT): number {
  if (rowCount <= 0) return 0;
  return (
    rowCount * layout.cellSize + (rowCount - 1) * layout.gutter
  );
}

export function computeSheetHeight(
  rowCount: number,
  layout = AI_SPRITE_LAYOUT,
): number {
  return (
    layout.outerPadding * 2 +
    layout.headerHeight +
    layout.headerGutter +
    rowBlockHeight(rowCount, layout)
  );
}

export function computeSheetWidth(layout = AI_SPRITE_LAYOUT): number {
  const angleCount = CAPTURE_ANGLES.length;
  const gridWidth =
    angleCount * layout.cellSize + (angleCount - 1) * layout.gutter;
  return (
    layout.outerPadding * 2 +
    layout.labelWidth +
    layout.labelGutter +
    gridWidth
  );
}

/** 시트 해상도 한도 안에서 들어갈 수 있는 최대 행 수 */
export function computeMaxRowsPerSheet(layout = AI_SPRITE_LAYOUT): number {
  const fixed =
    layout.outerPadding * 2 +
    layout.headerHeight +
    layout.headerGutter;
  const available = layout.maxSheetHeight - fixed;
  const stride = layout.cellSize + layout.gutter;
  return Math.max(1, Math.floor((available + layout.gutter) / stride));
}

export function getAiSpriteLayout(): AiSpriteLayout {
  const maxRowsPerSheet = computeMaxRowsPerSheet();
  return {
    ...AI_SPRITE_LAYOUT,
    angleCount: CAPTURE_ANGLES.length,
    maxRowsPerSheet,
    sheetWidth: computeSheetWidth(),
    rowStride: AI_SPRITE_LAYOUT.cellSize + AI_SPRITE_LAYOUT.gutter,
  };
}

export function estimateSheetCount(
  totalRows: number,
  layout = getAiSpriteLayout(),
): number {
  return Math.max(1, Math.ceil(totalRows / layout.maxRowsPerSheet));
}

export function describeAiSpriteLayout(totalRows: number): string {
  const layout = getAiSpriteLayout();
  const sheets = estimateSheetCount(totalRows, layout);
  const h = computeSheetHeight(
    Math.min(totalRows, layout.maxRowsPerSheet),
    layout,
  );
  return [
    `셀 ${layout.cellSize}px`,
    `간격 ${layout.gutter}px`,
    `테두리 ${layout.cellBorder}px`,
    `장당 최대 ${layout.maxRowsPerSheet}행`,
    `시트 ${sheets}장`,
    `약 ${layout.sheetWidth}×${h}px/장`,
  ].join(" · ");
}
