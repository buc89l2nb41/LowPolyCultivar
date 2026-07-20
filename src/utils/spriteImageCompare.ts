import {
  CAPTURE_BACKGROUND,
  drawCroppedRegion,
  findForegroundCrop,
} from "./imageForeground";

const BG_TOLERANCE = 14;

function isBackgroundPixel(r: number, g: number, b: number): boolean {
  return (
    Math.abs(r - CAPTURE_BACKGROUND.r) <= BG_TOLERANCE &&
    Math.abs(g - CAPTURE_BACKGROUND.g) <= BG_TOLERANCE &&
    Math.abs(b - CAPTURE_BACKGROUND.b) <= BG_TOLERANCE
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load capture image"));
    img.src = src;
  });
}

/** 원본 프레임 기준 전경 크롭 후 픽셀 MAE (0–1) */
export async function meanAbsDiffSprites(
  refDataUrl: string,
  cmpDataUrl: string,
  size: number,
): Promise<number> {
  const refImage = await loadImage(refDataUrl);
  const cmpImage = await loadImage(cmpDataUrl);

  const probe = document.createElement("canvas");
  probe.width = size;
  probe.height = size;
  const probeCtx = probe.getContext("2d");
  if (!probeCtx) throw new Error("Canvas 2d unavailable");
  probeCtx.drawImage(refImage, 0, 0, size, size);
  const refFull = probeCtx.getImageData(0, 0, size, size);
  const crop = findForegroundCrop(refFull.data, size, size);

  const compare = document.createElement("canvas");
  compare.width = size;
  compare.height = size;
  const compareCtx = compare.getContext("2d");
  if (!compareCtx) throw new Error("Canvas 2d unavailable");

  drawCroppedRegion(compareCtx, refImage, size, size, crop, size);
  const refCropped = compareCtx.getImageData(0, 0, size, size);
  drawCroppedRegion(compareCtx, cmpImage, size, size, crop, size);
  const cmpCropped = compareCtx.getImageData(0, 0, size, size);

  let sum = 0;
  let count = 0;
  for (let i = 0; i < refCropped.data.length; i += 4) {
    if (
      isBackgroundPixel(
        refCropped.data[i],
        refCropped.data[i + 1],
        refCropped.data[i + 2],
      )
    ) {
      continue;
    }
    sum +=
      (Math.abs(refCropped.data[i] - cmpCropped.data[i]) +
        Math.abs(refCropped.data[i + 1] - cmpCropped.data[i + 1]) +
        Math.abs(refCropped.data[i + 2] - cmpCropped.data[i + 2])) /
      3;
    count += 1;
  }

  if (count === 0) return 1;
  return sum / count / 255;
}
