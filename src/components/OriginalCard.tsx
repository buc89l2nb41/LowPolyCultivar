import type { RootOriginal } from "../types";
import { formatBytes, formatNumber } from "../utils";
import { ModelCanvas } from "./ModelCanvas";

interface OriginalCardProps {
  original: RootOriginal;
}

export function OriginalCard({ original }: OriginalCardProps) {
  const { stats } = original;

  return (
    <article className="cultivar-card original-card">
      <div className="cultivar-viewport">
        <ModelCanvas url={original.previewUrl} />
      </div>

      <div className="cultivar-stats">
        <div className="params original-tag">원본 (Original)</div>
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
            <span>|v−t|</span>
            <strong>{formatNumber(stats.vertexTriangleDelta)}</strong>
          </div>
          <div>
            <span>File size</span>
            <strong>{formatBytes(stats.fileSizeBytes)}</strong>
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
        </div>
      </div>

      <div className="cultivar-footer">
        <div className="meta">
          <h3>{original.name}</h3>
          <p>모든 품종 비교의 기준점</p>
        </div>
        <span className="original-badge">Reference</span>
      </div>
    </article>
  );
}
