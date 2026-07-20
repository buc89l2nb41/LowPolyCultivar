import type { CultivarResult } from "./types.js";
import type { SpriteEntryResult } from "./spriteCompare.js";

/** 4각도 스프라이트 MAE (0–1). UI 캡처와 동일 파이프라인 */
export const SPRITE_THRESHOLDS = {
  similar: 0.028,
  caution: 0.055,
} as const;

export type SpriteVerdict = "similar" | "caution" | "different";

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
  const worstCutoff = Math.max(1, Math.ceil(batch.length * 0.2));
  const relativeThreshold =
    sortedByWorst[worstCutoff - 1]?.maxDiff ?? Infinity;

  if (entry.maxDiff >= relativeThreshold && entry.maxDiff >= 0.02) {
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

/** 유사·주의 판정 cultivar 중 트라이앵글 최소. 없으면 null */
export function selectSimilarLowestTriangles(
  cultivars: CultivarResult[],
  spriteEntries: SpriteEntryResult[],
): { cultivar: CultivarResult; sprite: SpriteEntryResult } | null {
  const spriteById = new Map(spriteEntries.map((entry) => [entry.id, entry]));
  const candidates = cultivars
    .map((cultivar) => ({
      cultivar,
      sprite: spriteById.get(cultivar.id),
    }))
    .filter(
      (
        item,
      ): item is {
        cultivar: CultivarResult;
        sprite: SpriteEntryResult;
      } =>
        item.sprite != null &&
        isAutoSelectVerdict(getSpriteVerdict(item.sprite, spriteEntries)),
    )
    .sort((left, right) => {
      if (left.cultivar.stats.triangles !== right.cultivar.stats.triangles) {
        return left.cultivar.stats.triangles - right.cultivar.stats.triangles;
      }
      if (left.sprite.maxDiff !== right.sprite.maxDiff) {
        return left.sprite.maxDiff - right.sprite.maxDiff;
      }
      return left.sprite.meanDiff - right.sprite.meanDiff;
    });

  return candidates[0] ?? null;
}
