import { CAPTURE_ANGLES } from "./modelCapture";
import {
  computeMaxRowsPerSheet,
  computeSheetHeight,
  computeSheetWidth,
  getAiSpriteLayout,
  type AiSpriteLayout,
} from "./spriteSheetLayout";

export interface SpriteRow {
  id: string;
  label: string;
  rank: number;
  images: string[];
}

export interface SpriteSheetResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  rowStart: number;
  rowEnd: number;
  rowIds: string[];
  layout: AiSpriteLayout;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load capture image"));
    img.src = src;
  });
}

function chunkRows<T>(rows: T[], maxRows: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += maxRows) {
    chunks.push(rows.slice(i, i + maxRows));
  }
  return chunks;
}

function cellOrigin(
  layout: AiSpriteLayout,
  row: number,
  col: number,
): { x: number; y: number } {
  const x =
    layout.outerPadding +
    layout.labelWidth +
    layout.labelGutter +
    col * (layout.cellSize + layout.gutter);
  const y =
    layout.outerPadding +
    layout.headerHeight +
    layout.headerGutter +
    row * (layout.cellSize + layout.gutter);
  return { x, y };
}

function drawCellFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  layout: AiSpriteLayout,
): void {
  const { colors, cellBorder } = layout;
  ctx.fillStyle = colors.cellBg;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = colors.cellBorder;
  ctx.lineWidth = cellBorder;
  ctx.strokeRect(
    x + cellBorder / 2,
    y + cellBorder / 2,
    size - cellBorder,
    size - cellBorder,
  );
}

function wrapLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  let cy = y;

  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = words[i];
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

async function renderSheet(
  rows: SpriteRow[],
  layout: AiSpriteLayout,
  rowOffset: number,
): Promise<SpriteSheetResult> {
  const width = computeSheetWidth(layout);
  const height = computeSheetHeight(rows.length, layout);
  const { colors } = layout;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  const headerY = layout.outerPadding;
  ctx.fillStyle = colors.headerBg;
  ctx.fillRect(
    layout.outerPadding,
    headerY,
    width - layout.outerPadding * 2,
    layout.headerHeight,
  );

  ctx.fillStyle = colors.mutedText;
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(
    "품종 (1행=원본)",
    layout.outerPadding + 12,
    headerY + layout.headerHeight / 2,
  );

  for (let col = 0; col < layout.angleCount; col++) {
    const { x } = cellOrigin(layout, 0, col);
    ctx.textAlign = "center";
    ctx.fillText(
      `${CAPTURE_ANGLES[col]}°`,
      x + layout.cellSize / 2,
      headerY + layout.headerHeight / 2,
    );
  }
  ctx.textAlign = "left";

  for (let row = 0; row < rows.length; row++) {
    const entry = rows[row];
    const { y: rowY } = cellOrigin(layout, row, 0);
    const labelX = layout.outerPadding;
    const isOriginal = entry.id === "original";

    ctx.fillStyle = isOriginal ? colors.labelOriginalBg : colors.labelBg;
    ctx.fillRect(labelX, rowY, layout.labelWidth, layout.cellSize);
    ctx.strokeStyle = colors.cellBorder;
    ctx.lineWidth = layout.cellBorder;
    ctx.strokeRect(
      labelX + layout.cellBorder / 2,
      rowY + layout.cellBorder / 2,
      layout.labelWidth - layout.cellBorder,
      layout.cellSize - layout.cellBorder,
    );

    ctx.fillStyle = isOriginal ? colors.labelOriginalText : colors.labelText;
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(
      isOriginal ? "원본 REF" : `#${entry.rank}`,
      labelX + 12,
      rowY + 12,
    );

    ctx.font = "600 11px system-ui, sans-serif";
    wrapLabel(
      ctx,
      isOriginal ? entry.label : entry.label,
      labelX + 12,
      rowY + 32,
      layout.labelWidth - 24,
      14,
    );

    const inset = layout.cellBorder + 2;
    const drawSize = layout.cellSize - inset * 2;

    for (let col = 0; col < entry.images.length; col++) {
      const { x, y } = cellOrigin(layout, row, col);
      drawCellFrame(ctx, x, y, layout.cellSize, layout);

      const img = await loadImage(entry.images[col]);
      ctx.drawImage(img, x + inset, y + inset, drawSize, drawSize);
    }
  }

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Failed to encode sprite PNG"));
    }, "image/png");
  });

  return {
    blob,
    dataUrl,
    width,
    height,
    rowStart: rowOffset,
    rowEnd: rowOffset + rows.length - 1,
    rowIds: rows.map((r) => r.id),
    layout,
  };
}

/** AI vision 비교에 맞춘 고정 레이아웃으로 스프라이트 생성 */
export async function buildComparisonSpriteSheets(
  rows: SpriteRow[],
): Promise<SpriteSheetResult[]> {
  const layout = getAiSpriteLayout();
  const maxRows = computeMaxRowsPerSheet(layout);
  const chunks = chunkRows(rows, maxRows);
  const results: SpriteSheetResult[] = [];
  let offset = 0;

  for (const chunk of chunks) {
    results.push(await renderSheet(chunk, layout, offset));
    offset += chunk.length;
  }

  return results;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export {
  describeAiSpriteLayout,
  estimateSheetCount,
  getAiSpriteLayout,
} from "./spriteSheetLayout";
