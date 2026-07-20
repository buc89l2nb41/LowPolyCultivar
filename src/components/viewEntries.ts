import type { CultivarResult, RootOriginal } from "../types";
import { formatBytes, formatNumber } from "../utils";

export type ViewEntry =
  | { id: "original"; kind: "original"; original: RootOriginal }
  | { id: string; kind: "cultivar"; cultivar: CultivarResult };

export function buildViewEntries(
  rootOriginal: RootOriginal | null,
  batches: { cultivars: CultivarResult[] }[],
): ViewEntry[] {
  const entries: ViewEntry[] = [];
  if (rootOriginal) {
    entries.push({ id: "original", kind: "original", original: rootOriginal });
  }
  for (const batch of batches) {
    for (const cultivar of batch.cultivars) {
      entries.push({ id: cultivar.id, kind: "cultivar", cultivar });
    }
  }
  return entries;
}

/** 그리드 페이지용 — 원본은 좌상단 고정 패널로 표시 */
export function buildGridEntries(
  batches: { cultivars: CultivarResult[] }[],
): ViewEntry[] {
  const entries: ViewEntry[] = [];
  for (const batch of batches) {
    for (const cultivar of batch.cultivars) {
      entries.push({ id: cultivar.id, kind: "cultivar", cultivar });
    }
  }
  return entries;
}

function entryStats(entry: ViewEntry) {
  return entry.kind === "original" ? entry.original.stats : entry.cultivar.stats;
}

export type SortMode =
  | "triangles-asc"
  | "triangles-desc"
  | "fileSize-asc"
  | "fileSize-desc"
  | "reduction-desc"
  | "name-asc"
  | "preset-group";

export type LayoutMode = "row" | "grid-2" | "grid-3" | "grid-4";

export interface ViewSettings {
  sortMode: SortMode;
  perPage: 4 | 6 | 8 | 9;
  layout: LayoutMode;
}

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  sortMode: "triangles-asc",
  perPage: 6,
  layout: "grid-3",
};

export function layoutCols(settings: ViewSettings): number {
  if (settings.layout === "row") return settings.perPage;
  if (settings.layout === "grid-2") return 2;
  if (settings.layout === "grid-3") return 3;
  return 4;
}

export function colsForLayout(layout: LayoutMode, perPage: number): number {
  return layoutCols({ sortMode: "triangles-asc", perPage: perPage as ViewSettings["perPage"], layout });
}

export function sortEntries(entries: ViewEntry[], mode: SortMode): ViewEntry[] {
  const list = [...entries];
  list.sort((a, b) => {
    const sa = entryStats(a);
    const sb = entryStats(b);
    switch (mode) {
      case "triangles-asc":
        if (sa.triangles !== sb.triangles) return sa.triangles - sb.triangles;
        return sa.fileSizeBytes - sb.fileSizeBytes;
      case "triangles-desc":
        if (sa.triangles !== sb.triangles) return sb.triangles - sa.triangles;
        return sb.fileSizeBytes - sa.fileSizeBytes;
      case "fileSize-asc":
        return sa.fileSizeBytes - sb.fileSizeBytes;
      case "fileSize-desc":
        return sb.fileSizeBytes - sa.fileSizeBytes;
      case "reduction-desc": {
        const ra = a.kind === "cultivar" ? a.cultivar.reductionPercent : -1;
        const rb = b.kind === "cultivar" ? b.cultivar.reductionPercent : -1;
        return rb - ra;
      }
      case "name-asc": {
        const na = getViewTitle(a).toLowerCase();
        const nb = getViewTitle(b).toLowerCase();
        return na.localeCompare(nb);
      }
      case "preset-group": {
        const ga =
          a.kind === "cultivar" ? a.cultivar.presetGroupLabel : "원본";
        const gb =
          b.kind === "cultivar" ? b.cultivar.presetGroupLabel : "원본";
        const g = ga.localeCompare(gb);
        if (g !== 0) return g;
        return sa.triangles - sb.triangles;
      }
      default:
        return 0;
    }
  });
  return list;
}

/** @deprecated sortEntries(sortMode) 사용 */
export function sortEntriesByPerformance(entries: ViewEntry[]): ViewEntry[] {
  return sortEntries(entries, "triangles-asc");
}

/** 스프라이트 비교용 — 원본 항상 1행, 품종은 정렬 순 */
export function buildComparisonEntries(
  rootOriginal: RootOriginal | null,
  batches: { cultivars: CultivarResult[] }[],
  sortMode: SortMode,
): ViewEntry[] {
  const cultivars = sortEntries(buildGridEntries(batches), sortMode);
  if (!rootOriginal) {
    return cultivars;
  }
  return [
    { id: "original", kind: "original", original: rootOriginal },
    ...cultivars,
  ];
}

export function getViewUrl(entry: ViewEntry): string {
  return entry.kind === "original"
    ? entry.original.previewUrl
    : entry.cultivar.outputUrl;
}

export function getViewTitle(entry: ViewEntry): string {
  return entry.kind === "original"
    ? entry.original.name
    : entry.cultivar.name;
}

export function formatEntrySubtitle(entry: ViewEntry): string {
  if (entry.kind === "original") {
    const s = entry.original.stats;
    return `${formatNumber(s.triangles)} tris · ${formatBytes(s.fileSizeBytes)}`;
  }
  const c = entry.cultivar;
  return `${formatNumber(c.stats.triangles)} tris · ${c.reductionPercent}% · ${c.presetGroupLabel}`;
}
