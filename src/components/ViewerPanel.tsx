import type { CultivarResult } from "../types";
import { formatBytes, formatNumber } from "../utils";
import { ModelCanvas } from "./ModelCanvas";
import type { ViewEntry } from "./viewEntries";
import { getViewTitle, getViewUrl } from "./viewEntries";

interface ViewerPanelProps {
  entry: ViewEntry | null;
  selectedCultivar: CultivarResult | null;
}

function balanceLabel(delta: number, ratio: number): string {
  return `${formatNumber(delta)} (v/t ${ratio.toFixed(2)})`;
}

export function ViewerPanel({ entry, selectedCultivar }: ViewerPanelProps) {
  if (!entry) {
    return (
      <div className="viewer-panel empty">
        <p>왼쪽 목록에서 모델을 선택하세요.</p>
      </div>
    );
  }

  const url = getViewUrl(entry);
  const title = getViewTitle(entry);

  if (entry.kind === "original") {
    const { stats } = entry.original;
    return (
      <div className="viewer-panel">
        <div className="viewer-canvas-wrap">
          <ModelCanvas url={url} />
        </div>
        <div className="viewer-details">
          <h3>{title} <span className="viewer-tag original">원본</span></h3>
          <p className="viewer-desc">모든 품종 비교의 기준점</p>
          <div className="stats-grid viewer-stats">
            <div><span>Vertices</span><strong>{formatNumber(stats.vertices)}</strong></div>
            <div><span>Triangles</span><strong>{formatNumber(stats.triangles)}</strong></div>
            <div><span>|v−t|</span><strong>{formatNumber(stats.vertexTriangleDelta)}</strong></div>
            <div><span>File size</span><strong>{formatBytes(stats.fileSizeBytes)}</strong></div>
          </div>
        </div>
      </div>
    );
  }

  const c = entry.cultivar;
  const { stats } = c;

  return (
    <div className="viewer-panel">
      <div className="viewer-canvas-wrap">
        <ModelCanvas url={url} />
      </div>
      <div className="viewer-details">
        <h3>
          {title}
          <span className="viewer-tag">{c.presetGroupLabel}</span>
        </h3>
        <p className="viewer-desc">{c.description}</p>

        <div className="viewer-meta-row">
          <span className="tag tag-source">입력: {c.sourceModel}</span>
        </div>

        <div className="params-command">{c.paramsCommand}</div>
        <div className="params">{c.paramsLabel}</div>

        {c.uvWarning && <div className="uv-warning">{c.uvWarning}</div>}

        <div className="stats-grid viewer-stats">
          <div><span>Vertices</span><strong>{formatNumber(stats.vertices)}</strong></div>
          <div><span>Triangles</span><strong>{formatNumber(stats.triangles)}</strong></div>
          <div>
            <span>|v−t|</span>
            <strong className={stats.vertexTriangleDelta <= 20 ? "balance-good" : stats.vertexTriangleDelta <= 50 ? "balance-ok" : "balance-poor"}>
              {balanceLabel(stats.vertexTriangleDelta, stats.vertexTriangleRatio)}
            </strong>
          </div>
          <div><span>File size</span><strong>{formatBytes(stats.fileSizeBytes)}</strong></div>
          <div><span>Reduction</span><strong className="reduction-value">{c.reductionPercent}%</strong></div>
          <div><span>Materials</span><strong>{formatNumber(stats.materials)}</strong></div>
        </div>

        {selectedCultivar?.id === c.id && (
          <p className="viewer-selected-note">Re-cultivate / Download 대상으로 선택됨</p>
        )}
      </div>
    </div>
  );
}
