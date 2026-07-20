import type { SpriteCompareResponse, SpriteEntryResult } from "../types";
import {
  captureAlignedViews,
  captureReferenceViews,
} from "./modelCapture";
import { meanAbsDiffSprites } from "./spriteImageCompare";

const CELL_SIZE = 256;

export async function runSpriteCompareClient(
  rootUrl: string,
  entries: Array<{ id: string; rank: number; url: string }>,
  onProgress?: (current: number, total: number) => void,
): Promise<SpriteCompareResponse> {
  const reference = await captureReferenceViews(rootUrl, CELL_SIZE);
  const results: SpriteEntryResult[] = [];

  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const candidate = await captureAlignedViews(
      entry.url,
      CELL_SIZE,
      reference.frames,
    );
    const perAngle = await Promise.all(
      reference.images.map((refImage, angleIndex) =>
        meanAbsDiffSprites(refImage, candidate.images[angleIndex], CELL_SIZE),
      ),
    );
    const maxDiff = Math.max(...perAngle);
    const meanDiff =
      perAngle.reduce((sum, value) => sum + value, 0) / perAngle.length;
    results.push({
      id: entry.id,
      rank: entry.rank,
      perAngle,
      maxDiff,
      meanDiff,
    });
    onProgress?.(index + 1, entries.length);
  }

  results.sort((left, right) => left.maxDiff - right.maxDiff || left.meanDiff - right.meanDiff);

  return {
    cellSize: CELL_SIZE,
    angleCount: reference.images.length,
    entries: results,
  };
}
