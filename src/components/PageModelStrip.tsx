import type { ViewEntry } from "./viewEntries";
import { formatNumber } from "../utils";

interface PageModelStripProps {
  pageEntries: ViewEntry[];
  pageStart: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PageModelStrip({
  pageEntries,
  pageStart,
  selectedId,
  onSelect,
}: PageModelStripProps) {
  return (
    <div className="page-model-strip" role="listbox" aria-label="현재 페이지 품종">
      <p className="page-strip-hint">
        3D 뷰에서 모델 클릭 또는 아래 칩으로 선택 · 왼쪽→오른쪽 · 위→아래 = 최적화 순
      </p>
      <div className="page-chip-row">
        {pageEntries.map((entry, index) => {
          const rank = pageStart + index + 1;
          const isOriginal = entry.kind === "original";
          const stats =
            entry.kind === "original"
              ? entry.original.stats
              : entry.cultivar.stats;
          const label =
            entry.kind === "cultivar" ? entry.cultivar.name : "원본";
          const extra =
            entry.kind === "cultivar"
              ? `${entry.cultivar.reductionPercent}%`
              : "ref";

          return (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={entry.id === selectedId}
              className={`page-chip ${entry.id === selectedId ? "active" : ""} ${isOriginal ? "original" : ""}`}
              onClick={() => onSelect(entry.id)}
            >
              <span className="page-chip-rank">#{rank}</span>
              <span className="page-chip-tris">
                {formatNumber(stats.triangles)} tris
              </span>
              <span className="page-chip-label" title={label}>
                {label}
              </span>
              <span className="page-chip-extra">{extra}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
