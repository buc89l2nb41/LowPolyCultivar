import type { SpriteEntryResult, SpriteVerdict } from "../types";

/** 4각도 스프라이트 MAE (0–1). 배치·UI 공통 */
export const SPRITE_THRESHOLDS = {
  similar: 0.028,
  caution: 0.055,
} as const;

const RELATIVE_WORST_RATIO = 0.2;
const RELATIVE_MIN_SCORE = 0.02;

export function getAbsoluteSpriteVerdict(maxDiff: number): SpriteVerdict {
  if (maxDiff < SPRITE_THRESHOLDS.similar) return "similar";
  if (maxDiff < SPRITE_THRESHOLDS.caution) return "caution";
  return "different";
}

export function getSpriteVerdict(
  entry: Pick<SpriteEntryResult, "meanDiff" | "maxDiff">,
  batch?: readonly SpriteEntryResult[],
): SpriteVerdict {
  const absolute = getAbsoluteSpriteVerdict(entry.maxDiff);

  if (!batch || batch.length < 4) {
    return absolute;
  }

  const sortedByWorst = [...batch].sort(
    (left, right) => right.maxDiff - left.maxDiff,
  );
  const worstCutoff = Math.max(
    1,
    Math.ceil(batch.length * RELATIVE_WORST_RATIO),
  );
  const relativeThreshold =
    sortedByWorst[worstCutoff - 1]?.maxDiff ?? Infinity;

  if (entry.maxDiff >= relativeThreshold && entry.maxDiff >= RELATIVE_MIN_SCORE) {
    return "different";
  }

  if (
    absolute === "different" &&
    entry.meanDiff < SPRITE_THRESHOLDS.caution
  ) {
    return "caution";
  }

  return absolute;
}

/** 배치 자동 선별: 유사 + 주의 (maxDiff < caution) */
export function isAutoSelectVerdict(verdict: SpriteVerdict): boolean {
  return verdict === "similar" || verdict === "caution";
}

export function formatSpriteScore(score: number): string {
  return score.toFixed(3);
}

export function getSpriteVerdictLabel(verdict: SpriteVerdict): string {
  switch (verdict) {
    case "similar":
      return "유사";
    case "caution":
      return "주의";
    case "different":
      return "차이 큼";
  }
}

export function indexSpriteResults(
  entries: SpriteEntryResult[],
): Map<string, SpriteEntryResult> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

export function sortSpriteEntries(
  entries: readonly SpriteEntryResult[],
): SpriteEntryResult[] {
  return [...entries].sort((left, right) => {
    if (left.maxDiff !== right.maxDiff) {
      return left.maxDiff - right.maxDiff;
    }
    if (left.meanDiff !== right.meanDiff) {
      return left.meanDiff - right.meanDiff;
    }
    return left.rank - right.rank;
  });
}

export function getBatchRank(
  entry: SpriteEntryResult,
  batch: readonly SpriteEntryResult[],
): number {
  const sorted = sortSpriteEntries(batch);
  return sorted.findIndex((item) => item.id === entry.id) + 1;
}
