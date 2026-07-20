/** Capture background (#1a2230) — 스프라이트 비교 시 배경 제외용 */
export const CAPTURE_BACKGROUND = { r: 26, g: 34, b: 48 } as const;
const BG_TOLERANCE = 14;

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function isBackgroundPixel(r: number, g: number, b: number): boolean {
  return (
    Math.abs(r - CAPTURE_BACKGROUND.r) <= BG_TOLERANCE &&
    Math.abs(g - CAPTURE_BACKGROUND.g) <= BG_TOLERANCE &&
    Math.abs(b - CAPTURE_BACKGROUND.b) <= BG_TOLERANCE
  );
}

/** 원본 이미지에서 전경(모델) 영역만 정사각형으로 잘라 스프라이트 정렬에 사용 */
export function findForegroundCrop(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  marginRatio = 0.06,
): CropRect {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (isBackgroundPixel(data[index], data[index + 1], data[index + 2])) {
        continue;
      }
      found = true;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!found) {
    return { x: 0, y: 0, width, height };
  }

  const fgW = maxX - minX + 1;
  const fgH = maxY - minY + 1;
  const side = Math.max(fgW, fgH);
  const margin = Math.round(side * marginRatio);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  let x = Math.round(cx - side / 2) - margin;
  let y = Math.round(cy - side / 2) - margin;
  let cropSide = side + margin * 2;

  x = Math.max(0, x);
  y = Math.max(0, y);
  if (x + cropSide > width) cropSide = width - x;
  if (y + cropSide > height) cropSide = height - y;

  return { x, y, width: cropSide, height: cropSide };
}

export function drawCroppedRegion(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  crop: CropRect,
  outputSize: number,
): void {
  context.clearRect(0, 0, outputSize, outputSize);
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize,
  );
}
