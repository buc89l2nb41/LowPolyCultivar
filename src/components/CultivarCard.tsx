import type { CultivarResult } from "../types";
import { formatBytes, formatNumber } from "../utils";
import { ModelCanvas } from "./ModelCanvas";

interface CultivarCardProps {
  cultivar: CultivarResult;
  selected: boolean;
  onSelect: () => void;
}

function balanceLabel(delta: number, ratio: number): string {
  const quality = delta <= 20 ? "good" : delta <= 50 ? "ok" : "poor";
  return `${formatNumber(delta)} (v/t ${ratio.toFixed(2)}) · ${quality}`;
}

export function CultivarCard({ cultivar, selected, onSelect }: CultivarCardProps) {
  const { stats } = cultivar;

  return (
    <article className={`cultivar-card ${selected ? "selected" : ""}`}>
      <div className="cultivar-viewport">
        <ModelCanvas url={cultivar.outputUrl} />
      </div>

      <div className="cultivar-stats">
        <div className="cultivar-tags">
          <span className="tag tag-group">{cultivar.presetGroupLabel}</span>
          <span className="tag tag-source">입력: {cultivar.sourceModel}</span>
        </div>

        <div className="params-command">{cultivar.paramsCommand}</div>
        <div className="params">{cultivar.paramsLabel}</div>

        {cultivar.uvWarning && (
          <div className="uv-warning">{cultivar.uvWarning}</div>
        )}
        <div className="stats-grid">
          <div>
            <span>Vertices</span>
            <strong>{formatNumber(stats.vertices)}</strong>
          </div>
          <div>
            <span>Triangles</span>
            <strong>{formatNumber(stats.triangles)}</strong>
          </div>
          <div>
            <span>|v−t| balance</span>
            <strong
              className={
                stats.vertexTriangleDelta <= 20
                  ? "balance-good"
                  : stats.vertexTriangleDelta <= 50
                    ? "balance-ok"
                    : "balance-poor"
              }
            >
              {balanceLabel(stats.vertexTriangleDelta, stats.vertexTriangleRatio)}
            </strong>
          </div>
          <div>
            <span>File size</span>
            <strong>{formatBytes(stats.fileSizeBytes)}</strong>
          </div>
          <div>
            <span>Meshes</span>
            <strong>{formatNumber(stats.meshes)}</strong>
          </div>
          <div>
            <span>Materials</span>
            <strong>{formatNumber(stats.materials)}</strong>
          </div>
          <div>
            <span>Textures</span>
            <strong>
              {formatNumber(stats.textures)}
              {stats.textureBytes > 0 && (
                <> ({formatBytes(stats.textureBytes)})</>
              )}
            </strong>
          </div>
          <div>
            <span>Draw calls</span>
            <strong>{formatNumber(stats.drawCallsEstimate)}</strong>
          </div>
          <div>
            <span>Reduction</span>
            <strong className="reduction-value">{cultivar.reductionPercent}%</strong>
          </div>
        </div>
      </div>

      <div className="cultivar-footer">
        <div className="meta">
          <h3>{cultivar.name}</h3>
          <p>{cultivar.description}</p>
        </div>
        <button
          type="button"
          className={`btn ${selected ? "btn-primary" : "btn-secondary"}`}
          onClick={onSelect}
        >
          {selected ? "Selected" : "Select"}
        </button>
      </div>
    </article>
  );
}
